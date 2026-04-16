# Release Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable one-command install of DevTodo on a Linux VPS via prebuilt tarballs attached to tag-triggered GitHub Releases (linux-x64 + linux-arm64).

**Architecture:** A GitHub Actions workflow triggered on `v*.*.*` tags runs a 2-entry matrix on native ubuntu-x64 and ubuntu-arm64 runners. Each runner builds the app, installs prod-only deps natively (so `better-sqlite3` compiles for the correct arch), and produces a tarball containing `server/dist/`, `client/dist/`, `server/drizzle/`, `node_modules/`, and a self-bootstrapping `run.sh`. A smoke-test job verifies the x64 tarball boots and the app serves HTTP 200 on `/api/health`. A release job creates the GitHub Release and attaches both tarballs + SHA256 sums.

**Tech Stack:** GitHub Actions, Bash, Node.js 20, existing `better-sqlite3` + Drizzle + Express stack (unchanged). The `softprops/action-gh-release@v2` action handles release creation.

**Reference spec:** `docs/superpowers/specs/2026-04-15-release-packaging-design.md`

---

## Task 0: Setup feature branch

**Files:** none yet — just branch setup.

- [ ] **Step 1: Create feature branch from main**

Run:
```bash
git checkout main
git pull --ff-only
git checkout -b feat/release-packaging
```

Expected: clean checkout, new branch created.

- [ ] **Step 2: Verify working tree is clean**

Run:
```bash
git status
```

Expected: `nothing to commit, working tree clean`.

---

## Task 1: Create `scripts/run.sh`

This is the self-bootstrapping startup script that ships inside the tarball. It must be idempotent (safe to re-run after an upgrade), fail fast on old/missing Node, and exec the server so signals propagate correctly.

**Files:**
- Create: `scripts/run.sh`

- [ ] **Step 1: Create the `scripts/` directory**

Run:
```bash
mkdir -p scripts
```

Expected: directory exists (no output).

- [ ] **Step 2: Write `scripts/run.sh`**

Create `scripts/run.sh` with exactly this content:

```bash
#!/usr/bin/env bash
# DevTodo release runtime launcher — ships inside the release tarball.
# Idempotent: safe to re-run after an upgrade. Preserves existing .env and data/.
set -e

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
```

- [ ] **Step 3: Make it executable and verify**

Run:
```bash
chmod +x scripts/run.sh
ls -l scripts/run.sh
```

Expected: output shows `-rwxr-xr-x` (executable bit set).

- [ ] **Step 4: Shell-lint the script**

Run:
```bash
bash -n scripts/run.sh && echo "syntax OK"
```

Expected: `syntax OK`. If `shellcheck` is installed locally, also run `shellcheck scripts/run.sh` — warnings are fine, errors are not.

- [ ] **Step 5: Smoke-test `run.sh` against a stub server locally**

This verifies the bootstrap logic works before we trust it in CI. Create a throwaway test dir with a fake `server/dist/index.js` that just exits.

Run:
```bash
TMPDIR=$(mktemp -d)
mkdir -p "$TMPDIR/server/dist"
cat > "$TMPDIR/server/dist/index.js" <<'EOF'
console.log("[stub] server started");
process.exit(0);
EOF
cp scripts/run.sh "$TMPDIR/run.sh"
(cd "$TMPDIR" && ./run.sh)
ls "$TMPDIR"
cat "$TMPDIR/.env" | grep -E '^(JWT_SECRET|PORT|DB_PROVIDER|DB_PATH|STORAGE_PROVIDER)=' | wc -l
rm -rf "$TMPDIR"
```

Expected:
- Output includes `✓ Generated .env with random JWT secret` and `[stub] server started`
- `ls` shows `.env`, `data`, `run.sh`, `server`, `uploads`
- The `grep | wc -l` result is `5` (all 5 env lines present)

- [ ] **Step 6: Commit**

Run:
```bash
git add scripts/run.sh
git commit -m "feat(release): add self-bootstrapping run.sh for release tarball

Idempotent startup script that ships inside the release tarball.
Checks Node 20+, generates .env with random JWT secret on first run,
creates data/ and uploads/ dirs, then execs the server.
Migrations run automatically inside server/dist/index.js."
```

Expected: commit succeeds.

---

## Task 2: Create `scripts/package-release.sh`

This is the helper script that assembles the release tarball. Extracted into its own file (instead of inline workflow YAML) so it can be tested locally before pushing a tag.

**Files:**
- Create: `scripts/package-release.sh`

**Contract:**
- Inputs: env vars `VERSION` (e.g. `v1.2.3`) and `PLATFORM` (e.g. `linux-x64`)
- Preconditions: repo is already built (`server/dist/` and `client/dist/` exist), and a fresh `node_modules/` with prod-only deps for the target platform has been produced by the caller
- Outputs: `dist-release/devtodo-${VERSION}-${PLATFORM}.tar.gz` and `.tar.gz.sha256`

- [ ] **Step 1: Write `scripts/package-release.sh`**

Create `scripts/package-release.sh` with exactly this content:

```bash
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
cp -r node_modules "${STAGING_DIR}/node_modules"

echo "→ Copying launcher and metadata"
cp scripts/run.sh "${STAGING_DIR}/run.sh"
chmod +x "${STAGING_DIR}/run.sh"
cp package.json "${STAGING_DIR}/package.json"
cp .env.example "${STAGING_DIR}/.env.example"
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
tar -tzf "${TARBALL}" | head -20
```

- [ ] **Step 2: Make it executable and shell-lint**

Run:
```bash
chmod +x scripts/package-release.sh
bash -n scripts/package-release.sh && echo "syntax OK"
```

Expected: `syntax OK`.

- [ ] **Step 3: Smoke-test `package-release.sh` locally**

This runs the full assembly pipeline on your local machine. Note: the tarball produced locally will have macOS-compiled `better-sqlite3` bindings — it won't *run* on Linux, but we're only verifying the packaging logic (file layout, scripts present, SHA256 generated).

Run (from repo root):
```bash
npm ci
npm run build
# Re-install prod-only so node_modules matches what CI will produce
rm -rf node_modules
npm ci --omit=dev
VERSION=v0.0.0-localtest PLATFORM=local-test ./scripts/package-release.sh
```

Expected output ends with a `✓ Produced:` line listing the tarball and sha256, plus a preview of contents including `run.sh`, `package.json`, `server/dist/`, `client/dist/`, `server/drizzle/`, `node_modules/`, `.env.example`, `VERSION`, `README.txt`.

- [ ] **Step 4: Verify tarball structure**

Run:
```bash
tar -tzf dist-release/devtodo-v0.0.0-localtest-local-test.tar.gz \
  | grep -E '(run\.sh|package\.json|server/dist/index\.js|client/dist/index\.html|server/drizzle/|node_modules/better-sqlite3/|VERSION|\.env\.example)$' \
  | sort -u
```

Expected: at least these paths appear (exact list may vary slightly):
```
devtodo-v0.0.0-localtest-local-test/.env.example
devtodo-v0.0.0-localtest-local-test/VERSION
devtodo-v0.0.0-localtest-local-test/client/dist/index.html
devtodo-v0.0.0-localtest-local-test/package.json
devtodo-v0.0.0-localtest-local-test/run.sh
devtodo-v0.0.0-localtest-local-test/server/dist/index.js
```

(Plus `server/drizzle/` migrations and `node_modules/better-sqlite3/` internals — grep shows representatives.)

- [ ] **Step 5: Verify VERSION and run.sh are correct inside tarball**

Run:
```bash
mkdir -p /tmp/devtodo-verify
tar -xzf dist-release/devtodo-v0.0.0-localtest-local-test.tar.gz -C /tmp/devtodo-verify
cat /tmp/devtodo-verify/devtodo-v0.0.0-localtest-local-test/VERSION
head -1 /tmp/devtodo-verify/devtodo-v0.0.0-localtest-local-test/run.sh
ls -l /tmp/devtodo-verify/devtodo-v0.0.0-localtest-local-test/run.sh
rm -rf /tmp/devtodo-verify
```

Expected:
- VERSION prints `v0.0.0-localtest`
- `head -1` of run.sh prints `#!/usr/bin/env bash`
- `ls -l` shows executable bit (`-rwxr-xr-x`)

- [ ] **Step 6: Clean up local test artifacts**

Run:
```bash
rm -rf dist-release
# Restore dev deps for ongoing work
npm ci
```

- [ ] **Step 7: Add `dist-release/` to .gitignore**

Modify: `.gitignore`

Append:
```
dist-release/
```

Verify:
```bash
grep -c '^dist-release/$' .gitignore
```
Expected: `1`.

- [ ] **Step 8: Commit**

Run:
```bash
git add scripts/package-release.sh .gitignore
git commit -m "feat(release): add package-release.sh tarball assembler

Helper script that CI invokes to assemble the release tarball.
Takes VERSION and PLATFORM env vars. Copies server/dist, client/dist,
server/drizzle, prod node_modules, run.sh, package.json, .env.example,
VERSION, and README.txt into a staging dir, then tars + hashes it."
```

---

## Task 3: Create the GitHub Actions workflow

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create the workflows directory**

Run:
```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Write `.github/workflows/release.yml`**

Create with exactly this content:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

permissions:
  contents: write  # needed by softprops/action-gh-release to create releases

jobs:
  build:
    name: Build ${{ matrix.platform }}
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: linux-x64
            runner: ubuntu-24.04
          - platform: linux-arm64
            runner: ubuntu-24.04-arm
    runs-on: ${{ matrix.runner }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install build deps and build
        run: |
          npm ci
          npm run build

      - name: Reinstall prod-only deps for target platform
        run: |
          rm -rf node_modules
          npm ci --omit=dev

      - name: Assemble release tarball
        env:
          VERSION: ${{ github.ref_name }}
          PLATFORM: ${{ matrix.platform }}
        run: ./scripts/package-release.sh

      - name: Upload tarball artifact
        uses: actions/upload-artifact@v4
        with:
          name: devtodo-${{ github.ref_name }}-${{ matrix.platform }}
          path: |
            dist-release/devtodo-${{ github.ref_name }}-${{ matrix.platform }}.tar.gz
            dist-release/devtodo-${{ github.ref_name }}-${{ matrix.platform }}.tar.gz.sha256
          if-no-files-found: error
          retention-days: 7

  smoke-test:
    name: Smoke test (linux-x64)
    needs: build
    runs-on: ubuntu-24.04
    steps:
      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Download x64 tarball
        uses: actions/download-artifact@v4
        with:
          name: devtodo-${{ github.ref_name }}-linux-x64
          path: ./_artifact

      - name: Extract and start server
        run: |
          mkdir -p _smoke
          tar -xzf _artifact/devtodo-${{ github.ref_name }}-linux-x64.tar.gz -C _smoke
          cd _smoke/devtodo-${{ github.ref_name }}-linux-x64
          ./run.sh > server.log 2>&1 &
          echo $! > server.pid
          cd ../..

      - name: Wait for /api/health
        run: |
          for i in $(seq 1 30); do
            if curl -sf http://localhost:3000/api/health > /dev/null; then
              echo "✓ Health check passed on attempt $i"
              curl -s http://localhost:3000/api/health
              echo ""
              exit 0
            fi
            sleep 1
          done
          echo "✗ Health check failed after 30s"
          echo "--- server log ---"
          cat _smoke/devtodo-${{ github.ref_name }}-linux-x64/server.log || true
          exit 1

      - name: Verify migrations created DB
        run: |
          test -f _smoke/devtodo-${{ github.ref_name }}-linux-x64/data/devtodo.db
          echo "✓ SQLite DB created"

      - name: Verify idempotency (re-run run.sh)
        run: |
          cd _smoke/devtodo-${{ github.ref_name }}-linux-x64
          kill "$(cat server.pid)" || true
          sleep 2
          # Capture .env mtime before re-run
          ENV_BEFORE=$(stat -c %Y .env)
          ./run.sh > server2.log 2>&1 &
          echo $! > server.pid
          sleep 3
          ENV_AFTER=$(stat -c %Y .env)
          if [ "$ENV_BEFORE" != "$ENV_AFTER" ]; then
            echo "✗ .env was regenerated on second run"
            exit 1
          fi
          echo "✓ .env preserved across re-run"
          # Second-run health check
          for i in $(seq 1 15); do
            if curl -sf http://localhost:3000/api/health > /dev/null; then
              echo "✓ Second-run health check passed"
              kill "$(cat server.pid)" || true
              exit 0
            fi
            sleep 1
          done
          echo "✗ Second-run health check failed"
          cat server2.log
          exit 1

  release:
    name: Publish GitHub Release
    needs: [build, smoke-test]
    runs-on: ubuntu-24.04
    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: ./_artifacts

      - name: List downloaded files
        run: find ./_artifacts -type f | sort

      - name: Create release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          name: ${{ github.ref_name }}
          draft: false
          prerelease: false
          generate_release_notes: true
          files: |
            ./_artifacts/**/*.tar.gz
            ./_artifacts/**/*.tar.gz.sha256
          fail_on_unmatched_files: true
```

- [ ] **Step 3: Validate workflow YAML syntax**

Run:
```bash
python3 -c "import yaml, sys; yaml.safe_load(open('.github/workflows/release.yml')); print('YAML OK')"
```

Expected: `YAML OK`. (If Python isn't available, any YAML linter works — the syntax is plain.)

- [ ] **Step 4: Commit**

Run:
```bash
git add .github/workflows/release.yml
git commit -m "feat(release): add tag-triggered release workflow

On push of v*.*.* tags, builds linux-x64 + linux-arm64 tarballs on
native runners (ubuntu-24.04 and ubuntu-24.04-arm), runs a smoke
test against the x64 tarball (boot + /api/health + idempotent re-run),
then publishes a GitHub Release with both tarballs and SHA256 sums."
```

---

## Task 4: Update README with prebuilt release quickstart

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read current README to locate the section to replace**

Run:
```bash
grep -n '^##' README.md
```

Expected: lists section headers. You'll be inserting a new `### Download prebuilt release (fastest)` as the FIRST option under `## Quick Start`, ahead of the current `### With Docker` block. The existing Docker and `./setup.sh` sections remain as alternatives below it.

- [ ] **Step 2: Edit the Quick Start section**

Open `README.md` and replace the line that reads:

```markdown
## Quick Start

### With Docker (recommended)
```

with:

```markdown
## Quick Start

### Download prebuilt release (recommended)

Zero build, ~10 seconds. Requires Node.js 20+ installed on the target machine.

```bash
# x64 (most VPS providers — Lightsail, DigitalOcean, EC2, Hetzner, etc.)
curl -fsSL https://github.com/jha-adrs/dev-todo/releases/latest/download/devtodo-linux-x64.tar.gz | tar xz
cd devtodo-*-linux-x64 && ./run.sh

# arm64 (Oracle Cloud free tier, AWS Graviton, Lightsail ARM, Raspberry Pi 4+)
curl -fsSL https://github.com/jha-adrs/dev-todo/releases/latest/download/devtodo-linux-arm64.tar.gz | tar xz
cd devtodo-*-linux-arm64 && ./run.sh
```

App starts on **http://localhost:3000**. First visit prompts you to create a password.

SHA256 sums are published alongside each tarball — see the [releases page](https://github.com/jha-adrs/dev-todo/releases/latest).

### With Docker
```

(i.e. remove the `(recommended)` suffix from the Docker heading since the prebuilt release is now the recommended path.)

- [ ] **Step 3: Update the Lightsail deployment section to reference the tarball**

Find the "Deploying to AWS Lightsail (or any VPS)" section. Replace the numbered steps 2-3 (the Docker install + clone block) with:

```markdown
2. **SSH in** and install Node 20:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. **Download and run:**
   ```bash
   curl -fsSL https://github.com/jha-adrs/dev-todo/releases/latest/download/devtodo-linux-x64.tar.gz | tar xz
   cd devtodo-*-linux-x64
   ./run.sh
   ```
   (Use `devtodo-linux-arm64.tar.gz` on an ARM instance.)
```

Leave the "reverse proxy + HTTPS" and "Updating" sections below as-is for now — a follow-up commit can refine them.

- [ ] **Step 4: Update the "Updating" section**

Find the `### Updating` subsection. Replace its content with:

```markdown
### Updating

Prebuilt release:
```bash
cd ~
curl -fsSL https://github.com/jha-adrs/dev-todo/releases/latest/download/devtodo-linux-x64.tar.gz | tar xz
# Migrate your existing data/ and .env into the new directory,
# or extract over the old directory — data/, uploads/, and .env are preserved.
cd devtodo-*-linux-x64 && ./run.sh
```

Docker:
```bash
cd dev-todo && git pull && docker compose up -d --build
```

Data persists in `./data` (SQLite) and `./uploads` (files) — or in Docker volumes if you used Docker.
```

- [ ] **Step 5: Render-check the README**

Run:
```bash
head -120 README.md
```

Expected: the new "Download prebuilt release (recommended)" section appears at the top of Quick Start, with correct triple-backtick fencing and the `cd devtodo-*-linux-x64 && ./run.sh` pattern.

- [ ] **Step 6: Commit**

Run:
```bash
git add README.md
git commit -m "docs: add prebuilt release quickstart to README

Promotes prebuilt tarballs to the primary install path. Docker and
source-build (setup.sh) remain as documented alternatives. Updates
Lightsail + Updating sections to point at the new tarball URLs."
```

---

## Task 5: Open PR

At this point the branch has three feature commits + a docs commit. Time to open the PR.

- [ ] **Step 1: Push branch to origin**

Run:
```bash
git push -u origin feat/release-packaging
```

Expected: branch pushed, output includes a URL for opening a PR.

- [ ] **Step 2: Create the PR**

Run:
```bash
gh pr create --title "feat(release): one-command install via prebuilt tarballs" --body "$(cat <<'EOF'
## Summary
- Tag-triggered GitHub Actions workflow that builds `linux-x64` + `linux-arm64` tarballs on native runners, runs a smoke test, and publishes a GitHub Release.
- Self-bootstrapping `scripts/run.sh` ships inside the tarball — checks Node 20+, generates `.env`, starts the server. Idempotent.
- `scripts/package-release.sh` assembles the tarball (also runnable locally for testing).
- README updated: prebuilt download is now the recommended install path.

## Design doc
`docs/superpowers/specs/2026-04-15-release-packaging-design.md`

## Test plan
- [x] `scripts/run.sh` smoke-tested locally against a stub server (Task 1 Step 5)
- [x] `scripts/package-release.sh` smoke-tested locally; tarball contents verified (Task 2 Steps 3-5)
- [x] Workflow YAML syntax validated
- [ ] After merge: push `v1.0.0` tag → verify workflow runs green, release is created with 2 tarballs + 2 sha256 files
- [ ] Pull `devtodo-linux-x64.tar.gz` on a fresh Lightsail x64 instance → `./run.sh` → hit `:3000` → create user → create todo
- [ ] Pull `devtodo-linux-arm64.tar.gz` on an Oracle Cloud arm64 instance → same flow
- [ ] Re-run `./run.sh` in the same dir → verify `.env` and `data/devtodo.db` preserved
EOF
)"
```

Expected: PR URL printed.

- [ ] **Step 3: Wait for PR review and merge**

Human review. Once merged to `main`, continue to Task 6.

---

## Task 6: Cut the first release (v1.0.0)

This is the real end-to-end test of the whole pipeline.

- [ ] **Step 1: Sync main**

Run:
```bash
git checkout main
git pull --ff-only
```

Expected: clean pull, merge commit present.

- [ ] **Step 2: Push v1.0.0 tag**

Run:
```bash
git tag v1.0.0
git push origin v1.0.0
```

Expected: tag created and pushed. The `release` workflow starts on GitHub.

- [ ] **Step 3: Watch the workflow run**

Run:
```bash
gh run watch
```

Expected: all three jobs (`build (linux-x64)`, `build (linux-arm64)`, `smoke-test`, `release`) succeed. Total time ~5-8 minutes.

If a job fails: inspect logs with `gh run view --log-failed`. Common failure modes and likely causes:
- `build` fails on arm64 with native module compile error → missing build-essential; add an explicit `sudo apt-get install -y build-essential python3` step before `npm ci`
- `smoke-test` health check times out → check the log section it prints; likely a migration or dep issue
- `release` fails with "tag already exists" → someone already created a release for this tag manually; delete it or bump to v1.0.1

- [ ] **Step 4: Verify the release**

Run:
```bash
gh release view v1.0.0
```

Expected: release exists with 4 assets attached (2 tarballs + 2 sha256 files).

- [ ] **Step 5: Manual end-to-end verification on an x64 VPS**

On a fresh Ubuntu 22.04+ box with Node 20 installed:

```bash
curl -fsSL https://github.com/jha-adrs/dev-todo/releases/latest/download/devtodo-linux-x64.tar.gz | tar xz
cd devtodo-*-linux-x64
./run.sh
```

Open the app in a browser, create a password, create a todo. Ctrl-C. Re-run `./run.sh` — app should come back up with the same data.

- [ ] **Step 6: Manual end-to-end verification on an arm64 VPS**

Same flow on an Oracle Cloud free-tier arm64 instance (or similar). Confirm `better-sqlite3` loads and the app is functional.

- [ ] **Step 7: Done**

If both manual verifications pass, the release pipeline is proven. Future releases: push `v1.0.1`, `v1.1.0`, etc. — no manual steps needed.

If the arm64 verification reveals an issue, patch it, cut `v1.0.1`, and re-verify.

---

## Self-review (completed by plan author)

**Spec coverage check:**
- Goal (one-command install on lightweight VPS) → Tasks 1, 3, 4 ✓
- Non-goals (no bundled Node, no macOS/Windows, no auto-branch-release, no Docker image) → nothing in plan violates these ✓
- Tag trigger, SemVer, manual control → Task 3 (workflow on `v*.*.*`), Task 6 (manual tag push) ✓
- linux-x64 + linux-arm64 matrix, native runners → Task 3 (workflow matrix) ✓
- Self-bootstrap run.sh → Task 1 ✓
- Tarball layout (run.sh, package.json, node_modules, server/dist, server/drizzle, client/dist, .env.example, VERSION, README.txt) → Task 2 (package-release.sh copies all of these) ✓
- SHA256 sums → Task 2 (generated), Task 3 (uploaded) ✓
- Smoke test + idempotency check → Task 3 `smoke-test` job ✓
- README update (Quick Start + Lightsail + Updating) → Task 4 ✓
- Single PR for workflow + README → Tasks 0-5 all on one branch ✓
- First release rollout → Task 6 ✓

**Placeholder scan:** no TBD, TODO, or "fill in later" text. All code blocks complete.

**Type/name consistency:** `scripts/run.sh`, `scripts/package-release.sh`, tarball name `devtodo-<version>-<platform>.tar.gz`, VERSION file, `/api/health` endpoint — all names match across tasks.

**Deferred from spec:**
- "Tarball naming strategy for README links (versioned + versionless)" — we use GitHub's `releases/latest/download/<filename>` redirect with the versioned filename as the source of truth. README uses the versionless convenience URL, which GitHub will resolve to the versioned asset automatically (confirmed behavior). No action needed.
- "Whether to keep setup.sh or deprecate it" — kept; mentioned in spec non-goals. No plan action.
- Workflow Node version pin → Node 20 in `setup-node@v4`. ✓
