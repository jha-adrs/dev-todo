# Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden DevTodo for long-term self-hosted production: structured logging (Winston + rotation), security middleware (Helmet + rate-limit + CORS whitelist), PM2 process management, graceful shutdown, and pinned Node version.

**Architecture:** Winston logger singleton replaces all `console.log/warn/error` calls; Helmet + `express-rate-limit` added as middleware in `index.ts`; `run.sh` auto-installs and delegates to PM2 instead of bare `node`; `ecosystem.config.js` updated to point logs to `./logs/`; README updated with Caddy reverse proxy docs and PM2 commands.

**Tech Stack:** Winston, winston-daily-rotate-file, helmet, express-rate-limit, PM2 (global), existing Express + TypeScript stack.

**Reference spec:** `docs/superpowers/specs/2026-04-16-production-hardening-design.md`

---

## File Structure

### New files
| File | Responsibility |
|---|---|
| `server/src/lib/logger.ts` | Winston logger singleton — console + daily-rotate-file transports |
| `server/src/middleware/requestLogger.ts` | Express middleware logging every HTTP request |
| `server/src/middleware/rateLimiter.ts` | Auth-endpoint rate limiter |
| `.nvmrc` | Node version for nvm |

### Modified files
| File | Changes |
|---|---|
| `package.json` | Add `engines` field |
| `server/package.json` | Add `engines` + 4 new prod deps |
| `server/src/index.ts` | Rewrite: new middleware order, helmet, CORS, request logger, graceful shutdown, explicit bind |
| `server/src/db/migrate.ts` | `console.log` → `logger.info` (3 calls) |
| `server/src/middleware/auth.ts` | `console.error/warn` → `logger.error/warn` (2 calls) |
| `server/src/lib/recurring.ts` | `console.log/error` → `logger.info/error` (3 calls) |
| `server/src/routes/upload.ts` | `console.error` → `logger.error` (1 call) |
| `ecosystem.config.js` | PM2 log paths to `./logs/`, remove `--env-file` |
| `scripts/run.sh` | PM2 install + start, `mkdir -p logs`, updated `.env` heredoc |
| `scripts/package-release.sh` | Copy `ecosystem.config.js` into tarball |
| `.env.example` | Add `LOG_LEVEL`, `ALLOWED_ORIGINS` |
| `.gitignore` | Add `logs/` |
| `README.md` | Caddy section, PM2 section, config table updates |

---

## Task 0: Setup feature branch

- [ ] **Step 1: Create branch**

```bash
git checkout main
git checkout -b feat/production-hardening
```

- [ ] **Step 2: Verify clean state**

```bash
git status
```

Expected: clean working tree on `feat/production-hardening`.

---

## Task 1: Pin Node version

**Files:**
- Modify: `package.json`
- Modify: `server/package.json`
- Create: `.nvmrc`

- [ ] **Step 1: Add engines to root `package.json`**

In `/Users/adarshjha/claude-projects/dev-todo/package.json`, add after the `"private": true` line:

```json
"engines": {
  "node": ">=20.0.0 <21.0.0"
},
```

- [ ] **Step 2: Add engines to `server/package.json`**

In `/Users/adarshjha/claude-projects/dev-todo/server/package.json`, add after `"private": true`:

```json
"engines": {
  "node": ">=20.0.0 <21.0.0"
},
```

- [ ] **Step 3: Create `.nvmrc`**

Create `/Users/adarshjha/claude-projects/dev-todo/.nvmrc` with contents:

```
20
```

- [ ] **Step 4: Verify engines warning**

```bash
node -e "const p = require('./package.json'); console.log(p.engines)"
```

Expected: `{ node: '>=20.0.0 <21.0.0' }`

- [ ] **Step 5: Commit**

```bash
git add package.json server/package.json .nvmrc
git commit -m "chore: pin Node.js 20 via engines field and .nvmrc

Prevents native-module ABI mismatches with better-sqlite3.
Dockerfile and workflow already use Node 20; this catches
npm ci on wrong versions and lets nvm auto-switch."
```

---

## Task 2: Create Winston logger

**Files:**
- Modify: `server/package.json` (add deps)
- Create: `server/src/lib/logger.ts`

- [ ] **Step 1: Install Winston dependencies**

```bash
cd /Users/adarshjha/claude-projects/dev-todo
npm install -w server winston winston-daily-rotate-file
```

Expected: packages added to `server/package.json` dependencies.

- [ ] **Step 2: Verify deps installed**

```bash
grep -E '"winston"' server/package.json
```

Expected: `"winston": "^3...` appears in dependencies.

- [ ] **Step 3: Create `server/src/lib/logger.ts`**

Create `/Users/adarshjha/claude-projects/dev-todo/server/src/lib/logger.ts` with this content:

```typescript
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const isProduction = process.env.NODE_ENV === "production";

const consoleFormat = isProduction
  ? winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    )
  : winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: "HH:mm:ss" }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
        return `${timestamp} ${level}: ${message}${metaStr}`;
      }),
    );

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
);

const appRotateTransport = new DailyRotateFile({
  filename: "logs/app-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "30d",
  zippedArchive: true,
  format: fileFormat,
});

const errorRotateTransport = new DailyRotateFile({
  filename: "logs/error-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "30d",
  zippedArchive: true,
  level: "error",
  format: fileFormat,
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    appRotateTransport,
    errorRotateTransport,
  ],
});
```

- [ ] **Step 4: Verify it compiles**

```bash
cd /Users/adarshjha/claude-projects/dev-todo
npx -w server tsc --noEmit
```

Expected: no errors. If there are type errors for `winston-daily-rotate-file`, install types:

```bash
npm install -w server --save-dev @types/winston-daily-rotate-file
```

(Note: `winston-daily-rotate-file` ships its own types in recent versions — this step may not be needed.)

- [ ] **Step 5: Commit**

```bash
git add server/package.json package-lock.json server/src/lib/logger.ts
git commit -m "feat(logging): add Winston logger with daily rotation

Console transport (colorized dev, JSON prod) + two daily-rotate-file
transports (app + error-only). 30-day retention, 20MB max per file,
gzip archived. Level configurable via LOG_LEVEL env var."
```

---

## Task 3: Create request logger middleware

**Files:**
- Create: `server/src/middleware/requestLogger.ts`

- [ ] **Step 1: Create `server/src/middleware/requestLogger.ts`**

Create `/Users/adarshjha/claude-projects/dev-todo/server/src/middleware/requestLogger.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Skip health checks to avoid log noise from monitoring
  if (req.path === "/api/health") {
    next();
    return;
  }

  const start = Date.now();

  res.on("finish", () => {
    logger.http("request", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      ip: req.ip,
    });
  });

  next();
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx -w server tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/requestLogger.ts
git commit -m "feat(logging): add HTTP request logger middleware

Logs method, path, status, duration, IP at http level.
Skips /api/health to avoid monitoring noise."
```

---

## Task 4: Create rate limiter middleware

**Files:**
- Modify: `server/package.json` (add dep)
- Create: `server/src/middleware/rateLimiter.ts`

- [ ] **Step 1: Install express-rate-limit**

```bash
npm install -w server express-rate-limit
```

- [ ] **Step 2: Create `server/src/middleware/rateLimiter.ts`**

Create `/Users/adarshjha/claude-projects/dev-todo/server/src/middleware/rateLimiter.ts`:

```typescript
import rateLimit from "express-rate-limit";
import { logger } from "../lib/logger.js";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                     // 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, try again later" },
  handler: (req, res, _next, options) => {
    logger.warn("rate limit exceeded", { ip: req.ip, path: req.path });
    res.status(429).json(options.message);
  },
});
```

- [ ] **Step 3: Verify it compiles**

```bash
npx -w server tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/package.json package-lock.json server/src/middleware/rateLimiter.ts
git commit -m "feat(security): add auth rate limiter

10 requests per 15-minute window per IP on /api/auth/*.
Logs rate-limit violations via Winston."
```

---

## Task 5: Replace all console.log/warn/error with logger

**Files:**
- Modify: `server/src/db/migrate.ts`
- Modify: `server/src/middleware/auth.ts`
- Modify: `server/src/lib/recurring.ts`
- Modify: `server/src/routes/upload.ts`

- [ ] **Step 1: Update `server/src/db/migrate.ts`**

Add import at top (after existing imports):

```typescript
import { logger } from "./logger.js";
```

Note: relative path is `./logger.js` because `migrate.ts` is in `server/src/db/` and `logger.ts` is in `server/src/lib/`. Wait — that's wrong. From `db/migrate.ts` to `lib/logger.ts`:

```typescript
import { logger } from "../lib/logger.js";
```

Replace line 11:
```typescript
// OLD: console.log("[devtodo] running migrations...");
logger.info("running migrations");
```

Replace line 13:
```typescript
// OLD: console.log("[devtodo] migrations complete");
logger.info("migrations complete");
```

Replace line 26:
```typescript
// OLD: console.log("[devtodo] seeded default Personal space");
logger.info("seeded default Personal space");
```

- [ ] **Step 2: Update `server/src/middleware/auth.ts`**

Add import at top (after existing imports):

```typescript
import { logger } from "../lib/logger.js";
```

Replace lines 8-11 (the `console.error` block):
```typescript
// OLD:
// console.error(
//   "\n[devtodo] FATAL: JWT_SECRET is missing or too weak.\n" +
//     "Generate a secure secret with: openssl rand -hex 32\n" +
//     "Set it in your .env file or environment.\n",
// );
logger.error("FATAL: JWT_SECRET is missing or too weak. Generate with: openssl rand -hex 32");
```

Replace lines 19-22 (the `console.warn` block):
```typescript
// OLD:
// console.warn(
//   "[devtodo] WARNING: JWT_SECRET not set. Using ephemeral random secret (sessions won't survive restart).\n" +
//     "         Set JWT_SECRET in .env for persistent auth.",
// );
logger.warn("JWT_SECRET not set, using ephemeral random secret (sessions won't survive restart)");
```

- [ ] **Step 3: Update `server/src/lib/recurring.ts`**

Add import at top (after existing imports):

```typescript
import { logger } from "./logger.js";
```

Replace line 58:
```typescript
// OLD: console.log(`[devtodo] generated recurring: "${template.title}"`);
logger.info("generated recurring todo", { title: template.title });
```

Replace line 61:
```typescript
// OLD: console.error(`[devtodo] invalid cron for template ${template.id}:`, err);
logger.error("invalid cron for recurring template", { templateId: template.id, error: (err as Error).message });
```

Replace line 66:
```typescript
// OLD: console.log(`[devtodo] generated ${generated} recurring todo(s)`);
logger.info("recurring generation complete", { count: generated });
```

- [ ] **Step 4: Update `server/src/routes/upload.ts`**

Add import at top (after existing imports):

```typescript
import { logger } from "../lib/logger.js";
```

Replace line 53:
```typescript
// OLD: console.error("Upload failed:", err);
logger.error("upload failed", { error: (err as Error).message });
```

- [ ] **Step 5: Verify no console.log/warn/error remain in server/src/**

```bash
grep -rn 'console\.\(log\|warn\|error\)' server/src/
```

Expected: zero results.

- [ ] **Step 6: Verify it compiles**

```bash
npx -w server tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add server/src/db/migrate.ts server/src/middleware/auth.ts server/src/lib/recurring.ts server/src/routes/upload.ts
git commit -m "refactor(logging): replace all console.log with Winston logger

Migrates 10 console calls across 4 files to structured logger.
Each call now includes typed metadata for audit/debug."
```

---

## Task 6: Rewrite `server/src/index.ts` — middleware, shutdown, bind

This is the biggest change. The entire file gets rewritten with the new middleware order, Helmet, CORS whitelist, request logger, rate-limited auth, graceful shutdown, and explicit 0.0.0.0 bind.

**Files:**
- Modify: `server/package.json` (add helmet)
- Modify: `server/src/index.ts`

- [ ] **Step 1: Install helmet**

```bash
npm install -w server helmet
```

- [ ] **Step 2: Rewrite `server/src/index.ts`**

Replace the entire contents of `/Users/adarshjha/claude-projects/dev-todo/server/src/index.ts` with:

```typescript
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "./lib/logger.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { authLimiter } from "./middleware/rateLimiter.js";
import { runMigrations } from "./db/migrate.js";
import { generateRecurringTodos } from "./lib/recurring.js";
import authRouter from "./routes/auth.js";
import todosRouter from "./routes/todos.js";
import uploadRouter from "./routes/upload.js";
import explorerRouter from "./routes/explorer.js";
import settingsRouter from "./routes/settings.js";
import tagsRouter from "./routes/tags.js";
import recurringRouter from "./routes/recurring.js";
import spacesRouter from "./routes/spaces.js";

dotenv.config();

// Run migrations on startup
runMigrations();

// Generate recurring todos
generateRecurringTodos();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

// ─── Middleware (order matters) ──────────────────────────────────────

// 1. Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// 2. CORS with configurable origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.trim();
app.use(cors({
  origin: (!allowedOrigins || allowedOrigins === "*")
    ? true
    : allowedOrigins.split(",").map((s) => s.trim()),
  credentials: true,
}));

// 3. Body parsing + cookies
app.use(express.json());
app.use(cookieParser());

// 4. Request logging (skips /api/health)
app.use(requestLogger);

// ─── Routes ─────────────────────────────────────────────────────────

// Health check (no auth, not rate-limited)
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Static file serving for uploads
app.use("/uploads", express.static(path.resolve(PROJECT_ROOT, "uploads")));

// Auth routes (rate-limited)
app.use("/api/auth", authLimiter, authRouter);

// Protected routes
app.use("/api/todos", todosRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/explorer", explorerRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/tags", tagsRouter);
app.use("/api/recurring", recurringRouter);
app.use("/api/spaces", spacesRouter);

// Serve client build in production
const clientDist = path.resolve(PROJECT_ROOT, "client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ─── Start server ───────────────────────────────────────────────────

const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info("server running", { port: PORT, host: "0.0.0.0" });
});

// ─── Graceful shutdown ──────────────────────────────────────────────

function shutdown(signal: string) {
  logger.info("shutting down", { signal });
  server.close(() => {
    logger.info("server closed");
    process.exit(0);
  });
  setTimeout(() => {
    logger.error("forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

- [ ] **Step 3: Verify no console calls remain in server/src/**

```bash
grep -rn 'console\.\(log\|warn\|error\)' server/src/
```

Expected: zero results (Task 5 already cleaned the others; this task cleaned `index.ts`).

- [ ] **Step 4: Verify it compiles**

```bash
npx -w server tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Test dev mode**

```bash
npm run dev 2>&1 &
sleep 5
curl -sf http://localhost:3000/api/health
kill %1 2>/dev/null || true
```

Expected: health check returns `{"ok":true,...}`. Console output shows colorized Winston format (not `[devtodo]` prefix anymore).

- [ ] **Step 6: Commit**

```bash
git add server/package.json package-lock.json server/src/index.ts
git commit -m "feat(security): add Helmet, CORS whitelist, rate limiter, graceful shutdown

Rewrites index.ts with hardened middleware order:
1. Helmet (security headers, CSP disabled for SPA)
2. CORS (ALLOWED_ORIGINS env var, default *)
3. Body parsing + cookies
4. Request logger
5. Routes (auth rate-limited at 10/15min/IP)
6. SPA catch-all

Adds graceful shutdown on SIGTERM/SIGINT with 10s timeout.
Binds explicitly to 0.0.0.0."
```

---

## Task 7: Update ecosystem.config.js + PM2 in run.sh

**Files:**
- Modify: `ecosystem.config.js`
- Modify: `scripts/run.sh`

- [ ] **Step 1: Rewrite `ecosystem.config.js`**

Replace the entire contents of `/Users/adarshjha/claude-projects/dev-todo/ecosystem.config.js` with:

```javascript
module.exports = {
  apps: [{
    name: "devtodo",
    cwd: __dirname,
    script: "server/dist/index.js",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    max_memory_restart: "300M",
    env: {
      NODE_ENV: "production",
    },
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    error_file: "./logs/pm2-error.log",
    out_file: "./logs/pm2-out.log",
    merge_logs: true,
  }],
};
```

- [ ] **Step 2: Rewrite `scripts/run.sh`**

Replace the entire contents of `/Users/adarshjha/claude-projects/dev-todo/scripts/run.sh` with:

```bash
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
```

- [ ] **Step 3: Shell-lint both scripts**

```bash
bash -n scripts/run.sh && echo "run.sh syntax OK"
```

Expected: `run.sh syntax OK`.

- [ ] **Step 4: Commit**

```bash
git add ecosystem.config.js scripts/run.sh
git commit -m "feat(ops): integrate PM2 in run.sh with auto-install

run.sh now auto-installs PM2 globally if missing, then starts/restarts
via ecosystem.config.js. App survives SSH disconnect and auto-restarts
on crash. PM2 logs go to ./logs/ alongside Winston logs.

Also adds LOG_LEVEL and ALLOWED_ORIGINS to the .env template in run.sh
and updates mkdir to include logs/."
```

---

## Task 8: Update package-release.sh to include ecosystem.config.js

**Files:**
- Modify: `scripts/package-release.sh`

- [ ] **Step 1: Add ecosystem.config.js copy**

In `/Users/adarshjha/claude-projects/dev-todo/scripts/package-release.sh`, find this block (around line 52):

```bash
cp .env.example "${STAGING_DIR}/.env.example"
echo "${VERSION}" > "${STAGING_DIR}/VERSION"
```

Add after `cp .env.example` line:

```bash
cp ecosystem.config.js "${STAGING_DIR}/ecosystem.config.js"
```

- [ ] **Step 2: Verify script still works**

```bash
bash -n scripts/package-release.sh && echo "syntax OK"
```

Expected: `syntax OK`.

- [ ] **Step 3: Commit**

```bash
git add scripts/package-release.sh
git commit -m "fix(release): include ecosystem.config.js in tarball

PM2 needs this file to start the app. Was missing from
the release packaging script."
```

---

## Task 9: Update .env.example, .gitignore

**Files:**
- Modify: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Update `.env.example`**

In `/Users/adarshjha/claude-projects/dev-todo/.env.example`, append after the `STORAGE_PROVIDER=local` line:

```

# Logging
LOG_LEVEL=info

# CORS (comma-separated origins, or * for all)
ALLOWED_ORIGINS=*
```

- [ ] **Step 2: Update `.gitignore`**

In `/Users/adarshjha/claude-projects/dev-todo/.gitignore`, append:

```
logs/
```

- [ ] **Step 3: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add LOG_LEVEL and ALLOWED_ORIGINS to .env.example, gitignore logs/"
```

---

## Task 10: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the Caddy reverse proxy section**

In `/Users/adarshjha/claude-projects/dev-todo/README.md`, find the section starting at line 107:

```markdown
### Reverse proxy + HTTPS (Caddy, ~5 min)

```bash
sudo apt install caddy
sudo tee /etc/caddy/Caddyfile <<EOF
your-domain.com {
    reverse_proxy localhost:3000
}
EOF
sudo systemctl restart caddy
```

Caddy auto-provisions Let's Encrypt SSL. Done.
```

Replace it entirely with:

```markdown
### Reverse proxy + HTTPS (Caddy, ~5 min)

Install Caddy from the official repo (not `apt install caddy`, which gives an old version):

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Edit `/etc/caddy/Caddyfile`:

```
your-domain.com {
    reverse_proxy localhost:3000
}

# Add more apps on other subdomains — each gets its own cert automatically:
# other-app.your-domain.com {
#     reverse_proxy localhost:4000
# }
```

```bash
sudo systemctl restart caddy
```

Caddy auto-provisions Let's Encrypt SSL for each domain block. Add more `{}` blocks for additional subdomains.
```

- [ ] **Step 2: Add PM2 section after "Updating"**

After the "Updating" section (line ~137), and before `## Configuration`, insert:

```markdown

### Process management (PM2)

`run.sh` auto-installs PM2 and starts DevTodo as a background process. Useful commands:

```bash
pm2 status              # see running processes
pm2 logs devtodo        # tail logs
pm2 restart devtodo     # restart after config change
pm2 stop devtodo        # stop the app
```

To auto-start on reboot (run once):

```bash
pm2 startup
# Follow the printed command, then:
pm2 save
```
```

- [ ] **Step 3: Add new rows to the Configuration table**

In the Configuration table (around line 143), add these rows after the existing `STORAGE_PROVIDER` row:

```markdown
| `LOG_LEVEL` | `info` | Log verbosity: `error`, `warn`, `info`, `http`, `debug` |
| `ALLOWED_ORIGINS` | `*` | Comma-separated CORS origins. `*` allows all (mobile-app friendly). |
```

- [ ] **Step 4: Verify README renders correctly**

```bash
head -170 README.md
```

Expected: Caddy section shows official install, multi-app Caddyfile pattern. PM2 section appears. Config table has new rows. No hardcoded real domains.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add Caddy reverse proxy, PM2 management, new config vars

Caddy section now uses official repo install and shows multi-app
Caddyfile pattern. New PM2 section documents common commands and
reboot persistence. Configuration table adds LOG_LEVEL and
ALLOWED_ORIGINS."
```

---

## Task 11: Integration test — build and run locally

This is the end-to-end verification that everything works together.

- [ ] **Step 1: Full build**

```bash
cd /Users/adarshjha/claude-projects/dev-todo
npm ci
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 2: Start dev mode and verify logging**

```bash
npm run dev 2>&1 &
sleep 5
curl -sf http://localhost:3000/api/health
curl -sf http://localhost:3000/api/auth/status
```

Expected:
- Health check returns `{"ok":true,...}`
- Console shows colorized Winston output (timestamps + levels)
- No `[devtodo]` prefixed console.log output anywhere

- [ ] **Step 3: Verify security headers**

```bash
curl -sI http://localhost:3000/api/health | grep -iE '(x-content-type|x-frame|strict-transport|x-dns|helmet)'
```

Expected: at least `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` appear.

- [ ] **Step 4: Verify rate limiting**

```bash
for i in $(seq 1 12); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"password":"wrong"}')
  echo "Attempt $i: $STATUS"
done
```

Expected: first 10 attempts return `401` (wrong password), attempts 11-12 return `429` (rate limited).

- [ ] **Step 5: Verify logs directory**

```bash
ls -la logs/
```

Expected: `app-YYYY-MM-DD.log` and `error-YYYY-MM-DD.log` files exist with JSON content.

- [ ] **Step 6: Stop dev server**

```bash
kill %1 2>/dev/null || true
```

- [ ] **Step 7: Verify no console.log anywhere in server source**

```bash
grep -rn 'console\.\(log\|warn\|error\)' server/src/
```

Expected: zero results.

---

## Task 12: Push branch and open PR

- [ ] **Step 1: Push**

```bash
git push -u origin feat/production-hardening
```

(If token issues, push manually via `! git push -u https://jha-adrs@github.com/jha-adrs/dev-todo.git feat/production-hardening`)

- [ ] **Step 2: Create PR**

```bash
gh pr create --head feat/production-hardening --base main --title "feat: production hardening — logging, security, PM2" --body "$(cat <<'EOF'
## Summary
- **Winston structured logging** replacing all `console.log` — daily rotation, 30-day retention, JSON in prod
- **Helmet** security headers (CSP disabled for SPA compatibility)
- **CORS whitelist** via `ALLOWED_ORIGINS` env var (default `*`, mobile-app friendly)
- **Rate limiting** on auth endpoints (10 req / 15 min / IP)
- **PM2 auto-install** in `run.sh` — app survives SSH disconnect, auto-restarts on crash
- **Graceful shutdown** on SIGTERM/SIGINT with 10s timeout
- **Node 20 pinned** via engines field + .nvmrc
- **Caddy docs** with official repo install + multi-app Caddyfile pattern
- `ecosystem.config.js` now included in release tarball

## Design doc
`docs/superpowers/specs/2026-04-16-production-hardening-design.md`

## Test plan
- [x] Build succeeds (`npm run build`)
- [x] Dev mode shows Winston formatted logs
- [x] Helmet headers present in curl -I
- [x] Rate limiter returns 429 after 10 auth attempts
- [x] Log files created in logs/
- [x] Zero `console.log` in server/src/
- [ ] Deploy to VPS: `./run.sh` installs PM2, starts app, survives SSH disconnect
- [ ] Caddy reverse proxy serves HTTPS on configured domain

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review

**Spec coverage:**
- Node version pin → Task 1 ✓
- Winston logger + transports + rotation config → Task 2 ✓
- Request logger middleware → Task 3 ✓
- Rate limiter middleware → Task 4 ✓
- Console.log migration (10 calls, 4 files) → Task 5 ✓
- index.ts rewrite (Helmet, CORS, middleware order, bind, graceful shutdown) → Task 6 ✓
- ecosystem.config.js update → Task 7 ✓
- run.sh PM2 integration → Task 7 ✓
- package-release.sh ecosystem copy → Task 8 ✓
- .env.example + .gitignore → Task 9 ✓
- README (Caddy, PM2, config table) → Task 10 ✓
- Integration test → Task 11 ✓
- No hardcoded real domains in any git file → confirmed, all use `your-domain.com` ✓
- Mobile app doors open (CORS `*` default, no CSRF, no device binding) → verified in CORS config ✓

**Placeholder scan:** No TBD, TODO, "fill in later", or "similar to Task N". All code blocks complete.

**Type/name consistency:**
- `logger` import path: `../lib/logger.js` from middleware/routes, `./logger.js` from `lib/recurring.ts` — verified correct
- `authLimiter` named consistently between `rateLimiter.ts` (export) and `index.ts` (import)
- `requestLogger` named consistently between `requestLogger.ts` (export) and `index.ts` (import)
- Winston transport filenames: `logs/app-%DATE%.log`, `logs/error-%DATE%.log` — consistent with `mkdir -p logs` in run.sh and `.gitignore` entry
