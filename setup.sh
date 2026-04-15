#!/usr/bin/env bash
set -e

# DevTodo Setup Script
# Usage:
#   ./setup.sh                        # full install + start (production)
#   ./setup.sh --dev                  # dev mode with hot reload
#   ./setup.sh --no-install-node      # skip auto-install of Node/nvm
#   ./setup.sh --with-swap            # create 2GB swap file if missing (low-RAM VPS)

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

REQUIRED_NODE_MAJOR=20
NVM_VERSION="v0.40.4"
NODE_INSTALL_VERSION="20"  # latest LTS at time of writing

DEV_MODE=false
INSTALL_NODE=true
WITH_SWAP=false
for arg in "$@"; do
  case $arg in
    --dev) DEV_MODE=true ;;
    --no-install-node) INSTALL_NODE=false ;;
    --with-swap) WITH_SWAP=true ;;
  esac
done

echo ""
echo "  ╔══════════════════════════╗"
echo "  ║       DevTodo Setup      ║"
echo "  ╚══════════════════════════╝"
echo ""

# ─── Helpers ───────────────────────────────────────────────────────

node_major() {
  command -v node &> /dev/null && node -v 2>/dev/null | sed 's/v//' | cut -d. -f1
}

load_nvm() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
}

install_nvm_and_node() {
  echo -e "${BLUE}→${NC} Installing nvm $NVM_VERSION..."
  curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/$NVM_VERSION/install.sh" | bash >/dev/null 2>&1
  load_nvm
  if ! command -v nvm &> /dev/null; then
    echo -e "${RED}Failed to load nvm after installation.${NC}"
    echo "Open a new shell and re-run ./setup.sh, or install Node.js manually from https://nodejs.org"
    exit 1
  fi
  echo -e "${GREEN}✓${NC} nvm installed"

  echo -e "${BLUE}→${NC} Installing Node.js $NODE_INSTALL_VERSION via nvm..."
  nvm install "$NODE_INSTALL_VERSION" >/dev/null 2>&1
  nvm use "$NODE_INSTALL_VERSION" >/dev/null 2>&1
  nvm alias default "$NODE_INSTALL_VERSION" >/dev/null 2>&1
  echo -e "${GREEN}✓${NC} Node.js $(node -v) installed"
}

# ─── Step 0: Optional swap (--with-swap) ───────────────────────────

if [ "$WITH_SWAP" = true ]; then
  if swapon --show 2>/dev/null | grep -q '^/'; then
    echo -e "${GREEN}✓${NC} Swap already active, skipping"
  else
    echo -e "${BLUE}→${NC} Creating 2GB swap file..."
    if sudo fallocate -l 2G /swapfile 2>/dev/null; then
      :
    else
      # fallocate not supported (e.g. some filesystems) — fall back to dd
      sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
    fi
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile >/dev/null
    sudo swapon /swapfile
    if ! grep -q '^/swapfile' /etc/fstab; then
      echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
    fi
    echo -e "${GREEN}✓${NC} 2GB swap active and persistent across reboots"
  fi
fi

# ─── Step 1: Node.js ───────────────────────────────────────────────

CURRENT_MAJOR=$(node_major || echo "0")

if [ -z "$CURRENT_MAJOR" ] || [ "$CURRENT_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
  if [ "$INSTALL_NODE" = "true" ]; then
    if [ -z "$CURRENT_MAJOR" ]; then
      echo -e "${YELLOW}⚠${NC}  Node.js not found."
    else
      echo -e "${YELLOW}⚠${NC}  Node.js v$CURRENT_MAJOR found but $REQUIRED_NODE_MAJOR+ is required."
    fi

    # Check for existing nvm before downloading installer
    load_nvm
    if command -v nvm &> /dev/null; then
      echo -e "${BLUE}→${NC} Found existing nvm, installing Node.js $NODE_INSTALL_VERSION..."
      nvm install "$NODE_INSTALL_VERSION" >/dev/null 2>&1
      nvm use "$NODE_INSTALL_VERSION" >/dev/null 2>&1
      nvm alias default "$NODE_INSTALL_VERSION" >/dev/null 2>&1
      echo -e "${GREEN}✓${NC} Node.js $(node -v) ready"
    else
      install_nvm_and_node
    fi
  else
    echo -e "${RED}Error: Node.js $REQUIRED_NODE_MAJOR+ is required.${NC}"
    echo "Install from https://nodejs.org or re-run without --no-install-node to auto-install."
    exit 1
  fi
else
  echo -e "${GREEN}✓${NC} Node.js $(node -v)"
fi

# ─── Step 2: Dependencies ──────────────────────────────────────────

echo -e "${BLUE}→${NC} Installing npm dependencies..."
npm install --silent
echo -e "${GREEN}✓${NC} Dependencies installed"

# ─── Step 3: .env ──────────────────────────────────────────────────

if [ ! -f .env ]; then
  echo -e "${BLUE}→${NC} Generating .env..."
  JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n')
  cat > .env << EOF
JWT_SECRET=${JWT_SECRET}
PORT=3000
DB_PROVIDER=sqlite
DB_PATH=./data/devtodo.db
STORAGE_PROVIDER=local
EOF
  echo -e "${GREEN}✓${NC} .env created with random JWT secret"
else
  echo -e "${GREEN}✓${NC} .env already exists"
fi

# ─── Step 4: Directories ───────────────────────────────────────────

mkdir -p data uploads
echo -e "${GREEN}✓${NC} data/ and uploads/ directories ready"

# ─── Step 5: Dev mode short-circuit ────────────────────────────────

if [ "$DEV_MODE" = true ]; then
  echo ""
  echo -e "${GREEN}Starting dev servers...${NC}"
  echo "  Client: http://localhost:5173"
  echo "  Server: http://localhost:3000"
  echo ""
  npm run dev
  exit 0
fi

# ─── Step 6: Production build ──────────────────────────────────────

echo -e "${BLUE}→${NC} Building..."
npm run build
echo -e "${GREEN}✓${NC} Build complete"

echo ""
echo -e "${GREEN}══════════════════════════════════${NC}"
echo -e "${GREEN}  DevTodo is ready!${NC}"
echo -e "${GREEN}══════════════════════════════════${NC}"
echo ""
echo "  URL:    http://localhost:3000"
echo "  First visit will ask you to create a password."
echo ""

npm start
