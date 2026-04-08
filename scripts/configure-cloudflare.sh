#!/usr/bin/env bash
set -euo pipefail

: "${CF_API_TOKEN:?Set CF_API_TOKEN to a Cloudflare API token with Zone:Read, DNS:Edit, and Zone Settings:Edit permissions.}"
: "${SERVER_IP:?Set SERVER_IP to the public IPv4 address of the Debian server.}"

ZONE_NAME="${ZONE_NAME:-optimacygeo.com}"
WWW_TARGET="${WWW_TARGET:-optimacygeo.com}"
CLOUDFLARE_API="https://api.cloudflare.com/client/v4"

require() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1"
    exit 1
  }
}

require curl
require jq

api() {
  local method="$1"
  local path="$2"
  local body="${3:-}"

  if [[ -n "$body" ]]; then
    curl -fsS -X "$method" "$CLOUDFLARE_API$path" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "$body"
  else
    curl -fsS -X "$method" "$CLOUDFLARE_API$path" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json"
  fi
}

ZONE_ID="$(api GET "/zones?name=$ZONE_NAME" | jq -r '.result[0].id')"
if [[ -z "$ZONE_ID" || "$ZONE_ID" == "null" ]]; then
  echo "Unable to find Cloudflare zone for $ZONE_NAME"
  exit 1
fi

upsert_dns_record() {
  local record_type="$1"
  local record_name="$2"
  local record_content="$3"
  local payload
  payload="$(jq -nc --arg type "$record_type" --arg name "$record_name" --arg content "$record_content" '{type:$type,name:$name,content:$content,ttl:1,proxied:true}')"

  local record_id
  record_id="$(api GET "/zones/$ZONE_ID/dns_records?type=$record_type&name=$record_name" | jq -r '.result[0].id')"

  if [[ -n "$record_id" && "$record_id" != "null" ]]; then
    api PUT "/zones/$ZONE_ID/dns_records/$record_id" "$payload" >/dev/null
    echo "Updated $record_type record for $record_name"
  else
    api POST "/zones/$ZONE_ID/dns_records" "$payload" >/dev/null
    echo "Created $record_type record for $record_name"
  fi
}

set_zone_setting() {
  local setting_name="$1"
  local value="$2"
  local payload
  payload="$(jq -nc --arg value "$value" '{value:$value}')"
  api PATCH "/zones/$ZONE_ID/settings/$setting_name" "$payload" >/dev/null
  echo "Set Cloudflare setting $setting_name=$value"
}

upsert_dns_record A "$ZONE_NAME" "$SERVER_IP"
upsert_dns_record CNAME "www.$ZONE_NAME" "$WWW_TARGET"
set_zone_setting ssl strict
set_zone_setting always_use_https on
set_zone_setting automatic_https_rewrites on

echo "Cloudflare DNS and SSL settings updated for $ZONE_NAME"