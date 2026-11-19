#!/usr/bin/env bash
set -euo pipefail

sudo systemctl stop swardle_web.service || true
sudo systemctl status swardle_web.service --no-pager || true
