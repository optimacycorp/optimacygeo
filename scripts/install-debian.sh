#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/optimacygeo"
SERVICE_NAME="optimacygeo"
NGINX_CONF_SOURCE="config/nginx.optimacygeo.conf"
SYSTEMD_SOURCE="deploy/optimacygeo.service"

if [[ $EUID -ne 0 ]]; then
  echo "Run this script with sudo."
  exit 1
fi

apt-get update
apt-get install -y nginx nodejs rsync certbot python3-certbot-nginx

mkdir -p "$APP_DIR"
rsync -av --delete ./ "$APP_DIR" --exclude .git --exclude node_modules --exclude .env
cd "$APP_DIR"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created $APP_DIR/.env. Edit SMTP settings before enabling the contact form."
fi

npm install --omit=dev
cp "$SYSTEMD_SOURCE" /etc/systemd/system/${SERVICE_NAME}.service
cp "$NGINX_CONF_SOURCE" /etc/nginx/sites-available/optimacygeo.conf
ln -sf /etc/nginx/sites-available/optimacygeo.conf /etc/nginx/sites-enabled/optimacygeo.conf
rm -f /etc/nginx/sites-enabled/default

systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl restart ${SERVICE_NAME}
nginx -t
systemctl reload nginx

echo "Next steps:"
echo "1. Edit $APP_DIR/.env with SMTP credentials."
echo "2. Run: certbot --nginx -d optimacygeo.com -d www.optimacygeo.com"
echo "3. Confirm DNS in Cloudflare points both hostnames to this server."
