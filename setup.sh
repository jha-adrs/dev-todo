#!/usr/bin/env bash
set -e

# DevTodo Setup Script
# Usage: ./setup.sh [--dev]

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "  ╔══════════════════════════╗"
echo "  ║       DevTodo Setup      ║"
echo "  ╚══════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Install Node.js 20+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}Error: Node.js 20+ is required (found v$(node -v)).${NC}"
    echo "Update from https://nodejs.org"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node -v)"

# Install dependencies
echo -e "${YELLOW}→${NC} Installing dependencies..."
npm install --silent
echo -e "${GREEN}✓${NC} Dependencies installed"

# Generate .env if not present
if [ ! -f .env ]; then
    echo -e "${YELLOW}→${NC} Generating .env..."
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

# Create directories
mkdir -p data uploads
echo -e "${GREEN}✓${NC} data/ and uploads/ directories ready"

# Dev mode
if [ "$1" = "--dev" ]; then
    echo ""
    echo -e "${GREEN}Starting dev servers...${NC}"
    echo "  Client: http://localhost:5173"
    echo "  Server: http://localhost:3000"
    echo ""
    npm run dev
    exit 0
fi

# Production build
echo -e "${YELLOW}→${NC} Building..."
npm run build
echo -e "${GREEN}✓${NC} Build complete"

echo ""
echo -e "${GREEN}══════════════════════════════════${NC}"
echo -e "${GREEN}  DevTodo is ready!${NC}"
echo -e "${GREEN}══════════════════════════════════${NC}"
echo ""
echo "  Start:  npm start"
echo "  URL:    http://localhost:3000"
echo ""
echo "  First visit will ask you to create a password."
echo ""

# Start server
npm start
