#!/bin/sh
# Pull-based roll-out, run on the server by cron.
#
# GitHub's runners cannot open SSH to this VPS, so the server watches the
# repository itself: every couple of minutes this script copies the compose
# file from main, pulls the images the workflow published and recreates only
# the containers whose image changed. It is safe to run at any time.
set -eu

cd "$(dirname "$0")"

# Pulls can outlast the two-minute cron interval; two copies would fight over
# the same images and containers, so a later tick steps aside.
if command -v flock >/dev/null 2>&1; then
  exec 9>.update.lock
  flock -n 9 || exit 0
fi

# The API endpoint honours Cache-Control; raw.githubusercontent.com serves a
# stale copy of a file for minutes after a push, and a stale compose file once
# started the retired stack beside the current one.
RAW="https://api.github.com/repos/abmak/ethioquest/contents/deploy"
# A host that needs to differ from the published images (for example code
# mounted over a base image) keeps its additions in docker-compose.override.yml
# next to this file; the compose file from main still drives the rest.
COMPOSE="docker compose -f docker-compose.prod.yml"
[ -f docker-compose.override.yml ] && COMPOSE="$COMPOSE -f docker-compose.override.yml"
API_IMAGE="ghcr.io/abmak/ethioquest/api:latest"
WEB_IMAGE="ghcr.io/abmak/ethioquest/web:latest"

value() { sed -n "s|^$1=||p" .env | tail -n 1; }
set_value() {
  if grep -q "^$1=" .env; then
    sed -i "s|^$1=.*|$1=$2|" .env
  else
    printf '%s=%s\n' "$1" "$2" >>.env
  fi
}

[ -f .env ] || cp .env.example .env

# Follow the repository's compose file; a stale copy would roll the stack back.
tmp="$(mktemp)"
if curl -fsS --max-time 30 \
  -H "Accept: application/vnd.github.raw" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "$RAW/docker-compose.prod.yml?ref=main" -o "$tmp"; then
  if ! cmp -s "$tmp" docker-compose.prod.yml; then
    mv "$tmp" docker-compose.prod.yml
    echo "$(date -Is) compose file updated from main"
  else
    rm -f "$tmp"
  fi
else
  rm -f "$tmp"
  echo "$(date -Is) could not reach GitHub, keeping the local compose file" >&2
fi

# The workflow moves these tags on every build, so roll-outs need no pinning.
[ "$(value API_IMAGE)" = "$API_IMAGE" ] || set_value API_IMAGE "$API_IMAGE"
[ "$(value WEB_IMAGE)" = "$WEB_IMAGE" ] || set_value WEB_IMAGE "$WEB_IMAGE"

# Without a domain Caddy is off and the web container is the public entry
# point, so it has to bind beyond loopback. Plain HTTP also means the session
# cookie must not be Secure, or the browser drops it and every like or comment
# looks signed out.
if [ -z "$(value DOMAIN)" ]; then
  if [ "$(value BEHIND_TLS_PROXY)" = "1" ]; then
    # TLS is terminated by the host's nginx (see https-setup.sh): keep the web
    # container on loopback and its session cookie Secure.
    [ "$(value WEB_BIND)" = "127.0.0.1" ] || set_value WEB_BIND 127.0.0.1
    [ "$(value COOKIE_SECURE)" = "true" ] || set_value COOKIE_SECURE true
  else
    export WEB_BIND=0.0.0.0
    [ "$(value COOKIE_SECURE)" = "false" ] || set_value COOKIE_SECURE false
  fi
fi

# A registry hiccup must not take a healthy stack down, so a failed refresh
# keeps the images that are already on the host and still applies the compose
# changes below.
if ! $COMPOSE pull -q; then
  echo "$(date -Is) could not refresh images; keeping the local ones" >&2
fi

# Stay quiet unless the roll-out changed something; cron would otherwise fill
# the log with "Container ... Running" every couple of minutes.
out="$(mktemp)"
trap 'rm -f "$out"' EXIT
if ! $COMPOSE up -d --remove-orphans >"$out" 2>&1; then
  echo "$(date -Is) roll-out failed"
  cat "$out"
  exit 1
fi
if grep -qiE 'recreated|created|started|error' "$out"; then
  echo "$(date -Is) roll-out applied"
  cat "$out"
fi

# Drop the release the stack just stopped using. `-a` only touches images no
# container references, which on this host is the previous release.
docker image prune -a -f >/dev/null 2>&1 || true
