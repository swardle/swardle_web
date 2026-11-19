#!/usr/bin/env bash
set -euo pipefail

export PATH="/usr/local/go/bin:$HOME/go/bin:$HOME/bin:$PATH"

cd "$HOME/swardle_web"
git fetch origin
git checkout main
git reset --hard origin/main

go build -o swardle_web ./cmd/swardle_web

sudo systemctl restart swardle_web.service
sudo systemctl status swardle_web.service --no-pager
