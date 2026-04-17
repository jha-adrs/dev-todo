# DevTodo

A daily todo app built for developers. Local-first, keyboard-friendly, self-hostable.

Every todo is scoped to today. Unfinished items roll over as backlog. Multiple workspaces ("spaces") for work, personal, projects. No sprints, no boards — just what you need to ship today.

## Features

**Daily workflow**
- Today-only view with automatic backlog rollover
- Snooze todos to a future date
- Pin important items to the top
- Priority levels (highest → lowest, Jira-style)
- Custom due dates
- Per-day calendar heatmap of completion

**Organization**
- **Workspaces (Spaces)** — multiple isolated todo lists (Work, Personal, etc.) with seamless switching
- **Tags** — colored labels with autocomplete, manage in Settings
- **Recurring todos** — cron-based templates (weekdays, custom schedules)
- **Calendar sidebar** — month grid with completion heatmap, jump to any date

**Editor**
- Rich text descriptions powered by TipTap
- Syntax-highlighted code blocks (lowlight)
- Checklists, lists, blockquotes, links
- Drag-and-drop image upload + file attachments

**UX**
- 6 themes: Dark, Light, Midnight, Nord, Rose Pine, Solarized
- Command palette (`⌘K`) for everything
- Detail panel slides in (50% on desktop, full overlay on mobile)
- Browser notifications for daily summary
- Smooth animations (Motion / Framer Motion)

**Self-hosting**
- SQLite by default (zero config), optional Turso cloud DB
- Pluggable image storage (local filesystem or S3/Cloudflare R2)
- One-command install with or without Docker
- Built-in DB explorer + backup/restore in Settings

## Quick Start

### Download prebuilt release (recommended)

Zero build, ~10 seconds. Requires Node.js 20+ installed on the target machine.

**Linux:**
```bash
# x64 (most VPS providers — Lightsail, DigitalOcean, EC2, Hetzner, etc.)
curl -fsSL https://github.com/jha-adrs/dev-todo/releases/latest/download/devtodo-linux-x64.tar.gz | tar xz
cd devtodo-*-linux-x64 && ./run.sh

# arm64 (Oracle Cloud free tier, AWS Graviton, Lightsail ARM, Raspberry Pi 4+)
curl -fsSL https://github.com/jha-adrs/dev-todo/releases/latest/download/devtodo-linux-arm64.tar.gz | tar xz
cd devtodo-*-linux-arm64 && ./run.sh
```

**macOS:**
```bash
# Apple Silicon (M1/M2/M3/M4)
curl -fsSL https://github.com/jha-adrs/dev-todo/releases/latest/download/devtodo-darwin-arm64.tar.gz | tar xz
cd devtodo-*-darwin-arm64 && ./run.sh

# Intel Mac
curl -fsSL https://github.com/jha-adrs/dev-todo/releases/latest/download/devtodo-darwin-x64.tar.gz | tar xz
cd devtodo-*-darwin-x64 && ./run.sh
```

App starts on **http://localhost:3000**. First visit prompts you to create a password.

SHA256 sums are published alongside each tarball — see the [releases page](https://github.com/jha-adrs/dev-todo/releases/latest).

### With Docker

```bash
git clone https://github.com/jha-adrs/dev-todo.git
cd dev-todo
docker compose up -d
```

App at **http://localhost:3000**. First visit creates your password.

### Without Docker

```bash
git clone https://github.com/jha-adrs/dev-todo.git
cd dev-todo
./setup.sh
```

Requires Node.js 20+. Installs deps, generates a JWT secret, builds, and starts the server.

### Development

```bash
./setup.sh --dev
```

Vite (5173) + Express (3000) with hot reload.

## Deploying to AWS Lightsail (or any VPS)

1. **Spin up** a Lightsail instance (Ubuntu 22.04+, 1GB RAM minimum).
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
4. **Open port 3000** in Lightsail's firewall, or run a reverse proxy.

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

## Configuration

All via env vars (write to `.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | _generated_ | Secret for JWT tokens. `setup.sh` auto-generates one. |
| `PORT` | `3000` | Server port |
| `DB_PROVIDER` | `sqlite` | `sqlite` (local file) or `turso` (cloud) |
| `DB_PATH` | `./data/devtodo.db` | SQLite file path |
| `TURSO_DATABASE_URL` | — | Required if `DB_PROVIDER=turso` |
| `TURSO_AUTH_TOKEN` | — | Required if `DB_PROVIDER=turso` |
| `STORAGE_PROVIDER` | `local` | `local` (filesystem) or `s3` (S3/R2) |
| `LOG_LEVEL` | `info` | Log verbosity: `error`, `warn`, `info`, `http`, `debug` |
| `ALLOWED_ORIGINS` | `*` | Comma-separated CORS origins. `*` allows all (mobile-app friendly). |
| `S3_BUCKET` | — | Bucket name |
| `S3_REGION` | `auto` | Region (`auto` for Cloudflare R2) |
| `S3_ENDPOINT` | — | Custom endpoint (required for R2) |
| `S3_ACCESS_KEY_ID` | — | Access key |
| `S3_SECRET_ACCESS_KEY` | — | Secret key |

## Keyboard Shortcuts

Designed to never collide with browser shortcuts.

| Key | Action |
|-----|--------|
| `⌘K` / `Ctrl+K` | Command palette (everything else accessible from here) |
| `⌘1` – `⌘9` | Switch between spaces |
| `↑` / `↓` | Navigate todo list (when list is focused) |
| `→` or `Enter` | Open focused todo's detail panel |
| `←` | Close detail panel back to list |
| `Space` | Toggle complete on focused todo |
| `Esc` | Close panel or command palette |

## Tech Stack

- **Frontend**: React 19, Vite, TailwindCSS, TipTap, Motion, Lucide icons
- **Backend**: Node.js, Express
- **Database**: SQLite (`better-sqlite3`) by default, optional Turso (`@libsql/client`)
- **ORM**: Drizzle
- **Auth**: bcrypt + JWT in httpOnly cookies
- **Fonts**: General Sans + JetBrains Mono

## Project Structure

```
.
├── client/         # React SPA (Vite)
├── server/         # Express API + serves static client in production
│   ├── src/
│   │   ├── routes/     # Auth, todos, tags, spaces, recurring, upload, etc.
│   │   ├── middleware/ # requireAuth, requireSpace
│   │   ├── db/         # Drizzle schema + migrations
│   │   └── lib/        # backlog logic, recurring generator
│   └── drizzle/    # Generated SQL migrations
├── data/           # SQLite DB (gitignored, persisted via volume)
├── uploads/        # Local image uploads (gitignored, persisted via volume)
├── docker-compose.yml
├── Dockerfile
└── setup.sh        # Bare-metal installer
```

## License

MIT
