#!/usr/bin/env bash
# Run as root on the existing EC2 host, from a tested release's deploy/ folder.
set -euo pipefail
if [[ "$EUID" -ne 0 ]]; then
  echo 'Run this installer as root on the application host.' >&2
  exit 1
fi
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
command -v python3 >/dev/null
command -v systemctl >/dev/null
test -x /opt/promptshelf/deploy.sh
install -d -o root -g root -m 755 /opt/promptshelf
install -o root -g root -m 755 "$script_dir/poll-deploy.py" /opt/promptshelf/poll-deploy.py
cat > /etc/systemd/system/promptshelf-autodeploy.service <<'UNIT'
[Unit]
Description=Deploy a successful tested PromptShelf main revision
Wants=network-online.target
After=network-online.target docker.service
Requires=docker.service

[Service]
Type=oneshot
User=root
ExecStart=/usr/bin/python3 /opt/promptshelf/poll-deploy.py
TimeoutStartSec=12min
NoNewPrivileges=true
PrivateTmp=true
UNIT
cat > /etc/systemd/system/promptshelf-autodeploy.timer <<'UNIT'
[Unit]
Description=Check public PromptShelf CI every two minutes

[Timer]
OnBootSec=3min
OnUnitActiveSec=2min
Unit=promptshelf-autodeploy.service

[Install]
WantedBy=timers.target
UNIT
chown root:root /etc/systemd/system/promptshelf-autodeploy.service /etc/systemd/system/promptshelf-autodeploy.timer
chmod 644 /etc/systemd/system/promptshelf-autodeploy.service /etc/systemd/system/promptshelf-autodeploy.timer
systemctl daemon-reload
systemctl enable --now promptshelf-autodeploy.timer
