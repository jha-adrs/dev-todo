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

# ─── 2. Setup data directory at ~/.devtodo ────────────────────────────
# All persistent data lives in ~/.devtodo/ so upgrades never lose data.
# The install directory only contains code — fully disposable.
DEVTODO_HOME="${HOME}/.devtodo"
mkdir -p "${DEVTODO_HOME}/data" "${DEVTODO_HOME}/uploads" "${DEVTODO_HOME}/logs"

# Migrate data from old in-place installs (data/, uploads/, .env in the install dir)
if [ -f ./data/devtodo.db ] && [ ! -f "${DEVTODO_HOME}/data/devtodo.db" ]; then
  echo "→ Migrating data from ./data/ to ${DEVTODO_HOME}/data/"
  cp -r ./data/* "${DEVTODO_HOME}/data/"
  echo "✓ Database migrated"
fi
if [ -d ./uploads ] && [ "$(ls -A ./uploads 2>/dev/null)" ] && [ ! "$(ls -A "${DEVTODO_HOME}/uploads" 2>/dev/null)" ]; then
  echo "→ Migrating uploads to ${DEVTODO_HOME}/uploads/"
  cp -r ./uploads/* "${DEVTODO_HOME}/uploads/"
  echo "✓ Uploads migrated"
fi

# ─── 3. Generate .env on first run ───────────────────────────────────
if [ ! -f .env ]; then
  # Check if old .env exists in ~/.devtodo from a previous install
  if [ -f "${DEVTODO_HOME}/.env" ]; then
    cp "${DEVTODO_HOME}/.env" .env
    echo "✓ Restored .env from ${DEVTODO_HOME}/"
  else
    if command -v openssl >/dev/null 2>&1; then
      JWT_SECRET=$(openssl rand -hex 32)
    else
      JWT_SECRET=$(head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n')
    fi
    cat > .env <<EOF
JWT_SECRET=${JWT_SECRET}
PORT=3000
DB_PROVIDER=sqlite
DB_PATH=${DEVTODO_HOME}/data/devtodo.db
STORAGE_PROVIDER=local
UPLOADS_PATH=${DEVTODO_HOME}/uploads
LOG_LEVEL=info
ALLOWED_ORIGINS=*
EOF
    echo "✓ Generated .env with random JWT secret"
    echo "  Data directory: ${DEVTODO_HOME}/"
  fi
fi

# Always keep a backup of .env in ~/.devtodo for next upgrade
cp .env "${DEVTODO_HOME}/.env" 2>/dev/null || true

# ─── 4. Ensure PM2 is available under the correct Node ──────────────
# PM2 must be installed under the same Node version that will run the app.
# If PM2 exists but was installed under a different Node, its daemon will
# spawn processes with the wrong ABI → better-sqlite3 crashes.
NEED_PM2_INSTALL=false
if ! command -v pm2 >/dev/null 2>&1; then
  NEED_PM2_INSTALL=true
else
  # Check if PM2's node matches our node
  PM2_NODE=$(pm2 --version 2>/dev/null && which pm2 | xargs head -1 | grep -oE '/[^ ]+/node' || true)
  CURRENT_NODE=$(which node)
  if [ -n "$PM2_NODE" ] && [ "$PM2_NODE" != "$CURRENT_NODE" ]; then
    echo "→ PM2 is running under a different Node version, reinstalling..."
    pm2 kill 2>/dev/null || true
    NEED_PM2_INSTALL=true
  fi
fi

if [ "$NEED_PM2_INSTALL" = true ]; then
  echo "→ Installing PM2 globally..."
  npm install -g pm2
  echo "✓ PM2 installed (Node $(node -v))"
fi

# Kill any stale PM2 daemon that might be running under a wrong Node version.
# PM2's daemon persists across shell sessions — if it was started by Node 24
# and we're now on Node 20, the daemon will spawn children with Node 24.
# `pm2 update` restarts the daemon under the current Node.
pm2 update 2>/dev/null || true

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
