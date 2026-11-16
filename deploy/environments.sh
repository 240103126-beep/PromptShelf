#!/usr/bin/env bash
set -euo pipefail
root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
config_dir=${PROMPTSHELF_CONFIG_DIR:-"$root/.environments"}
target=${1:-}
command=${2:-}
if [[ "$target" != dev && "$target" != prod ]]; then
  echo 'Usage: deploy/environments.sh dev|prod up|down|ps|stop-db|start-db [image]' >&2
  exit 2
fi
case "$target" in
  dev) default_port=127.0.0.1:8001 ;;
  prod) default_port=127.0.0.1:8002 ;;
esac
unset POSTGRES_PASSWORD
export APP_ENVIRONMENT="$target"
if [[ "$command" == up && -n "${3:-}" ]]; then
  export APP_IMAGE="$3"
fi
export APP_IMAGE="${APP_IMAGE:-promptshelf:local}"
if [[ ! -f "$config_dir/$target.env" ]]; then
  echo "Missing configuration for $target: $config_dir/$target.env" >&2
  exit 2
fi
if [[ -z "${APP_PORT:-}" ]] && ! grep -q '^APP_PORT=' "$config_dir/$target.env"; then
  export APP_PORT="$default_port"
fi
compose=(docker compose --project-directory "$root" --project-name "${PROMPTSHELF_PROJECT_PREFIX:-promptshelf}-$target"
  --env-file "$config_dir/$target.env" -f "$root/docker-compose.yaml"
  -f "$root/deploy/compose.aws.yaml" -f "$root/deploy/compose.telemetry.yaml")
case "$command" in
  up) "${compose[@]}" up --detach --no-build --wait --wait-timeout 180 ;;
  down|ps) "${compose[@]}" "$command" "${@:3}" ;;
  stop-db) "${compose[@]}" stop db ;;
  start-db) "${compose[@]}" up --detach --no-build --wait --wait-timeout 90 db ;;
  *) echo "Unknown deployment command: $command" >&2; exit 2 ;;
esac
