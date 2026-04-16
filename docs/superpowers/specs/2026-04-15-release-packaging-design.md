# Release Packaging — Design

**Status:** Approved, ready for implementation plan
**Date:** 2026-04-15

## Goal

Let a user run DevTodo on a 512MB–1GB VPS in ~10 seconds with one command, no build step, no Docker. Shift build cost (TypeScript compile, Vite build, native module compile) from the target machine to CI.

## Non-goals

- Bundling a Node runtime in the tarball (user must have Node 20+ installed)
- macOS / Windows server builds
- Auto-releasing from branches (tag-triggered only, manual control)
- Publishing Docker images (existing `docker-compose.yml` remains for Docker users)
- GPG / cosign signing (SHA256 sums only, for now)
- Per-branch nightly builds
- systemd unit file (add when first user asks)
- In-app auto-update

## User-facing outcome

On a freshly-provisioned Ubuntu box with Node 20+:

```bash
curl -fsSL https://github.com/jha-adrs/dev-todo/releases/latest/download/devtodo-linux-x64.tar.gz | tar xz
cd devtodo-*-linux-x64 && ./run.sh
```

App is running at `http://localhost:3000` in under 10 seconds. First visit prompts password setup.

arm64 equivalent uses `devtodo-linux-arm64.tar.gz`.

## Design decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Release trigger | Git tag matching `v*.*.*`, manual push |
| Platforms | `linux-x64` + `linux-arm64` |
| Node runtime | Assume installed on target (v20+) |
| Versioning | SemVer, `v`-prefixed tags |
| First-run UX | Self-bootstrap (`run.sh` generates `.env`, creates dirs, starts server) |
| CI build strategy | Native arm64 runners (`ubuntu-24.04-arm`) — no QEMU |
| Rollout | Single PR: workflow + README update together |

## Architecture

### CI workflow

Single file: `.github/workflows/release.yml`
Trigger: `push` on tags matching `v*.*.*`
Permissions: `contents: write`

Three jobs:

#### Job 1: `build` (matrix)

Matrix:
- `{ platform: linux-x64, runner: ubuntu-24.04 }`
- `{ platform: linux-arm64, runner: ubuntu-24.04-arm }`

Steps per matrix entry:
1. Checkout
2. Setup Node 20
3. `npm ci` (full install including dev deps)
4. `npm run build` (TS compile + Vite build)
5. In a clean `staging/` directory, `npm ci --omit=dev` to produce a prod-only `node_modules/` with `better-sqlite3` compiled for the runner's native arch
6. Assemble `devtodo-<version>-<platform>/` per layout below
7. Tar + gzip, compute SHA256
8. Upload `devtodo-<version>-<platform>.tar.gz` and `.tar.gz.sha256` as workflow artifacts

Version is derived from the tag: `${GITHUB_REF_NAME}` (e.g. `v1.2.3`).

#### Job 2: `smoke-test`

- Depends on: `build` (x64 only)
- Runner: `ubuntu-24.04`
- Steps:
  1. Download x64 artifact
  2. Extract
  3. Run `./run.sh &` in background
  4. Wait up to 15s for `curl http://localhost:3000/` to return 200
  5. Verify migrations ran (DB file exists at `data/devtodo.db`)
  6. Also re-run `./run.sh` a second time briefly to verify idempotency (no `.env` regeneration, no crash on existing DB)
  7. Kill server, fail job if any step failed

If server lacks a health endpoint, the smoke test hits `/` (served by the static client) or `/api/auth/status` — to be confirmed during implementation. A dedicated `/api/health` endpoint can be added if none exists.

#### Job 3: `release`

- Depends on: `build`, `smoke-test`
- Runner: `ubuntu-24.04`
- Steps:
  1. Download both tarball artifacts + sha256 files
  2. Create GitHub Release via `softprops/action-gh-release@v2` for the pushed tag
  3. Attach all 4 files (2 tarballs + 2 sha256 sums)
  4. Auto-generate release notes from commits since previous tag

### Tarball layout

```
devtodo-v1.2.3-linux-x64/
├── run.sh                     # executable, self-bootstrap + start
├── package.json               # required for ES module resolution
├── node_modules/              # prod deps only, platform-native better-sqlite3
├── server/
│   ├── dist/                  # compiled server JS (from tsc)
│   └── drizzle/               # SQL migrations, auto-applied on startup
├── client/
│   └── dist/                  # Vite build output, served statically by server
├── .env.example               # reference only
├── VERSION                    # plain text "v1.2.3"
└── README.txt                 # 10-line quickstart
```

**Path resolution:** Server code resolves migrations at `server/dist/db/../../drizzle` → `server/drizzle/`, and client at `PROJECT_ROOT/client/dist`. Both match the layout above, so no server code changes are needed.

**Excluded from tarball:** `docker-compose.yml`, `Dockerfile`, `setup.sh`, root `package-lock.json`, `tsconfig.json`, client/server source, dev deps, `.git`, `docs/`, `.env`, `data/`, `uploads/`.

**Size estimate:** ~40–60MB uncompressed, ~15–20MB gzipped.

### `run.sh`

```bash
#!/usr/bin/env bash
set -e

# 1. Check Node 20+
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js not found. Install Node 20+ and re-run."
  exit 1
fi
NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Error: Node.js 20+ required. Current: $(node -v)"
  exit 1
fi

# 2. Generate .env if missing (idempotent)
if [ ! -f .env ]; then
  JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n')
  cat > .env <<EOF
JWT_SECRET=${JWT_SECRET}
PORT=3000
DB_PROVIDER=sqlite
DB_PATH=./data/devtodo.db
STORAGE_PROVIDER=local
EOF
  echo "✓ Generated .env with random JWT secret"
fi

# 3. Ensure data dirs
mkdir -p data uploads

# 4. Exec server (migrations run automatically inside server/dist/index.js)
exec node server/dist/index.js
```

Properties:
- **Idempotent** — safe to re-run; does not clobber `.env` or `data/`
- **Fails fast** on missing/old Node with clear message
- **`exec`** so signals (SIGTERM, Ctrl+C) reach Node directly, not via shell
- **No migration step** — `runMigrations()` is called from `server/src/index.ts` on startup

### Upgrade path

User extracts a newer tarball over their existing install directory (or into a new directory with `data/` and `.env` preserved). Running `./run.sh` applies any new Drizzle migrations automatically. No manual steps.

## README changes

Replace current "Without Docker" section with:

```markdown
### Download prebuilt release (fastest, ~10s)

Requires Node.js 20+ on the target machine.

```bash
# x64 (most VPS providers)
curl -fsSL https://github.com/jha-adrs/dev-todo/releases/latest/download/devtodo-linux-x64.tar.gz | tar xz
cd devtodo-*-linux-x64 && ./run.sh

# arm64 (Oracle free tier, Graviton, Lightsail ARM)
curl -fsSL https://github.com/jha-adrs/dev-todo/releases/latest/download/devtodo-linux-arm64.tar.gz | tar xz
cd devtodo-*-linux-arm64 && ./run.sh
```
```

`setup.sh` and Docker sections remain unchanged as alternatives. Update the "Deploying to AWS Lightsail" section to reference the prebuilt tarball as the primary path, with Docker and source-build called out as alternatives.

**URL behavior:** `/releases/latest/download/devtodo-linux-x64.tar.gz` is a GitHub-provided redirect that always resolves to the latest release's asset matching that filename, regardless of the version embedded in the uploaded artifact. Tarballs are uploaded with version-embedded names (`devtodo-v1.2.3-linux-x64.tar.gz`) so downloaded files are self-identifying, but the README uses the version-less filename via the redirect.

Implementation note: GitHub's `releases/latest/download/<name>` redirect matches on filename. To make this work, we need to either (a) upload both a versioned and a versionless copy, or (b) upload only the versioned copy and update README to use the versioned URL. Deciding between these belongs in the implementation plan; the default will be (a) — upload both — for zero-friction README links.

## Testing strategy

1. **CI smoke test** — described above. Catches broken tarball structure and native-module arch mismatches.
2. **Idempotency** — covered in smoke test (second `./run.sh` run).
3. **Manual arm64 verification** — first release only, on a real arm64 box (Oracle free tier). After that, trust CI.
4. **Upgrade verification** — manual, second release onward. Extract vN tarball, run, stop. Extract vN+1 over the top, run, verify migrations apply and data persists.

No new unit tests. This is pure build/packaging infra.

## Rollout

Single PR contains:

1. New `.github/workflows/release.yml`
2. New `scripts/run.sh` — committed verbatim in the repo, copied into tarball root by the workflow with executable bit set
3. New `scripts/package-release.sh` — helper invoked by the workflow that assembles the staging directory, copies artifacts, and produces the tarball. Having this as a script (not inline YAML) means it can be tested locally before pushing a tag.
4. Updated `README.md` with prebuilt download section
5. Any small code changes required (health endpoint if added)

After merge:

1. Push `v1.0.0` tag → first release built and published
2. Manually verify on Lightsail x64 and one arm64 box
3. If issues: patch + `v1.0.1` tag
4. Communicate via README (already updated in the PR)

## Open questions deferred to implementation plan

- Exact smoke test endpoint (add `/api/health` vs. hit existing route)
- Tarball naming strategy for README links (upload both versioned + versionless, or update README to use versioned URL pattern)
- Whether to keep `setup.sh` or deprecate it (lean: keep — it's the "build from source" path)
- Workflow Node version pin (lean: Node 20.x, match runtime requirement)

## Security considerations

- SHA256 sums published alongside tarballs; README can include a verification example
- No secrets required in workflow beyond the default `GITHUB_TOKEN` (for creating releases)
- `run.sh` generates JWT secret via `openssl rand -hex 32` with `/dev/urandom` fallback — same logic as existing `setup.sh`
- Tarball does not contain any `.env`, data, or uploads from the build environment
