#!/usr/bin/env bash
# Generate a self-signed TLS certificate for local Traefik development.
# Run once before `docker compose up`. For production use a real CA / ACME.
set -euo pipefail

CERT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/certs"
mkdir -p "$CERT_DIR"

if [[ -f "$CERT_DIR/local.crt" && -f "$CERT_DIR/local.key" ]]; then
  echo "[proxy] certs already exist at $CERT_DIR, skipping."
  exit 0
fi

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "$CERT_DIR/local.key" \
  -out "$CERT_DIR/local.crt" \
  -days 825 \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:auth,DNS:server,DNS:lottery-stats-server,DNS:ui,IP:127.0.0.1"

echo "[proxy] generated self-signed cert at $CERT_DIR"
echo "[proxy] trust this cert in your browser for local HTTPS testing."
