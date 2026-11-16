#!/usr/bin/env bash
# Run only on an isolated workstation or CI runner. This stops the demo dev database.
set -euo pipefail
root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$root"
image=${APP_IMAGE:-promptshelf:local}
export PROMPTSHELF_CONFIG_DIR
PROMPTSHELF_CONFIG_DIR=$(mktemp -d)
export GRAFANA_ADMIN_PASSWORD
GRAFANA_ADMIN_PASSWORD=$(openssl rand -hex 20)
export ONCALL_IMAGE="$image"
export PROMPTSHELF_PROJECT_PREFIX="promptshelf-check-$(openssl rand -hex 4)"
export PROMPTSHELF_TELEMETRY_NETWORK="$PROMPTSHELF_PROJECT_PREFIX"
export GRAFANA_PORT=13000 OTEL_PORT=14318
monitor=(docker compose -p "$PROMPTSHELF_PROJECT_PREFIX-observability" -f observability/compose.yaml)
evidence=test-results/observability
mkdir -p "$evidence"
cleanup() {
  result=$?
  if (( result != 0 )); then
    "${monitor[@]}" logs --no-color > "$evidence/services.log" 2>&1 || true
  fi
  bash deploy/environments.sh dev down -v 2>/dev/null || true
  bash deploy/environments.sh prod down -v 2>/dev/null || true
  "${monitor[@]}" down -v || true
  rm -rf "$PROMPTSHELF_CONFIG_DIR"
}
trap cleanup EXIT
printf 'POSTGRES_PASSWORD=%s\nAPP_PORT=127.0.0.1:18001\n' "$(openssl rand -hex 20)" > "$PROMPTSHELF_CONFIG_DIR/dev.env"
printf 'POSTGRES_PASSWORD=%s\nAPP_PORT=127.0.0.1:18002\n' "$(openssl rand -hex 20)" > "$PROMPTSHELF_CONFIG_DIR/prod.env"
"${monitor[@]}" up -d
grafana=http://127.0.0.1:$GRAFANA_PORT
dev=http://127.0.0.1:18001
prod=http://127.0.0.1:18002
get_grafana() { curl -fsS --max-time 10 -u "admin:$GRAFANA_ADMIN_PASSWORD" "$@"; }
retry() {
  for attempt in $(seq 1 36); do
    if "$@"; then return 0; fi
    sleep 5
  done
  return 1
}
retry get_grafana "$grafana/api/dashboards/uid/promptshelf-ops" > "$evidence/dashboard.json"
bash deploy/environments.sh dev up "$image"
bash deploy/environments.sh prod up "$image"
curl -fsS "$dev/api/release" | tee "$evidence/dev-release.json" | jq -e --arg image "$image" '.environment == "dev" and .image == $image'
curl -fsS "$prod/api/release" | tee "$evidence/prod-release.json" | jq -e --arg image "$image" '.environment == "prod" and .image == $image'
title="CI telemetry demo $(date +%s)"
item=$(jq -cn --arg title "$title" '{title: $title, prompt: "Synthetic telemetry test"}')
save() { curl -sS --max-time 15 -H 'Content-Type: application/json' -d "$item" "$1/api/items" "${@:2}"; }
save "$dev" --fail | jq -e --arg title "$title" '.title == $title'
curl -fsS "$prod/api/items" | jq -e --arg title "$title" 'all(.[]; .title != $title)'
prometheus="$grafana/api/datasources/proxy/uid/prometheus/api/v1/query"
loki="$grafana/api/datasources/proxy/uid/loki/loki/api/v1/query_range"
tempo="$grafana/api/datasources/proxy/uid/tempo/api/search"
metrics_found() {
  get_grafana -G "$prometheus" --data-urlencode 'query=promptshelf_operations_total{deployment_environment="dev",operation="save_prompt",outcome="success"}' |
    jq -e '.data.result | select(length > 0)'
}
logs_found() {
  get_grafana -G "$loki" --data-urlencode 'query={service_name="promptshelf-api"} |= "save_prompt"' |
    jq -e '.data.result | select(length > 0)'
}
traces_found() {
  get_grafana -G "$tempo" --data-urlencode 'q={ resource.service.name = "promptshelf-api" && span.operation = "save_prompt" }' |
    jq -e '.traces | select(length > 0)'
}
retry metrics_found > "$evidence/metrics.json"
retry logs_found > "$evidence/logs.json"
retry traces_found > "$evidence/traces.json"

bash deploy/environments.sh dev stop-db
for attempt in $(seq 1 8); do
  status=$(save "$dev" -o /dev/null -w '%{http_code}')
  [[ "$status" == 500 ]]
  sleep 2
done
bash deploy/environments.sh dev start-db
curl -fsS "$prod/api/health" | jq -e '.status == "ok"'
incident_found() {
  "${monitor[@]}" exec -T oncall python -c \
    'import urllib.request; print(urllib.request.urlopen("http://127.0.0.1:8000/incidents").read().decode())' |
    jq -e 'map(select(.environment == "dev")) | select(length > 0)'
}
retry incident_found > "$evidence/incidents.json"
if [[ -n "${ONCALL_GEMINI_API_KEY:-}" ]]; then
  model_report_found() { incident_found | jq -e 'map(select(.report.provider == "gemini")) | select(length > 0)'; }
  retry model_report_found > "$evidence/gemini-report.json"
fi
echo 'Verified separate databases, the same image, all three OTLP signals and on-call webhook delivery.'
