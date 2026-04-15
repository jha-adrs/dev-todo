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

### With Docker (recommended)

```bash
git clone https://github.com/<your-user>/devtodo.git
cd devtodo
docker compose up -d
```

App at **http://localhost:3000**. First visit creates your password.

### Without Docker

```bash
git clone https://github.com/<your-user>/devtodo.git
cd devtodo
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
2. **SSH in** and install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER && newgrp docker
   ```
3. **Clone & start:**
   ```bash
   git clone https://github.com/<your-user>/devtodo.git
   cd devtodo
   echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
   docker compose up -d
   ```
4. **Open port 3000** in Lightsail's firewall, or run a reverse proxy.

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

### Updating

```bash
cd devtodo && git pull && docker compose up -d --build
```

Data persists in Docker volumes (`data` for SQLite, `uploads` for files).

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
