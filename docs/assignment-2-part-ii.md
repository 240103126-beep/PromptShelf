# PromptShelf · Assignment 2 Part II

| Criterion | Implementation | What to show |
| --- | --- | --- |
| Development and production | Separate Compose projects with independent PostgreSQL instances and volumes | Open both applications and show that a dev-only test prompt is absent in production. |
| Manual CI/CD promotion | GitHub Actions checks the running dev revision and health, verifies that revision passed main CI, promotes its GHCR manifest by digest, and waits for production | Show the successful workflow run and matching image digests at both `/api/release` endpoints. |
| OpenTelemetry | FastAPI exports metrics, structured logs and traces over OTLP HTTP to a separate collector and Grafana LGTM stack | Save a prompt. Show the metric, a Loki log and the matching Tempo trace. |
| Application metrics | Prompt saves, imports, collection creation, exports and assistant requests, with outcome and duration | Open **PromptShelf Operations** and filter by environment and deployed version. |
| Alerting | Grafana detects five or more server-side save failures in a two-minute window and sends an on-call webhook | Run the demo in dev and show **Repeated prompt save failures**. |
| AI on-call | A separate worker persists the alert, queries telemetry for its environment/version and asks Gemini for a diagnosis and suggested checks | Show an incident with a `gemini` report. A pending incident proves webhook delivery only. |

## Local setup

Run from the repository root with Docker and Compose v2 installed and running.

```bash
docker build -t promptshelf:local .
umask 077
mkdir -p .environments
for environment in dev prod; do
  printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 20)" > ".environments/$environment.env"
done
printf 'GRAFANA_ADMIN_PASSWORD=%s\n' "$(openssl rand -hex 20)" > observability/.env
docker compose -f observability/compose.yaml up -d
bash deploy/environments.sh dev up
bash deploy/environments.sh prod up
```

Keep the generated files for restarts. Their database passwords must continue to match the initialized volumes. Store the Gemini key as `ONCALL_GEMINI_API_KEY` in `observability/.env`, then re-run `docker compose -f observability/compose.yaml up -d` to restart the worker with it. The worker queues alerts while the key is absent and processes them when configured.

- Dev app: <http://localhost:8001/app>
- Prod app: <http://localhost:8002/app>
- Grafana: <http://localhost:3000/d/promptshelf-ops/>. Sign in as `admin` with the generated password.
- In **Explore → Tempo**, search for service `promptshelf-api`. Application logs include the same trace IDs.

## End-to-end verification

Run the following against an isolated local Docker engine or in GitHub Actions. It starts fresh dev and prod databases, uses synthetic input, stops its own dev database briefly, verifies that production stays healthy, and checks the dashboard, all three signals and delivery of the alert. The optional `ONCALL_GEMINI_API_KEY` environment variable additionally requires a real model report.

```bash
APP_IMAGE=promptshelf:local bash tests/observability/verify.sh
```

The artifacts are saved under `test-results/observability/`. For an already running demo, inspect reports with:

```bash
docker compose -f observability/compose.yaml exec -T oncall python -c \
  'import urllib.request; print(urllib.request.urlopen("http://127.0.0.1:8000/incidents").read().decode())'
```

## Hosted GitHub Actions promotion

1. Use a Linux Docker host with enough memory to run two app/database pairs and Grafana LGTM together. Choose existing infrastructure and preserve any Part I database separately. The installed deployment service uses independent project names for Part II.
2. Put a checkout of this repository and the two environment files on the host. Give the two apps separate externally reachable URLs with your host's reverse proxy. Keep the collector, dashboard, databases and webhook internal. The default app ports bind to localhost for this purpose.
3. After a successful main build publishes the image, set `ONCALL_IMAGE` in `observability/.env` to that GHCR image by digest and configure the model key. Start the observability Compose project and install the host deployment timer with `sudo env PROMPTSHELF_CONFIG_DIR=/absolute/config/path bash deploy/install-environments.sh`. The package must remain public for the existing tokenless host pull method.
4. Set GitHub Actions repository variables `DEVELOPMENT_URL` and `PRODUCTION_URL` to each app's origin. On **Actions → Promote development image to production → Run workflow**, enter the full revision from the healthy dev `/api/release` endpoint.
5. The host deploys the approved digest to prod on its next poll. The workflow succeeds after observing that digest in the healthy production application.

The Part I AWS and Render endpoints do not prove this release has been deployed. Use the actual Part II URLs and successful workflow in the submission.

Reference: [DevOps and Observability for an AI-Built App](https://aishippingblog.com/p/devops-and-observability-for-an-ai).
