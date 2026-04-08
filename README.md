# Optimacy Geomatics Services LLC Website

This repository contains a production-ready marketing website and contact intake form for `optimacygeo.com`.

## What is included

- Branded responsive website for Optimacy Geomatics Services LLC
- Contact form that forwards new inquiries to `optimacycorp@gmail.com`
- Node/Express server for static hosting plus form delivery
- Debian deployment scripts
- `systemd` service file
- Nginx config for `optimacygeo.com` and `www.optimacygeo.com`
- Cloudflare DNS and SSL automation script
- SMTP setup notes for Gmail delivery

## Local development

1. Copy `.env.example` to `.env`
2. Set SMTP credentials for the mailbox that will send website mail
3. Install dependencies:
   - `npm install`
4. Start the server:
   - `npm start`
5. Visit `http://localhost:3000`

## SMTP recommendation

If you use Gmail for `optimacycorp@gmail.com`, create a Google App Password and place it in `SMTP_PASS`.
Use the following values:

- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=465`
- `SMTP_SECURE=true`
- `SMTP_USER=optimacycorp@gmail.com`
- `SMTP_PASS=your-app-password`
- `TO_EMAIL=optimacycorp@gmail.com`
- `FROM_EMAIL=optimacycorp@gmail.com`

## Cloudflare setup

You can configure Cloudflare either manually or by script.

### Scripted option

Run the Cloudflare helper after setting these environment variables:

- `CF_API_TOKEN` with `Zone:Read`, `DNS:Edit`, and `Zone Settings:Edit`
- `SERVER_IP` with your Debian server public IPv4 address
- Optional: `ZONE_NAME=optimacygeo.com`
- Optional: `WWW_TARGET=optimacygeo.com`

Then run:

```bash
bash scripts/configure-cloudflare.sh
```

This script will:

- Upsert the apex `A` record for `optimacygeo.com`
- Upsert the `www` `CNAME` record to `optimacygeo.com`
- Set Cloudflare SSL mode to `strict`
- Enable `Always Use HTTPS`
- Enable `Automatic HTTPS Rewrites`

### Manual option

Create these DNS records:

- `A` record: `@` -> your Debian server public IP
- `CNAME` record: `www` -> `optimacygeo.com`

Recommended Cloudflare settings:

- SSL/TLS mode: `Full (strict)` after certificates are installed
- Always Use HTTPS: enabled
- Automatic HTTPS Rewrites: enabled

## Debian + nginx deployment

After cloning the repo onto the server, run:

```bash
sudo bash scripts/install-debian.sh
```

Then:

1. Edit `/var/www/optimacygeo/.env`
2. Request TLS certificates:
   - `sudo certbot --nginx -d optimacygeo.com -d www.optimacygeo.com`
3. Reload services if needed:
   - `sudo systemctl restart optimacygeo`
   - `sudo systemctl reload nginx`

## Verification completed locally

- `npm install`
- `npm audit --omit=dev` -> 0 vulnerabilities
- Temporary app startup on port `4010`
- `GET /api/health` -> `200 {"ok":true}`

## Positioning note

The website copy intentionally avoids implying current licensure. It presents Thomas Costandine as a contractor providing geomatics and survey support, with land surveying education and future LSIT/PLS milestones clearly disclosed.