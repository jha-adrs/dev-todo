#!/usr/bin/env bash
# DevTodo release runtime launcher — ships inside the release tarball.
# Idempotent: safe to re-run after an upgrade. Preserves existing .env and data/.
set -euo pipefail

# ─── 1. Require Node.js 20+ ──────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js not found."
  echo "Install Node 20+ (https://nodejs.org) and re-run ./run.sh"
  exit 1
fi

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Error: Node.js 20+ required. Current: $(node -v)"
  exit 1
fi

# ─── 2. Generate .env on first run ───────────────────────────────────
if [ ! -f .env ]; then
  if command -v openssl >/dev/null 2>&1; then
    JWT_SECRET=$(openssl rand -hex 32)
  else
    JWT_SECRET=$(head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n')
  fi
  cat > .env <<EOF
JWT_SECRET=${JWT_SECRET}
PORT=3000
DB_PROVIDER=sqlite
DB_PATH=./data/devtodo.db
STORAGE_PROVIDER=local
EOF
  echo "✓ Generated .env with random JWT secret"
fi

# ─── 3. Ensure runtime directories exist ─────────────────────────────
mkdir -p data uploads

# ─── 4. Exec the server (migrations run automatically on startup) ────
exec node server/dist/index.js
