#!/usr/bin/env bash
set -euo pipefail

BTCV_DIR="/home/pimpampoum/BeyondTheCV"
BTY_DIR="/home/pimpampoum/BeyondTheYes"
BTCV_PROJECT="btcv-local"
BTY_PROJECT="bty-local"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/switch_local_apps.sh switch btcv
  ./scripts/switch_local_apps.sh switch bty
  ./scripts/switch_local_apps.sh start btcv
  ./scripts/switch_local_apps.sh start bty
  ./scripts/switch_local_apps.sh stop btcv
  ./scripts/switch_local_apps.sh stop bty
  ./scripts/switch_local_apps.sh status
EOF
}

compose_down_if_exists() {
  local dir="$1"
  local project="$2"
  if [[ -f "$dir/docker-compose.yml" ]]; then
    docker compose -p "$project" -f "$dir/docker-compose.yml" down || true
  fi
}

stop_btcv() {
  compose_down_if_exists "$BTCV_DIR" "$BTCV_PROJECT"
  # Also stop default project name in case it was started without -p.
  compose_down_if_exists "$BTCV_DIR" "beyondthecv"
}

stop_bty() {
  compose_down_if_exists "$BTY_DIR" "$BTY_PROJECT"
  # Also stop default project name in case it was started without -p.
  compose_down_if_exists "$BTY_DIR" "beyondtheyes"
}

start_btcv() {
  if [[ ! -f "$BTCV_DIR/docker-compose.yml" ]]; then
    echo "BTCV docker-compose.yml not found at $BTCV_DIR"
    exit 1
  fi
  stop_btcv
  docker compose -p "$BTCV_PROJECT" -f "$BTCV_DIR/docker-compose.yml" up -d --build
}

start_bty() {
  if [[ ! -f "$BTY_DIR/docker-compose.yml" ]]; then
    echo "BTY docker-compose.yml not found at $BTY_DIR"
    exit 1
  fi
  stop_bty
  docker compose -p "$BTY_PROJECT" -f "$BTY_DIR/docker-compose.yml" up -d --build
}

status() {
  echo "=== LISTENING PORTS (5173/5174/8080/8081) ==="
  ss -ltnp | grep -E ':5173|:5174|:8080|:8081' || true
  echo
  echo "=== BTCV ($BTCV_PROJECT) ==="
  docker compose -p "$BTCV_PROJECT" -f "$BTCV_DIR/docker-compose.yml" ps || true
  echo "=== BTCV (beyondthecv default) ==="
  docker compose -p "beyondthecv" -f "$BTCV_DIR/docker-compose.yml" ps || true
  echo
  echo "=== BTY ($BTY_PROJECT) ==="
  docker compose -p "$BTY_PROJECT" -f "$BTY_DIR/docker-compose.yml" ps || true
  echo "=== BTY (beyondtheyes default) ==="
  docker compose -p "beyondtheyes" -f "$BTY_DIR/docker-compose.yml" ps || true
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

cmd="$1"
app="${2:-}"

case "$cmd" in
  switch)
    if [[ "$app" == "btcv" ]]; then
      stop_bty
      start_btcv
      status
    elif [[ "$app" == "bty" ]]; then
      stop_btcv
      start_bty
      status
    else
      usage
      exit 1
    fi
    ;;
  start)
    if [[ "$app" == "btcv" ]]; then
      start_btcv
    elif [[ "$app" == "bty" ]]; then
      start_bty
    else
      usage
      exit 1
    fi
    status
    ;;
  stop)
    if [[ "$app" == "btcv" ]]; then
      stop_btcv
    elif [[ "$app" == "bty" ]]; then
      stop_bty
    else
      usage
      exit 1
    fi
    status
    ;;
  status)
    status
    ;;
  *)
    usage
    exit 1
    ;;
esac
