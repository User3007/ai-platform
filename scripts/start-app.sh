#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/home/thien/ai-platform"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

require_file() {
  local path="$1"
  local message="$2"

  if [[ ! -f "$path" ]]; then
    echo "$message"
    exit 1
  fi
}

require_dir() {
  local path="$1"
  local message="$2"

  if [[ ! -d "$path" ]]; then
    echo "$message"
    exit 1
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

cleanup() {
  local exit_code=$?

  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi

  if [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi

  exit "$exit_code"
}

trap cleanup EXIT INT TERM

require_dir "$BACKEND_DIR" "Backend directory not found: $BACKEND_DIR"
require_dir "$FRONTEND_DIR" "Frontend directory not found: $FRONTEND_DIR"
require_file "$BACKEND_DIR/.env" "Missing backend/.env. Copy backend/.env.example and update it first."
require_file "$BACKEND_DIR/config/api_keys.yaml" "Missing backend/config/api_keys.yaml. Configure provider keys first."

if [[ ! -x "$BACKEND_DIR/.venv/bin/python" ]]; then
  echo "Bootstrapping backend dependencies..."
  "$ROOT_DIR/scripts/bootstrap-backend.sh"
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Installing frontend dependencies..."
  "$ROOT_DIR/scripts/bootstrap-frontend.sh"
fi

echo "Running database migrations..."
(
  cd "$BACKEND_DIR"
  .venv/bin/alembic upgrade head
)

echo "Seeding default models..."
(
  cd "$BACKEND_DIR"
  .venv/bin/python scripts/seed_default_models.py
)

kill_by_pattern "$BACKEND_DIR/.venv/bin/python run.py" "backend"
kill_by_pattern "uvicorn app.main:app --host 0.0.0.0 --port 8000" "backend"
kill_by_port 8000 "backend"
kill_by_pattern "next dev" "frontend dev server"
kill_by_pattern "next start" "frontend server"
kill_by_port 3000 "frontend"

echo "Starting backend on http://127.0.0.1:8000 ..."
(
  cd "$BACKEND_DIR"
  exec .venv/bin/python run.py
) &
BACKEND_PID=$!

echo "Starting frontend on http://localhost:3000 ..."
(
  cd "$FRONTEND_DIR"
  exec npm run dev
) &
FRONTEND_PID=$!

echo "App startup initiated. Press Ctrl+C to stop both services."
wait "$BACKEND_PID" "$FRONTEND_PID"