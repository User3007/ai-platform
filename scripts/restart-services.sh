#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/home/thien/ai-platform"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PID_FILE="$ROOT_DIR/.backend.pid"
FRONTEND_PID_FILE="$ROOT_DIR/.frontend.pid"

usage() {
  cat <<'EOF'
Usage: scripts/restart-services.sh <target> [mode]

Targets:
  backend      Restart backend only
  frontend     Restart frontend only
  all          Restart backend and frontend

Modes:
  dev          Run service in development mode with live logs in terminal
  normal       Run service in normal mode with live logs in terminal

Examples:
  scripts/restart-services.sh backend dev
  scripts/restart-services.sh frontend normal
  scripts/restart-services.sh all dev
EOF
}

kill_from_pid_file() {
  local pid_file="$1"
  local label="$2"

  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      echo "Stopping $label (PID $pid)..."
      kill "$pid"
      wait "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
  fi
}

kill_by_pattern() {
  local pattern="$1"
  local label="$2"

  if pgrep -f "$pattern" >/dev/null 2>&1; then
    echo "Stopping existing $label processes..."
    pkill -f "$pattern" || true
  fi
}

kill_by_port() {
  local port="$1"
  local label="$2"

  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      echo "Stopping $label on port $port..."
      kill $pids 2>/dev/null || true
    fi
    return
  fi

  if command -v fuser >/dev/null 2>&1; then
    if fuser "$port"/tcp >/dev/null 2>&1; then
      echo "Stopping $label on port $port..."
      fuser -k "$port"/tcp >/dev/null 2>&1 || true
    fi
  fi
}

start_backend() {
  local mode="$1"
  cd "$BACKEND_DIR"

  if [[ ! -x ".venv/bin/python" ]]; then
    echo "Backend venv not found at $BACKEND_DIR/.venv"
    exit 1
  fi

  kill_from_pid_file "$BACKEND_PID_FILE" "backend"
  kill_by_pattern "$BACKEND_DIR/.venv/bin/python run.py" "backend"
  kill_by_pattern "uvicorn app.main:app --host 0.0.0.0 --port 8000" "backend"
  kill_by_pattern "uvicorn app.main:app --host 127.0.0.1 --port 8000" "backend"
  kill_by_port 8000 "backend"

  echo "Starting backend in $mode mode..."
  if [[ "$mode" == "dev" ]]; then
    exec .venv/bin/python run.py
  else
    exec .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
  fi
}

start_frontend() {
  local mode="$1"
  cd "$FRONTEND_DIR"

  if [[ ! -d node_modules ]]; then
    echo "Frontend dependencies not installed. Run npm install first."
    exit 1
  fi

  kill_from_pid_file "$FRONTEND_PID_FILE" "frontend"
  kill_by_pattern "next dev" "frontend dev server"
  kill_by_pattern "next start" "frontend server"
  kill_by_port 3000 "frontend"

  echo "Starting frontend in $mode mode..."
  if [[ "$mode" == "dev" ]]; then
    exec npm run dev
  else
    exec npm run start
  fi
}

if [[ $# -lt 1 || $# -gt 2 ]]; then
  usage
  exit 1
fi

target="$1"
mode="${2:-dev}"

if [[ "$mode" != "dev" && "$mode" != "normal" ]]; then
  echo "Invalid mode: $mode"
  usage
  exit 1
fi

case "$target" in
  backend)
    start_backend "$mode"
    ;;
  frontend)
    start_frontend "$mode"
    ;;
  all)
    echo "For 'all', run backend and frontend in separate terminals:"
    echo "  scripts/restart-services.sh backend $mode"
    echo "  scripts/restart-services.sh frontend $mode"
    exit 0
    ;;
  *)
    echo "Invalid target: $target"
    usage
    exit 1
    ;;
esac
