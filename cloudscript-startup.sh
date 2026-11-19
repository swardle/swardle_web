#!/usr/bin/env bash
set -euo pipefail

GO_VERSION="${GO_VERSION:-1.27.3}"
CERT_DIR="/var/lib/swardle_web/certs"

# Install required packages
sudo apt-get update
sudo apt-get install -y curl git rsync unzip
sudo apt-get clean

# Install Go and clean up tarball
GO_TARBALL="go${GO_VERSION}.linux-amd64.tar.gz"
curl -fsSLO "https://go.dev/dl/${GO_TARBALL}"
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf "${GO_TARBALL}"
rm -f "${GO_TARBALL}"

if ! grep -q '/usr/local/go/bin' "$HOME/.profile" 2>/dev/null; then
  {
    echo 'export GOPATH="$HOME/go"'
    echo 'export PATH="/usr/local/go/bin:$GOPATH/bin:$HOME/bin:$PATH"'
    echo 'export GOBIN="$GOPATH/bin"'
  } >> "$HOME/.profile"
fi
export PATH="/usr/local/go/bin:$HOME/go/bin:$HOME/bin:$PATH"
go version

# Clone or update repository
if [ -d "$HOME/swardle_web/.git" ]; then
  git -C "$HOME/swardle_web" fetch origin
  git -C "$HOME/swardle_web" checkout main
  git -C "$HOME/swardle_web" reset --hard origin/main
else
  git clone https://github.com/swardle/swardle_web.git "$HOME/swardle_web"
fi

# Build binary
cd "$HOME/swardle_web"
go build -o swardle_web ./cmd/swardle_web

# Ensure persistent TLS certificate directory outside repo
sudo install -d -m 0700 -o root -g root "${CERT_DIR}"

# Install systemd unit (HTTPS via embedded Go autocert)
sudo tee /etc/systemd/system/swardle_web.service >/dev/null <<EOF
[Unit]
Description=swardle.com Go web server
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=300
StartLimitBurst=10

[Service]
Type=simple
WorkingDirectory=$HOME/swardle_web
Environment=PORT=80
Environment=PROJECT_ID=694671698910
Environment=CERT_DIR=${CERT_DIR}
ExecStart=$HOME/swardle_web/swardle_web
Restart=always
RestartSec=5
MemoryMax=512M
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now swardle_web.service
sudo systemctl status swardle_web.service --no-pager
