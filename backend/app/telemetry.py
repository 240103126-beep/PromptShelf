"""Record PromptShelf operations without exporting prompts, URLs, or user data."""

import os
import time

OPERATIONS = {
    ('POST', '/api/items'): 'save_prompt',
    ('POST', '/api/items/batch'): 'import_prompts',
    ('POST', '/api/collections'): 'create_collection',
    ('POST', '/api/export'): 'export_library',
    ('POST', '/api/ai/ask'): 'ask_assistant',
}


def release_info():
    return {
        'service': 'promptshelf-api',
        'environment': os.getenv('APP_ENVIRONMENT', 'local'),
        'version': os.getenv('APP_VERSION', 'local'),
        'image': os.getenv('APP_IMAGE_REFERENCE', ''),
    }


def configure_telemetry(app):
    endpoint = os.getenv('OTEL_EXPORTER_OTLP_ENDPOINT', '').rstrip('/')
    if not endpoint:
        return

    from opentelemetry._logs import SeverityNumber
    from opentelemetry.context import get_current
    from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
    from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk._logs import LoggerProvider
    from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.trace import SpanKind, Status, StatusCode

    release = release_info()
    labels = {
        'deployment_environment': release['environment'],
        'service_version': release['version'],
    }
    resource = Resource.create({
        'service.name': release['service'],
        'deployment.environment.name': release['environment'],
        'service.version': release['version'],
    })

    traces = TracerProvider(resource=resource)
    traces.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=f'{endpoint}/v1/traces', timeout=5)))
    tracer = traces.get_tracer('promptshelf.operations')
    metrics = MeterProvider(resource=resource, metric_readers=[
        PeriodicExportingMetricReader(
            OTLPMetricExporter(endpoint=f'{endpoint}/v1/metrics', timeout=5),
            export_interval_millis=5_000,
        )
    ])
    meter = metrics.get_meter('promptshelf.operations')
    requests = meter.create_counter('promptshelf_operations', description='Completed application operations')
    requests.add(0, {**labels, 'operation': 'save_prompt', 'outcome': 'server_error'})
    duration = meter.create_histogram('promptshelf_operation_duration', unit='s')
    logs = LoggerProvider(resource=resource)
    logs.add_log_record_processor(BatchLogRecordProcessor(OTLPLogExporter(endpoint=f'{endpoint}/v1/logs', timeout=5)))
    logger = logs.get_logger('promptshelf.operations')

    def shutdown():
        traces.shutdown()
        metrics.shutdown()
        logs.shutdown()

    app.state.shutdown_telemetry = shutdown

    @app.middleware('http')
    async def record_operation(request, call_next):
        operation = OPERATIONS.get((request.method, request.url.path))
        if operation is None:
            return await call_next(request)
        started = time.monotonic()
        with tracer.start_as_current_span(
            operation, kind=SpanKind.SERVER, record_exception=False, set_status_on_exception=False
        ) as span:
            status = 500
            error_type = ''
            try:
                response = await call_next(request)
                status = response.status_code
                return response
            except Exception as error:
                error_type = type(error).__name__
                raise
            finally:
                if status >= 500:
                    outcome = 'server_error'
                    span.set_status(Status(StatusCode.ERROR))
                elif status >= 400:
                    outcome = 'client_error'
                else:
                    outcome = 'success'
                attributes = {**labels, 'operation': operation, 'outcome': outcome}
                span.set_attributes({**attributes, 'http.response.status_code': status, 'error.type': error_type})
                requests.add(1, attributes)
                duration.record(time.monotonic() - started, attributes)
                logger.emit(
                    context=get_current(),
                    severity_number=SeverityNumber.ERROR if status >= 500 else SeverityNumber.INFO,
                    severity_text='ERROR' if status >= 500 else 'INFO',
                    body=f'{operation} → HTTP {status}',
                    attributes={**attributes, 'http_status': status, 'error_type': error_type},
                )
