# Production Hardening — Design

**Status:** Approved, ready for implementation plan
**Date:** 2026-04-16

## Goal

Make DevTodo reliable for long-term self-hosted production use on a lightweight VPS: structured logging with rotation, security headers, brute-force protection, process management that survives SSH disconnects, and pinned Node version to prevent native-module ABI mismatches.

## Non-goals

- CSRF tokens (sameSite cookies are sufficient; would complicate future mobile app)
- API key auth for non-browser clients (defer until mobile app exists)
- Centralized log shipping (Loki, CloudWatch, etc.) — local files only
- fail2ban integration (user adds on their own)
- `HOST` env var for bind address (always `0.0.0.0`)
- Caddy auto-configuration (README documentation only, no config files in repo)
- Any hardcoded real domains in committed files

## Design decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Node version | Pin to 20 via engines + .nvmrc |
| Logging | Winston, full structured, replace all console.log/warn/error |
| Log rotation | Daily, 30 day retention, 20MB max per file, gzip old |
| Log level | Configurable via `LOG_LEVEL` env var, default `info` (prod) / `debug` (dev) |
| Rate limiting | Auth endpoints only (`/api/auth/*`), 10 req per 15 min per IP |
| Security headers | Helmet with CSP disabled (SPA compatibility) |
| CORS | `ALLOWED_ORIGINS` env var, default `*` (mobile-app friendly) |
| PM2 | Auto-install globally in `run.sh`, start via `ecosystem.config.js` |
| Server bind | Explicit `0.0.0.0` in `app.listen` |
| Graceful shutdown | SIGTERM/SIGINT handlers, 10s force-kill timeout |
| Caddy | README docs only, placeholder domain, multi-app pattern shown |

## Architecture

### 1. Node Version Pin

**Files changed:**
- `package.json` — add `"engines": { "node": ">=20.0.0 <21.0.0" }`
- `server/package.json` — same
- Create `.nvmrc` — contents: `20`

No changes to `run.sh` (already checks Node 20+), Dockerfile (already `node:20-alpine`), or workflow (already `node-version: '20'`).

### 2. Structured Logging (Winston)

**New prod dependencies** (in `server/package.json`):
- `winston`
- `winston-daily-rotate-file`

**New file: `server/src/lib/logger.ts`**

Creates and exports a singleton Winston logger instance.

Transports:
1. **Console** — colorized human-readable in dev (`NODE_ENV !== 'production'`), JSON in production. Includes timestamp + level + message + any metadata.
2. **DailyRotateFile** (`./logs/app-%DATE%.log`) — JSON format, all levels at or above configured level.
   - Rotation: daily
   - Max files: 30 days (`maxFiles: '30d'`)
   - Max size: 20MB per file (`maxSize: '20m'`)
   - Compress rotated files: `zippedArchive: true`
3. **DailyRotateFile** (`./logs/error-%DATE%.log`) — errors only, same rotation policy.

Log levels (Winston defaults): `error` (0), `warn` (1), `info` (2), `http` (3), `verbose` (4), `debug` (5).

Default level: `process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug')`.

**New file: `server/src/middleware/requestLogger.ts`**

Express middleware applied early in the chain. Logs every HTTP request at the `http` level:

```json
{ "level": "http", "message": "request", "method": "GET", "path": "/api/todos", "status": 200, "duration": 12, "ip": "1.2.3.4" }
```

Skips `/api/health` to avoid log noise from monitoring polls.

Implementation: wraps `res.on('finish', ...)` to capture status code and duration after the response completes. Uses `req.ip` for the client address.

**Console.log migration** — 10 calls across 6 files to replace:

| File | Line(s) | Current | Replacement |
|---|---|---|---|
| `index.ts` | 63 | `console.log("[devtodo] server running...")` | `logger.info("server running", { port: PORT })` |
| `db/migrate.ts` | 11, 13, 26 | `console.log("[devtodo] running migrations...")` etc. | `logger.info("running migrations")` etc. |
| `middleware/auth.ts` | 8, 19 | `console.error/warn` for JWT issues | `logger.error/warn` with structured context |
| `lib/recurring.ts` | 58, 61, 66 | `console.log/error` for recurring generation | `logger.info/error` with template context |
| `routes/upload.ts` | 53 | `console.error("Upload failed:", err)` | `logger.error("upload failed", { error: err.message })` |

**Directory:** `run.sh` updated to `mkdir -p data uploads logs`.

**`.gitignore`:** Add `logs/`.

### 3. Security Middleware

**New prod dependencies** (in `server/package.json`):
- `helmet`
- `express-rate-limit`

**Helmet** — applied early in `index.ts`, before routes:

```typescript
import helmet from "helmet";

app.use(helmet({
  contentSecurityPolicy: false,       // SPA serves its own inline scripts/styles
  crossOriginEmbedderPolicy: false,   // don't block cross-origin resources
}));
```

**CORS tightening** — replace current `cors({ origin: true })`:

```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.trim();
app.use(cors({
  origin: (!allowedOrigins || allowedOrigins === '*') ? true : allowedOrigins.split(',').map(s => s.trim()),
  credentials: true,
}));
```

New env var `ALLOWED_ORIGINS`, default `*`. When the mobile app ships, the user adds its origin. No code change needed.

**New file: `server/src/middleware/rateLimiter.ts`**

```typescript
import rateLimit from "express-rate-limit";
import { logger } from "../lib/logger.js";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minutes
  max: 10,                       // 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, try again later" },
  handler: (req, res, _next, options) => {
    logger.warn("rate limit exceeded", { ip: req.ip, path: req.path });
    res.status(429).json(options.message);
  },
});
```

Applied in `index.ts`:

```typescript
app.use("/api/auth", authLimiter, authRouter);
```

### 4. Server Bind + Graceful Shutdown

**Bind address** — make explicit in `index.ts`:

```typescript
const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info("server running", { port: PORT, host: "0.0.0.0" });
});
```

**Graceful shutdown** — add to `index.ts`:

```typescript
function shutdown(signal: string) {
  logger.info(`received ${signal}, shutting down gracefully`);
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

### 5. PM2 Integration

**`run.sh` changes** — replace the final `exec node server/dist/index.js` with:

```bash
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

Key behaviors:
- Auto-installs PM2 globally if missing
- Idempotent: restarts if `devtodo` process exists in PM2, starts fresh if not
- `pm2 save` persists the process list for reboot recovery
- No `exec` — PM2 daemonizes, `run.sh` exits and returns to shell
- Prints useful commands

**`ecosystem.config.js` update:**

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

Changes from current:
- Remove `node_args: "--env-file=.env"` (dotenv handles env loading inside the app)
- Remove `time: true` (replaced by `log_date_format`)
- Point PM2 log files to `./logs/` (alongside Winston logs)

**`scripts/package-release.sh` update** — add `ecosystem.config.js` to the tarball:

```bash
cp ecosystem.config.js "${STAGING_DIR}/ecosystem.config.js"
```

### 6. README Updates

**Reverse proxy section** — replace with full Caddy install from official repo + multi-app-friendly Caddyfile using `your-domain.com` placeholder.

**New PM2 section** after "Updating":

```markdown
### Process management (PM2)

`run.sh` auto-installs PM2 and starts DevTodo as a background process. Useful commands:

    pm2 status              # see running processes
    pm2 logs devtodo        # tail logs
    pm2 restart devtodo     # restart after config change
    pm2 stop devtodo        # stop the app

To auto-start on reboot (run once):

    pm2 startup
    # Follow the printed command, then:
    pm2 save
```

**Configuration table** — add `LOG_LEVEL` and `ALLOWED_ORIGINS` rows.

### 7. .env.example + run.sh .env heredoc

Update both to include:

```
LOG_LEVEL=info
ALLOWED_ORIGINS=*
```

## Middleware order in index.ts

Final order (top to bottom):

1. `helmet()` — security headers first
2. `cors()` — with ALLOWED_ORIGINS
3. `express.json()` — body parsing
4. `cookieParser()` — cookie parsing
5. `requestLogger` — logs every request (after body is parsed)
6. `/api/health` — health endpoint (no auth, not rate-limited)
7. Static uploads serving
8. `/api/auth` with `authLimiter` — rate-limited auth routes
9. All other `/api/*` routes — behind `requireAuth`
10. SPA static serving + catch-all

## New files summary

| File | Purpose |
|---|---|
| `server/src/lib/logger.ts` | Winston logger singleton |
| `server/src/middleware/requestLogger.ts` | HTTP request logging middleware |
| `server/src/middleware/rateLimiter.ts` | Auth endpoint rate limiter |
| `.nvmrc` | Node version for nvm |

## Modified files summary

| File | Changes |
|---|---|
| `package.json` | Add engines field |
| `server/package.json` | Add engines + 4 new dependencies |
| `server/src/index.ts` | Middleware order, graceful shutdown, explicit bind, logger |
| `server/src/db/migrate.ts` | console.log → logger |
| `server/src/middleware/auth.ts` | console.error/warn → logger |
| `server/src/lib/recurring.ts` | console.log/error → logger |
| `server/src/routes/upload.ts` | console.error → logger |
| `ecosystem.config.js` | PM2 log paths, remove --env-file |
| `scripts/run.sh` | PM2 install + start, mkdir logs |
| `scripts/package-release.sh` | Copy ecosystem.config.js into tarball |
| `.env.example` | Add LOG_LEVEL, ALLOWED_ORIGINS |
| `.gitignore` | Add logs/ |
| `README.md` | PM2 section, Caddy section, config table updates |

## Mobile app compatibility notes

These decisions keep the door open for a future mobile app:
- `ALLOWED_ORIGINS=*` by default — mobile app can call the API from any origin
- No CSRF tokens — cookie-based auth with sameSite handles browser CSRF; mobile app can use the same JWT cookie or a future bearer-token flow
- CORS credentials enabled — withCredentials/cookies work cross-origin
- Rate limiting is generous (10 per 15 min on auth only) — won't interfere with app login
- No IP-based session binding or device fingerprinting — clean JWT flow
- Structured JSON logs make it easy to add a future `/api/admin/logs` endpoint

## Security considerations

- Helmet adds standard HTTP hardening headers (HSTS, X-Frame-Options, etc.)
- CSP intentionally disabled — SPA inlines scripts/styles; enabling CSP would require nonce generation which adds complexity for minimal gain on a single-user app
- Rate limiter uses in-memory store — resets on server restart, which is acceptable for a single-instance app. If the app ever scales to multiple instances, switch to `rate-limit-redis`.
- JWT secret generation unchanged (openssl rand -hex 32, 256 bits entropy)
- Passwords unchanged (bcrypt, 12 rounds)
- All log files are local to the server — no secrets logged (request bodies are not logged, only method/path/status/duration/IP)
