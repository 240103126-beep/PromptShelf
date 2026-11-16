from functools import partial
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from time import monotonic, sleep

from fastapi import FastAPI
from fastapi.testclient import TestClient
from opentelemetry.proto.collector.logs.v1.logs_service_pb2 import ExportLogsServiceRequest
from opentelemetry.proto.collector.metrics.v1.metrics_service_pb2 import ExportMetricsServiceRequest
from opentelemetry.proto.collector.trace.v1.trace_service_pb2 import ExportTraceServiceRequest

from app import oncall, telemetry


class Collector(BaseHTTPRequestHandler):
    def __init__(self, *args, received, **kwargs):
        self.received = received
        super().__init__(*args, **kwargs)

    def do_POST(self):
        body = self.rfile.read(int(self.headers['Content-Length']))
        self.received[self.path] = body
        self.send_response(200)
        self.end_headers()

    def log_message(self, *args):
        pass


def test_exports_correlated_signals_without_user_input(monkeypatch):
    received = {}
    collector = ThreadingHTTPServer(('127.0.0.1', 0), partial(Collector, received=received))
    runner = Thread(target=collector.serve_forever, daemon=True)
    runner.start()
    monkeypatch.setenv('OTEL_EXPORTER_OTLP_ENDPOINT', f'http://127.0.0.1:{collector.server_port}')
    monkeypatch.setenv('APP_ENVIRONMENT', 'dev')
    monkeypatch.setenv('APP_VERSION', 'a' * 40)
    app = FastAPI()

    @app.post('/api/items', status_code=201)
    def save_item(body: dict):
        return body

    telemetry.configure_telemetry(app)
    try:
        with TestClient(app) as client:
            assert client.post('/api/items', json={'prompt': 'private prompt text'}).status_code == 201
        deadline = monotonic() + 12
        while len(received) < 3 and monotonic() < deadline:
            sleep(0.1)
        assert set(received) == {'/v1/logs', '/v1/metrics', '/v1/traces'}
        traces = ExportTraceServiceRequest.FromString(received['/v1/traces']).resource_spans[0]
        logs = ExportLogsServiceRequest.FromString(received['/v1/logs']).resource_logs[0]
        meter = ExportMetricsServiceRequest.FromString(received['/v1/metrics']).resource_metrics[0]
        span = traces.scope_spans[0].spans[0]
        log = logs.scope_logs[0].log_records[0]
        counter = next(metric for metric in meter.scope_metrics[0].metrics if metric.name == 'promptshelf_operations')
        assert span.name == 'save_prompt'
        assert span.trace_id == log.trace_id
        assert log.body.string_value == 'save_prompt → HTTP 201'
        assert any(point.as_int == 1 for point in counter.sum.data_points)
        for signal in (traces, meter, logs):
            labels = {value.key: value.value.string_value for value in signal.resource.attributes}
            assert labels['deployment.environment.name'] == 'dev'
            assert labels['service.version'] == 'a' * 40
        assert all(b'private prompt text' not in signal for signal in received.values())
    finally:
        app.state.shutdown_telemetry()
        collector.shutdown()
        collector.server_close()
        runner.join()


def test_oncall_deduplicates_alerts_and_persists_model_report(monkeypatch, tmp_path):
    monkeypatch.setenv('ONCALL_DB', str(tmp_path / 'oncall.db'))
    payload = {
        'alerts': [{
            'status': 'firing',
            'labels': {'service': 'promptshelf-api', 'operation': 'save_prompt',
                       'deployment_environment': 'dev', 'service_version': 'a' * 40},
            'fingerprint': 'cbdeadbeef01',
            'startsAt': '2026-11-16T12:00:00Z',
        }]
    }
    with TestClient(oncall.app) as client:
        assert client.post('/alerts', json=payload).status_code == 202
        assert client.post('/alerts', json=payload).status_code == 202
        queued = client.get('/incidents').json()
        assert len(queued) == 1 and queued[0]['report'] is None
        monkeypatch.setenv('GEMINI_API_KEY', 'test-key')
        monkeypatch.setattr(oncall, 'collect_evidence', lambda incident: {'metrics': [[1, '8']]})
        monkeypatch.setattr(oncall.ai, '_llm', lambda *args, **kwargs: (
            '{"severity":"warning","summary":"Save errors increased",'
            '"likely_cause":"Check database health","evidence":["8 failures"],"next_checks":["Check PostgreSQL"]}'
        ))
        oncall.analyze_pending()
        completed = client.get('/incidents').json()
        assert completed[0]['report']['provider'] == 'gemini'
        assert completed[0]['report']['telemetry']['metrics'] == [[1, '8']]
