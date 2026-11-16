#!/usr/bin/env bash
set -euo pipefail
: "${PROMPTSHELF_CONFIG_DIR:?Set PROMPTSHELF_CONFIG_DIR to your dev.env and prod.env directory}"
root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
for directory in "$root" "$PROMPTSHELF_CONFIG_DIR"; do
  if [[ ! "$directory" =~ ^/[a-zA-Z0-9_./-]+$ ]]; then
    echo 'Use absolute paths without spaces on the deployment host.' >&2
    exit 2
  fi
done
test "$EUID" -eq 0
test -s "$PROMPTSHELF_CONFIG_DIR/dev.env" && test -s "$PROMPTSHELF_CONFIG_DIR/prod.env"
docker network inspect promptshelf-telemetry >/dev/null
cat > /etc/systemd/system/promptshelf-environments.service <<UNIT
[Unit]
Description=Reconcile PromptShelf development and production releases
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=oneshot
Environment=PROMPTSHELF_CONFIG_DIR=$PROMPTSHELF_CONFIG_DIR
ExecStart=/usr/bin/python3 $root/deploy/poll-environments.py
TimeoutStartSec=15min
UNIT
cat > /etc/systemd/system/promptshelf-environments.timer <<'UNIT'
[Unit]
Description=Check for tested development and approved production images

[Timer]
OnBootSec=30s
OnUnitInactiveSec=120s

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now promptshelf-environments.timer
systemctl start --no-block promptshelf-environments.service
