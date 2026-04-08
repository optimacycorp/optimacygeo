#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/optimacygeo"
SERVICE_NAME="optimacygeo"
BRANCH="main"

cd "$APP_DIR"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
npm install --omit=dev
systemctl restart ${SERVICE_NAME}
systemctl status ${SERVICE_NAME} --no-pager