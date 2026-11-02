#!/bin/sh
# Serve the app at the public domain instead of the bare server IP.
#
#   sudo sh ~/ethioquest/domain-setup.sh [domain]
#
# The stack answers on 127.0.0.1:8080 and the host nginx on 443 proxies it as
# the default server (the bare-IP certificate). A browser asking for
# https://ethioquest.jobsethiopia.et/ therefore reaches the app, but the
# certificate is issued for the IP literal so it warns, and http://<domain>/
# has no vhost of its own. This script gives the domain proper vhosts:
#
#   http://<domain>/    -> 301 to https (ACME challenges still answered here)
#   https://<domain>/   -> proxy to the web container on 127.0.0.1:8080
#
# It reuses an existing certificate on the host when one already covers the
# name (the box hosts other jobsethiopia.et subdomains, often with a wildcard)
# and otherwise asks Let's Encrypt through the port-80 vhost it writes first.
# Finally it points CLIENT_ORIGIN at the domain so cookies, links and origin
# checks match what members see.
#
# Safe to re-run: the vhosts are rewritten from here, .env is updated in place
# and an existing certificate is kept until it is due for renewal.
set -eu

[ "$(id -u)" -eq 0 ] || { echo "run this with root privileges: sudo sh $0" >&2; exit 1; }
command -v nginx >/dev/null || { echo "nginx is required" >&2; exit 1; }

DOMAIN="${1:-ethioquest.jobsethiopia.et}"
APP="${APP:-127.0.0.1:8080}"
WEBROOT=/var/www/acme
SITE=/etc/nginx/sites-available/ethioquest-domain
ENABLED=/etc/nginx/sites-enabled/ethioquest-domain
CERTBOT_IMAGE=certbot/certbot:latest
BACKUP="/root/ethioquest-domain-backup-$(date +%Y%m%d%H%M%S)"

# Run from the deploy directory, wherever the script itself was downloaded to.
APPDIR="$(cd "$(dirname "$0")" && pwd)"
if [ ! -f "$APPDIR/docker-compose.prod.yml" ] && [ -f "$HOME/ethioquest/docker-compose.prod.yml" ]; then
  APPDIR="$HOME/ethioquest"
fi
cd "$APPDIR"
[ -f docker-compose.prod.yml ] || { echo "$APPDIR does not look like the app directory" >&2; exit 1; }

echo "• $DOMAIN -> $APP"
mkdir -p "$BACKUP"
[ -f "$SITE" ] && cp -a "$SITE" "$BACKUP/ethioquest-domain"
echo "  nginx backup in $BACKUP"

install -d -m 755 "$WEBROOT/.well-known/acme-challenge"

# nginx before 1.25 wants `listen 443 ssl http2`, later releases reject it in
# favour of a separate `http2 on;` line.
if nginx -v 2>&1 | sed -n 's|.*nginx/\([0-9]*\)\.\([0-9]*\)\.\([0-9]*\).*|\1 \2 \3|p' |
  awk '{ if ($1 > 1 || ($1 == 1 && ($2 > 25 || ($2 == 25 && $3 >= 1)))) exit 0; exit 1 }'; then
  LISTEN_443="listen 443 ssl;"
  HTTP2_LINE="    http2 on;"
else
  LISTEN_443="listen 443 ssl http2;"
  HTTP2_LINE=""
fi

# --- 1. A port-80 vhost so Let's Encrypt can read its challenge -------------
write_http_site() {
  cat >"$SITE" <<EOF
# Managed by ethioquest domain-setup.sh — re-runs rewrite this file.
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root $WEBROOT;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF
}

write_full_site() {
  cat >"$SITE" <<EOF
# Managed by ethioquest domain-setup.sh — re-runs rewrite this file.
# Public entry point for $DOMAIN. The bare-IP vhost (communityhub-tls) stays
# the default server on 443 for IP-literal visitors; this one is matched by
# server_name, which is what browsers send for the domain.
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root $WEBROOT;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    $LISTEN_443
$HTTP2_LINE
    server_name $DOMAIN;

    ssl_certificate     $1;
    ssl_certificate_key $2;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:ethioquest-domain:10m;
    ssl_session_timeout 1d;

    client_max_body_size 30m;

    location / {
        proxy_pass http://$APP;
        proxy_http_version 1.1;
        proxy_set_header Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 600s;
    }
}
EOF
}

reload_or_restore() {
  if nginx -t; then
    systemctl reload nginx
    sleep 1
    return 0
  fi
  echo "nginx rejected the new vhost; restoring the previous configuration" >&2
  if [ -f "$BACKUP/ethioquest-domain" ]; then
    cp -a "$BACKUP/ethioquest-domain" "$SITE"
  else
    rm -f "$SITE" "$ENABLED"
  fi
  nginx -t || true
  return 1
}

# --- 2. Find or issue a certificate that covers the domain -------------------
covers() {
  openssl x509 -in "$1" -noout -checkhost "$DOMAIN" 2>/dev/null | grep -q "does match"
}

# Prints "certificate key" for the first certificate on the host whose names
# include the domain: Let's Encrypt state first, then whatever the existing
# nginx vhosts already point at (a commercial or wildcard certificate for
# jobsethiopia.et saves an issuance and keeps one certificate per name).
find_cert() {
  for candidate in /etc/letsencrypt/live/*/ /etc/letsencrypt-ip/live/*/; do
    [ -s "$candidate/fullchain.pem" ] || continue
    if covers "$candidate/fullchain.pem"; then
      printf '%s %s\n' "$candidate/fullchain.pem" "$candidate/privkey.pem"
      return 0
    fi
  done

  pairs="$(mktemp)"
  nginx -T 2>/dev/null |
    awk '/^[[:space:]]*ssl_certificate /{c=$2} /^[[:space:]]*ssl_certificate_key /{print c" "$2}' >"$pairs"
  while read -r cert key; do
    case "$cert" in /*) ;; *) cert="/etc/nginx/$cert" ;; esac
    case "$key" in /*) ;; *) key="/etc/nginx/$key" ;; esac
    if [ -s "$cert" ] && [ -s "$key" ] && covers "$cert"; then
      printf '%s %s\n' "$cert" "$key"
      break
    fi
  done <"$pairs"
  rm -f "$pairs"
}

PAIR="$(find_cert || true)"
CERT="$(printf '%s' "$PAIR" | cut -d' ' -f1)"
KEY="$(printf '%s' "$PAIR" | cut -d' ' -f2)"
if [ -z "$CERT" ]; then
  echo "• No certificate on this host covers $DOMAIN yet"
  write_http_site
  ln -sfn "$SITE" "$ENABLED"
  reload_or_restore || exit 1

  echo "• Requesting a certificate from Let's Encrypt"
  if command -v certbot >/dev/null 2>&1; then
    issue() {
      certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" --cert-name "$DOMAIN" \
        --non-interactive --agree-tos --register-unsafely-without-email --keep-until-expiring
    }
  else
    issue() {
      docker run --rm \
        -v /etc/letsencrypt:/etc/letsencrypt \
        -v "$WEBROOT":/var/www/acme \
        "$CERTBOT_IMAGE" certonly --webroot -w /var/www/acme -d "$DOMAIN" \
        --cert-name "$DOMAIN" --non-interactive --agree-tos \
        --register-unsafely-without-email --keep-until-expiring
    }
  fi

  if ! issue; then
    echo >&2
    echo "Let's Encrypt could not validate the name. HTTP-01 needs port 80 open to the" >&2
    echo "internet and $DOMAIN pointing here; check with:" >&2
    echo "  curl -sv http://$DOMAIN/.well-known/acme-challenge/probe" >&2
    echo "A host whose port 80 is closed needs a DNS-01 certificate instead." >&2
    exit 1
  fi
  CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
  CERT="$CERT_DIR/fullchain.pem"
  KEY="$CERT_DIR/privkey.pem"
  [ -s "$CERT" ] && [ -s "$KEY" ] || { echo "certificate files are missing under $CERT_DIR" >&2; exit 1; }
else
  echo "• Reusing the certificate in $CERT"
fi

# --- 3. The real vhost -------------------------------------------------------
write_full_site "$CERT" "$KEY"
ln -sfn "$SITE" "$ENABLED"
reload_or_restore || exit 1

# A reload keeps the old config when a listen socket cannot be bound, so check
# the certificate actually served rather than trusting the exit code.
want="$(openssl x509 -in "$CERT" -noout -fingerprint -sha256 2>/dev/null || true)"
got="$(echo | openssl s_client -connect 127.0.0.1:443 -servername "$DOMAIN" 2>/dev/null |
  openssl x509 -noout -fingerprint -sha256 2>/dev/null || true)"
if [ -n "$want" ] && [ "$want" != "$got" ]; then
  echo "warning: 443 is not serving $DOMAIN's certificate yet" >&2
  echo "  check: nginx -T | grep -B3 -A3 'server_name $DOMAIN'" >&2
fi

# --- 4. Renewal --------------------------------------------------------------
if [ -d /etc/letsencrypt/renewal ] && command -v certbot >/dev/null 2>&1; then
  echo "• The system certbot timer renews this certificate"
elif [ -d /etc/letsencrypt/renewal ]; then
  cat >/etc/cron.d/ethioquest-domain-cert <<EOF
# Renew the domain certificate and reload nginx.
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
23 4,16 * * * root docker run --rm -v /etc/letsencrypt:/etc/letsencrypt -v $WEBROOT:/var/www/acme $CERTBOT_IMAGE renew --quiet && systemctl reload nginx
EOF
  chmod 644 /etc/cron.d/ethioquest-domain-cert
  echo "• Added /etc/cron.d/ethioquest-domain-cert for renewal"
fi

# --- 5. Point the app at the domain -----------------------------------------
if [ -f .env ]; then
  value() { sed -n "s|^$1=||p" .env | tail -n 1; }
  set_value() {
    if grep -q "^$1=" .env; then
      sed -i "s|^$1=.*|$1=$2|" .env
    else
      printf '%s=%s\n' "$1" "$2" >>.env
    fi
  }
  add_origin() {
    case ",$(value CORS_EXTRA_ORIGINS)," in
      *",$1,"*) ;;
      *)
        current="$(value CORS_EXTRA_ORIGINS)"
        if [ -n "$current" ]; then
          set_value CORS_EXTRA_ORIGINS "$current,$1"
        else
          set_value CORS_EXTRA_ORIGINS "$1"
        fi
        ;;
    esac
  }

  set_value CLIENT_ORIGIN "https://$DOMAIN"
  add_origin "https://$DOMAIN"
  add_origin "http://$DOMAIN"
  set_value COOKIE_SECURE "true"
  set_value TRUST_PROXY "2"
  echo "• CLIENT_ORIGIN is now https://$DOMAIN"
fi

COMPOSE="docker compose -f docker-compose.prod.yml"
[ -f docker-compose.override.yml ] && COMPOSE="$COMPOSE -f docker-compose.override.yml"
$COMPOSE up -d backend >/dev/null 2>&1 || echo "warning: could not recreate the backend; run '$COMPOSE up -d' by hand" >&2

# --- 6. Smoke test -----------------------------------------------------------
sleep 3
for probe in "https://127.0.0.1/api/health" "http://127.0.0.1/"; do
  code="$(curl -sSk --max-time 15 -o /dev/null -w '%{http_code}' -H "Host: $DOMAIN" "$probe" || true)"
  echo "  $probe (Host: $DOMAIN) -> ${code:-no response}"
done
echo
echo "Done: https://$DOMAIN/  (http:// redirects here)"
