# DevTodo — Developer Daily Todo App

## Overview

A single-user daily todo app built for developers. Todos are scoped to "today" — incomplete items automatically roll over as visually distinct backlog. Clean, minimal UI (Linear/Notion aesthetic) with dark mode default and light toggle. Zero-config local SQLite by default, optional Turso cloud DB. One-command install with or without Docker. Open source, no personal information stored beyond a password hash.

## Core Concepts

### Daily Model
- Every todo is implicitly due "today"
- At the start of each new day, any incomplete todos from prior days become **backlog**
- Backlog items are visually distinct (amber color, "BACKLOG" badge, overdue count)
- Users can complete, delete, or keep backlog items — they persist until resolved
- Completed todos stay visible for the current day, then hidden from default view (still in DB, queryable by date)

### Todo Item
Each todo has:
- **Title** — short, one-line summary
- **Description** — full markdown with TipTap WYSIWYG editor (bold, italic, lists, code blocks with syntax highlighting, links, checkboxes, images)
- **Status** — pending, in_progress, completed
- **Created date** — when it was created
- **Images** — inline in description via drag/drop/paste upload

## Architecture

### Stack
- **Frontend**: React 19 + Vite, TailwindCSS, TipTap editor, Motion (framer-motion)
- **Backend**: Node.js + Express REST API
- **Database**: SQLite via better-sqlite3 (default, zero-config) or Turso/libSQL (optional cloud). Drizzle ORM for both.
- **Auth**: bcrypt + JWT in httpOnly cookies
- **Image storage**: Pluggable — local filesystem by default, configurable S3/Cloudflare R2 via env vars
- **Deployment**: Docker container on Lighthouse instance

### Project Structure
```
dev-todo/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── TodoList.tsx        # Main list view
│   │   │   ├── TodoItem.tsx        # Single todo row
│   │   │   ├── DetailPanel.tsx     # Side panel / full page detail
│   │   │   ├── RichTextEditor.tsx  # TipTap markdown editor
│   │   │   ├── LoginPage.tsx       # Password auth screen
│   │   │   ├── ThemeToggle.tsx     # Dark/light mode switch
│   │   │   ├── CommandPalette.tsx  # Cmd+K command palette
│   │   │   ├── ProgressRing.tsx   # Daily completion SVG ring
│   │   │   └── EmptyState.tsx     # Contextual empty state messages
│   │   ├── hooks/
│   │   │   ├── useTodos.ts         # Todo CRUD + optimistic updates
│   │   │   └── useAuth.ts          # Auth state management
│   │   ├── lib/
│   │   │   ├── api.ts              # Fetch wrapper for backend
│   │   │   └── theme.ts            # Theme persistence (localStorage)
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── index.html
├── server/                  # Express backend
│   ├── src/
│   │   ├── index.ts                # Express app entry
│   │   ├── routes/
│   │   │   ├── auth.ts             # POST /api/auth/login, /logout, /me
│   │   │   ├── todos.ts            # CRUD /api/todos
│   │   │   └── upload.ts           # POST /api/upload (images)
│   │   ├── middleware/
│   │   │   └── auth.ts             # JWT verification middleware
│   │   ├── db/
│   │   │   ├── schema.ts           # Drizzle schema definitions
│   │   │   ├── index.ts            # DB connection factory (SQLite or Turso)
│   │   │   └── migrate.ts          # Migration runner
│   │   ├── lib/
│   │   │   └── backlog.ts          # Daily rollover logic
│   │   └── storage/
│   │       ├── index.ts            # StorageProvider interface + factory
│   │       ├── local.ts            # Local filesystem provider (default)
│   │       └── s3.ts               # S3/R2-compatible provider
│   └── drizzle/                    # Generated migrations
├── setup.sh                     # One-command install script
├── Dockerfile
├── docker-compose.yml
├── package.json                    # Workspace root
├── README.md                       # Public-facing docs
└── .env.example
```

## Database Schema

### users
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key, auto-increment |
| password_hash | TEXT | bcrypt hash |
| created_at | TEXT | ISO timestamp |

Single row — created on first run via setup flow.

### todos
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key, auto-increment |
| title | TEXT | Required, max 200 chars |
| description | TEXT | Rich text content (stored as TipTap HTML) |
| status | TEXT | 'pending' / 'in_progress' / 'completed' |
| created_at | TEXT | ISO timestamp |
| completed_at | TEXT | ISO timestamp, nullable |
| due_date | TEXT | Date string (YYYY-MM-DD), defaults to today |

### images
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key, auto-increment |
| filename | TEXT | Stored filename (UUID-based) |
| original_name | TEXT | Original upload filename |
| mime_type | TEXT | image/png, image/jpeg, etc. |
| size | INTEGER | File size in bytes |
| created_at | TEXT | ISO timestamp |

## API Endpoints

### Auth
- `POST /api/auth/setup` — Create password on first run (only works if no user exists)
- `POST /api/auth/login` — Authenticate, returns JWT in httpOnly cookie
- `POST /api/auth/logout` — Clears cookie
- `GET /api/auth/me` — Check auth status

### Todos
- `GET /api/todos?date=YYYY-MM-DD` — Get todos for a date (defaults to today). Returns `{ today: [...], backlog: [...] }` where backlog = incomplete todos with due_date < today
- `POST /api/todos` — Create todo (title, description, status)
- `PATCH /api/todos/:id` — Update todo fields
- `DELETE /api/todos/:id` — Delete todo

### Upload
- `POST /api/upload` — Upload image (multipart/form-data), returns `{ url: "/uploads/uuid-filename.png" }` (local) or `{ url: "https://..." }` (S3/R2)

## UI Design

### Layout
- Single page app with responsive layout
- **Desktop (>768px)**: Todo list on left. Clicking a todo opens a detail panel on the right taking 50% of viewport width. List remains visible.
- **Mobile (<768px)**: Todo list full width. Clicking a todo opens detail as full-screen overlay with back button.
- Detail panel has an "expand to full page" button for longer editing sessions.

### Visual Design
- **Theme**: Clean, minimal (Linear/Notion inspired). Dark mode default, light mode toggle.
- **Colors**:
  - Primary/active: Indigo (#6366f1)
  - Backlog/overdue: Amber (#f59e0b)
  - Completed: Green (#22c55e)
  - Danger/delete: Red (#ef4444)
  - Dark bg: #111113, cards: #1a1a1d, borders: #2a2a2e
  - Light bg: #fafafa, cards: #ffffff, borders: #e5e7eb
- **Typography**:
  - Headings/content: **Satoshi** (via Fontshare) — geometric, modern, distinctive
  - Dates/meta/code: **JetBrains Mono** — developer-native monospace
  - Date format in mono style: `2026-04-14 // mon`
- **Components**: Rounded corners (6-8px), subtle borders, soft shadows in light mode

### Animations & Micro-Interactions (Motion / framer-motion)

**Completing a todo:**
- Checkbox: scale pop (0 → 1.3 → 1) with green fill, checkmark fades in
- Confetti burst: small ring expands outward from checkbox and fades
- Title: strikethrough line sweeps left-to-right (0.3s ease-out), text color fades to muted
- Row: after 1s delay, row shrinks height and fades out, moves to completed section
- Progress ring: animates to new value (stroke-dashoffset transition)

**Creating a new todo:**
- New row slides in from below (translateY 12px → 0) with fade-in (0.3s)
- Title input auto-focuses with a subtle indigo border glow
- Other rows shift down smoothly (layout animation via Motion's AnimatePresence)

**Deleting a todo:**
- Row slides out to the left (translateX 0 → -100%) with opacity fade (0.25s)
- Remaining rows close the gap smoothly (layout animation)
- Optional: brief red flash on the row before exit

**Opening detail panel:**
- Desktop: panel slides in from right (translateX 100% → 0, 0.3s spring)
- List compresses to 50% width (animated width transition)
- Panel content staggers in: title first, then status, then description (50ms delays)
- Backdrop: subtle dark overlay on the list side

**Closing detail panel:**
- Reverse of open: panel slides right, list expands back
- Quick exit (0.2s) — closing should feel snappier than opening

**Full page expand:**
- Panel width animates from 50% → 100% (0.3s ease)
- List fades out as panel takes over
- Back button slides in from left

**Mobile panel:**
- Slides up from bottom (translateY 100% → 0) as full overlay
- Subtle backdrop blur on list behind
- Swipe down to dismiss (gesture via Motion)

**Page load:**
- Todo rows stagger in from top (50ms delay between each)
- Progress ring draws on with stroke animation
- Header fades in first, then content

**Theme toggle:**
- Smooth color transitions on all themed properties (0.3s)
- Toggle icon rotates (sun ↔ moon)

**Backlog section:**
- Collapsible with rotate animation on chevron
- Backlog items have amber left border that pulses subtly on first load

### Command Palette (Cmd+K)
- Triggered by `Cmd+K` (Mac) / `Ctrl+K` (Windows)
- Overlay with backdrop blur, centered modal
- Fuzzy search across: todo titles, actions (New Todo, Toggle Theme, View Backlog)
- Actions:
  - `N` — New todo
  - `/` — Search todos
  - `T` — Toggle theme
  - `B` — Toggle backlog section
- Arrow keys to navigate, Enter to select, Esc to close
- Results filter as you type with highlight on matching characters

### Progress Ring
- SVG ring in the header area showing daily completion (X/Y tasks)
- Stroke animates smoothly when tasks complete
- Below ring: small dot indicators (green = done, indigo = pending, amber = backlog)
- Text: `75% done today` in Satoshi, `1 remaining // 0 backlog` in JetBrains Mono

### Empty States
- **All tasks completed**: "Zero inbox" with target emoji, green text, mono subtext `all tasks completed // go ship something`
- **Fresh day (no todos yet)**: "New day, clean slate" with coffee emoji, mono subtext `press N to start planning`
- **No backlog**: Backlog section simply hidden (not shown with empty message)

### Keyboard Shortcuts
- `N` — New todo (when not in an input/editor)
- `Cmd+K` / `Ctrl+K` — Command palette
- `Esc` — Close panel / close command palette
- `T` — Toggle theme (when not in an input/editor)
- `J/K` — Navigate up/down in todo list
- `Enter` — Open selected todo detail
- `X` — Toggle complete on focused todo

### Backlog Behavior
- On page load, backend query returns todos split into `today` and `backlog`
- Backlog section appears below today's todos with amber header and chevron toggle
- Each backlog item shows "Overdue by X days" in mono font
- Amber left border on backlog items with subtle pulse on first render
- User can mark backlog items done or they carry forward indefinitely

## Auth Flow
1. **First run**: No user exists. App shows setup screen to create a password.
2. **Login**: Password-only form (no username — single user). On success, JWT set as httpOnly cookie.
3. **Session**: JWT checked on every API request via middleware. 7-day expiry.
4. **Logout**: Clears cookie.

## Rich Text Editor
- **Library**: TipTap (ProseMirror-based)
- **Extensions**: StarterKit (bold, italic, lists, headings), CodeBlockLowlight (syntax highlighting), Link, Image, TaskList (checkboxes), Placeholder
- **Storage**: TipTap HTML stored in DB. TipTap natively outputs/inputs HTML — no lossy markdown conversion needed.
- **Image upload**: Paste/drag triggers upload to `/api/upload`, inserts returned URL into editor.

## Docker Setup
```dockerfile
# Multi-stage: build React → serve with Express
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
COPY --from=builder /app/server/drizzle ./server/drizzle
RUN mkdir -p /app/data /app/uploads
VOLUME ["/app/uploads", "/app/data"]
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
```

```yaml
# docker-compose.yml
services:
  devtodo:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - data:/app/data        # SQLite DB file
      - uploads:/app/uploads  # Uploaded images
    environment:
      - JWT_SECRET=${JWT_SECRET:-changeme-generate-a-real-secret}
      - DB_PROVIDER=sqlite
      - DB_PATH=/app/data/devtodo.db
      - STORAGE_PROVIDER=local
      - PORT=3000
volumes:
  data:
  uploads:
```

Migrations run automatically on server startup — no separate step needed.

## Environment Variables
```
# Required (auto-generated by setup.sh if not provided)
JWT_SECRET=random-secret-string
PORT=3000

# Database (optional — defaults to local SQLite file)
DB_PROVIDER=sqlite                   # "sqlite" | "turso"
DB_PATH=./data/devtodo.db           # Local SQLite path (only for sqlite provider)
# For Turso cloud:
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# Image storage (optional — defaults to local)
STORAGE_PROVIDER=local              # "local" | "s3"
# For S3/R2:
S3_BUCKET=your-bucket
S3_REGION=auto                       # "auto" for R2
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com  # Required for R2
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=xxx
```

## One-Command Install

### Without Docker (bare metal)
```bash
# Clone and run
git clone https://github.com/user/devtodo.git && cd devtodo && ./setup.sh
```

`setup.sh` does:
1. Checks Node.js >= 20 is installed
2. Runs `npm install` (workspaces install both client + server)
3. Generates `.env` with random `JWT_SECRET` if not present
4. Creates `data/` directory for SQLite DB
5. Creates `uploads/` directory for images
6. Runs Drizzle migrations
7. Builds the React frontend (`npm run build`)
8. Starts the server (`npm start`) — app at `http://localhost:3000`

### With Docker
```bash
git clone https://github.com/user/devtodo.git && cd devtodo && docker compose up -d
```

Docker Compose handles everything — build, env, volumes, migrations on startup.

### Development mode
```bash
./setup.sh --dev
# Starts Vite dev server (port 5173) + Express with nodemon (port 3000)
# Hot reload on both frontend and backend changes
```

## README.md Structure

The README is public-facing and should contain:

```
# DevTodo

Daily todo app for developers. Keyboard-first, dark mode, rich text.

[One-line description + screenshot/GIF of the app in action]

## Features
- Daily todos with automatic backlog rollover
- Rich text descriptions (code blocks, checklists, images)
- Command palette (Cmd+K)
- Keyboard-first (J/K navigate, X complete, N new)
- Dark/light theme
- Progress tracking ring
- Responsive — works on mobile

## Quick Start

### One command
[git clone + setup.sh instructions]

### Docker
[docker compose up instructions]

## Configuration
[Table of env vars with defaults and descriptions]

## Self-Hosting
[Guide for deploying on your own server]
- SQLite (default, zero-config)
- Turso (cloud SQLite, optional)
- S3/Cloudflare R2 for images (optional)

## Keyboard Shortcuts
[Table of all shortcuts]

## Tech Stack
[Brief list with links]

## Contributing
[Standard open source contributing section]

## License
MIT
```

**No personal information in the repo** — no names, emails, or identifying info in code, comments, config, or README. Use generic placeholders (`user/devtodo`, `your-db.turso.io`). The auth system stores only a bcrypt password hash — no usernames, emails, or profiles.

## Verification Plan

### Install paths
1a. **Without Docker**: `./setup.sh` completes without errors, generates `.env`, creates `data/` and `uploads/`, starts server
1b. **With Docker**: `docker compose up --build` starts the app, volumes created for data + uploads
2. Visit `localhost:3000` — should see setup screen on first run
3. Create password, get redirected to empty todo list (dark mode) — verify "New day, clean slate" empty state
4. Verify Satoshi + JetBrains Mono fonts load correctly
5. Press `N` — new todo slides in with animation, title input focused
6. Create a todo with title + rich text description including code block and inline image (paste/drag)
7. Verify progress ring shows 0/1, updates after completing
8. Mark todo done — verify checkbox pop, confetti burst, strikethrough sweep, row moves to completed
9. Create 3+ todos, complete some — verify progress ring animates, dot indicators update
10. Click todo row — detail panel slides in at 50% width with staggered content
11. Click expand — full page view animates open
12. Press Esc — panel closes (snappy exit)
13. Delete a todo — verify slide-left exit animation, gap closes smoothly
14. Press `Cmd+K` — command palette opens, fuzzy search works, arrow keys navigate
15. Press `T` — theme toggles smoothly (color transitions), toggle icon rotates
16. Leave a todo incomplete, advance system date — verify amber backlog section with pulse animation
17. Test on mobile viewport (375px) — panel should overlay full screen, swipe down to dismiss
18. Press `J`/`K` to navigate list, `X` to toggle complete, `Enter` to open detail
19. Logout and verify login is required
20. Test with `STORAGE_PROVIDER=s3` env var — verify image uploads work with S3-compatible endpoint
21. Test with `DB_PROVIDER=turso` + Turso URL — verify cloud DB works
22. Verify no personal information in any committed files (no names, emails, hardcoded secrets)
23. Verify README renders correctly on GitHub with accurate instructions
