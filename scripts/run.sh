#!/usr/bin/env bash
# DevTodo release runtime launcher — ships inside the release tarball.
# Idempotent: safe to re-run after an upgrade. Preserves existing .env and data/.
set -euo pipefail

# ─── 1. Load nvm and require Node.js 20+ ─────────────────────────────
# If nvm is installed, load it and switch to Node 20 automatically.
# This handles systems with multiple Node versions via nvm.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  nvm use 20 --silent 2>/dev/null || nvm use default --silent 2>/dev/null || true
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js not found."
  echo "Install Node 20+ (https://nodejs.org) and re-run ./run.sh"
  exit 1
fi

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Error: Node.js 20+ required. Current: $(node -v)"
  echo "Hint: if using nvm, run: nvm install 20"
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
LOG_LEVEL=info
ALLOWED_ORIGINS=*
EOF
  echo "✓ Generated .env with random JWT secret"
fi

# ─── 3. Ensure runtime directories exist ─────────────────────────────
mkdir -p data uploads logs

# ─── 4. Ensure PM2 is available ──────────────────────────────────────
if ! command -v pm2 >/dev/null 2>&1; then
  echo "→ Installing PM2 globally..."
  npm install -g pm2
  echo "✓ PM2 installed"
fi

# ─── 5. Start or restart via PM2 ─────────────────────────────────────
if pm2 describe devtodo >/dev/null 2>&1; then
  pm2 restart devtodo
  echo "✓ DevTodo restarted"
else
  pm2 start ecosystem.config.js
  echo "✓ DevTodo started via PM2"
fi

pm2 save

echo ""
echo "  DevTodo is running at http://0.0.0.0:${PORT:-3000}"
echo "  Logs:   pm2 logs devtodo"
echo "  Status: pm2 status"
echo "  Stop:   pm2 stop devtodo"
