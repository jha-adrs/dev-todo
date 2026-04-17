#!/usr/bin/env bash
# Assemble a DevTodo release tarball.
# Called by .github/workflows/release.yml (and runnable locally for testing).
#
# Required env vars:
#   VERSION   e.g. v1.2.3
#   PLATFORM  e.g. linux-x64 or linux-arm64
#
# Preconditions:
#   - server/dist/ and client/dist/ exist (from `npm run build`)
#   - node_modules/ contains prod-only deps for the target platform
#     (caller ran `npm ci --omit=dev` on a runner of that arch)
set -euo pipefail

: "${VERSION:?VERSION env var required (e.g. v1.2.3)}"
: "${PLATFORM:?PLATFORM env var required (e.g. linux-x64)}"

# Must run from the repo root — all source paths below are relative.
if [[ ! -f package.json || ! -d server || ! -d client ]]; then
  echo "Error: run this script from the repo root (package.json, server/, client/ must be present)" >&2
  exit 1
fi

STAGING_NAME="devtodo-${VERSION}-${PLATFORM}"
STAGING_DIR="dist-release/${STAGING_NAME}"
TARBALL="dist-release/${STAGING_NAME}.tar.gz"

echo "→ Cleaning dist-release/"
rm -rf dist-release
mkdir -p "${STAGING_DIR}"

echo "→ Copying build artifacts"
mkdir -p "${STAGING_DIR}/server"
cp -r server/dist "${STAGING_DIR}/server/dist"
cp -r server/drizzle "${STAGING_DIR}/server/drizzle"

mkdir -p "${STAGING_DIR}/client"
cp -r client/dist "${STAGING_DIR}/client/dist"

echo "→ Copying node_modules (prod only)"
# cp -R: preserves symlinks as symlinks on both BSD (macOS) and GNU (Linux) cp.
# That means node_modules/client → ../client and node_modules/server → ../server
# survive the copy as symlinks — tar would then follow them and pull the whole
# workspace source tree into the tarball. The `rm -rf` below is what actually
# prevents the leak; the `-R` flag alone is NOT sufficient. Do not remove either.
cp -R node_modules "${STAGING_DIR}/node_modules"
rm -rf "${STAGING_DIR}/node_modules/client" "${STAGING_DIR}/node_modules/server"

echo "→ Copying launcher and metadata"
cp scripts/run.sh "${STAGING_DIR}/run.sh"
chmod +x "${STAGING_DIR}/run.sh"
cp package.json "${STAGING_DIR}/package.json"
cp .env.example "${STAGING_DIR}/.env.example"
cp ecosystem.config.js "${STAGING_DIR}/ecosystem.config.js"
echo "${VERSION}" > "${STAGING_DIR}/VERSION"

cat > "${STAGING_DIR}/README.txt" <<EOF
DevTodo ${VERSION} (${PLATFORM})

Requirements: Node.js 20+ installed on this machine.

Quick start:
  ./run.sh

The app starts on http://localhost:3000.
First visit prompts you to create a password.

Config is in .env (generated on first run).
Your data lives in ./data/ and ./uploads/.
See https://github.com/jha-adrs/dev-todo for docs.
EOF

echo "→ Filtering macOS noise files"
find "${STAGING_DIR}" -name ".DS_Store" -delete

echo "→ Creating tarball"
# Use a deterministic-ish tar: sort entries, fixed mtime would need GNU tar extras.
tar -czf "${TARBALL}" -C dist-release "${STAGING_NAME}"

echo "→ Computing SHA256"
# Portable across Linux (sha256sum) and macOS (shasum -a 256)
if command -v sha256sum >/dev/null 2>&1; then
  (cd dist-release && sha256sum "${STAGING_NAME}.tar.gz") > "${TARBALL}.sha256"
else
  (cd dist-release && shasum -a 256 "${STAGING_NAME}.tar.gz") > "${TARBALL}.sha256"
fi

echo ""
echo "✓ Produced:"
ls -lh "${TARBALL}" "${TARBALL}.sha256"
echo ""
echo "Tarball contents (top level):"
tar -tzf "${TARBALL}" | head -20 || true
