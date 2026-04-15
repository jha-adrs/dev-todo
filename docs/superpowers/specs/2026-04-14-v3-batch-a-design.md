# DevTodo v3 Batch A — Core Feature Additions

## Overview

Four features that extend the core todo data model: tags/labels, recurring todos, snooze, and pinned/drag-reorder. These are the foundation for a developer todo app that handles real daily workflows.

## Feature 1: Tags/Labels

### Data Model

**New table: `tags`**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PK autoincrement |
| name | TEXT | Unique, max 30 chars |
| color | TEXT | Hex color, e.g. #ef4444 |
| createdAt | TEXT | ISO timestamp |

**New junction table: `todo_tags`**
| Column | Type | Notes |
|--------|------|-------|
| todoId | INTEGER | FK → todos.id, ON DELETE CASCADE |
| tagId | INTEGER | FK → tags.id, ON DELETE CASCADE |

Composite PK on (todoId, tagId).

### API
- `GET /api/tags` — list all tags with usage count
- `POST /api/tags` — create tag `{ name, color }`
- `PATCH /api/tags/:id` — update name or color
- `DELETE /api/tags/:id` — delete tag (removes from all todos)
- `POST /api/todos/:id/tags` — set tags `{ tagIds: [1, 2] }` (replaces all)
- Todos GET responses include `tags: [{ id, name, color }]` array

### Color Palette
10 preset colors to cycle through on auto-create:
`#ef4444` (red), `#f97316` (orange), `#eab308` (yellow), `#22c55e` (green), `#06b6d4` (cyan), `#3b82f6` (blue), `#8b5cf6` (violet), `#d946ef` (pink), `#6b7280` (gray), `#78716c` (stone)

### UI
- **TodoItem**: small colored dot chips after the title, max 3 visible + "+N" overflow
- **DetailPanel**: tag selector — text input with autocomplete dropdown. Type a new name → auto-create with next palette color. Click existing tag to remove.
- **TodoList**: filter bar appears when any tag exists. Click a tag chip to filter. Active filters shown as pills with X to remove.
- **Settings**: tag management section — list all tags with color swatch, rename inline, change color via picker, delete with confirmation

### Files
- `server/src/db/schema.ts` — add tags + todo_tags tables
- `server/src/routes/tags.ts` — tag CRUD
- `server/src/routes/todos.ts` — include tags in responses, tag assignment endpoint
- `client/src/components/TagChip.tsx` — colored tag pill component
- `client/src/components/TagSelector.tsx` — autocomplete tag input for detail panel
- `client/src/components/TagFilter.tsx` — filter bar for todo list

---

## Feature 2: Recurring Todos

### Data Model

**New table: `recurring_templates`**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PK autoincrement |
| title | TEXT | Template title |
| description | TEXT | Template description (HTML) |
| priority | TEXT | Default priority |
| tagIds | TEXT | JSON array of tag IDs |
| schedule | TEXT | Cron expression (e.g., `0 0 * * 1-5`) |
| scheduleLabel | TEXT | Human label (e.g., "Weekdays") |
| enabled | INTEGER | 0 or 1 |
| lastGenerated | TEXT | Date string of last generation |
| createdAt | TEXT | ISO timestamp |

### Schedule Options
Human-friendly presets that map to cron expressions:
- **Every day**: `0 0 * * *`
- **Weekdays (Mon-Fri)**: `0 0 * * 1-5`
- **Weekends**: `0 0 * * 0,6`
- **Specific days**: e.g., Monday + Wednesday + Friday → `0 0 * * 1,3,5`
- **Monthly on Nth**: e.g., 1st of every month → `0 0 1 * *`
- **Custom cron**: advanced input for power users

### Generation Logic
On server startup, call `generateRecurringTodos()`:
1. Get all enabled templates where `lastGenerated < today` (or null)
2. For each, parse cron and check if today matches
3. If match, create a new todo with the template's title, description, priority, tags
4. Update `lastGenerated` to today

Use `cron-parser` npm package for cron evaluation.

### API
- `GET /api/recurring` — list all templates
- `POST /api/recurring` — create template
- `PATCH /api/recurring/:id` — update template
- `DELETE /api/recurring/:id` — delete template
- `POST /api/recurring/:id/generate` — manually trigger generation (for testing)

### UI
- **Recurring page**: accessible from Cmd+K or Settings. List of templates with enable/disable toggle, schedule label, last generated date.
- **Create/edit form**: title, description (TipTap editor), priority selector, tag selector, schedule picker (preset buttons + custom cron input), enable toggle.
- **TodoList**: recurring-generated todos look identical to manual ones. No special badge needed — they're just regular todos.

### Files
- `server/src/db/schema.ts` — add recurring_templates table
- `server/src/routes/recurring.ts` — CRUD + generation
- `server/src/lib/recurring.ts` — generation logic with cron parsing
- `client/src/components/RecurringPage.tsx` — template management UI
- `client/src/components/SchedulePicker.tsx` — human-friendly cron picker

---

## Feature 3: Snooze

### Data Model

**New column on `todos`:**
| Column | Type | Notes |
|--------|------|-------|
| snoozedUntil | TEXT | Date string (YYYY-MM-DD), nullable |

### Behavior
- When `snoozedUntil` is set and > today: todo is hidden from the current view
- When `snoozedUntil` <= today: todo reappears. Treated like a backlog item with a "Snoozed" badge instead of "Overdue"
- Snoozed todos have their own section in the list, separate from backlog

### API
- `PATCH /api/todos/:id` — accepts `snoozedUntil` field
- `GET /api/todos` — filters out snoozed items from today. Returns new `snoozed: number` count in response.
- New response shape: `{ today: [...], backlog: [...], snoozedCount: number }`

### UI
- **DetailPanel**: "Snooze" button next to status toggle. Opens a small popover with quick options:
  - Tomorrow
  - Next Monday
  - In 3 days
  - Pick a date (date input)
  - Unsnooze (if currently snoozed)
- **TodoList header**: if snoozedCount > 0, show "N snoozed" as a small clickable badge. Click to show/hide snoozed items in a collapsed section.
- **Snoozed badge**: gray with clock icon, shows "Snoozed until Apr 18" in mono font

### Files
- `server/src/db/schema.ts` — add snoozedUntil column
- `server/src/routes/todos.ts` — filter snoozed, return count
- `server/src/lib/backlog.ts` — exclude snoozed from backlog, handle unsnoozed items
- `client/src/components/SnoozePopover.tsx` — quick snooze date picker
- `client/src/components/DetailPanel.tsx` — add snooze button
- `client/src/components/TodoList.tsx` — snoozed section

---

## Feature 4: Pinned Todos + Drag Reorder

### Data Model

**New columns on `todos`:**
| Column | Type | Notes |
|--------|------|-------|
| pinned | INTEGER | 0 or 1, default 0 |
| sortOrder | INTEGER | Default 0. Lower = higher in list |

### Behavior
- Pinned todos always appear at the top of today's list, above unpinned
- Within pinned and unpinned groups, sort by `sortOrder` ASC, then `createdAt` DESC
- Drag reorder updates `sortOrder` for all affected items in one batch

### API
- `PATCH /api/todos/:id` — accepts `pinned` boolean
- `POST /api/todos/reorder` — accepts `{ items: [{ id, sortOrder }] }`. Batch update.
- `GET /api/todos` — returns todos sorted: pinned first (by sortOrder), then unpinned (by sortOrder, then createdAt desc)

### UI
- **TodoItem**: small pin icon (📌) appears on hover, left of delete button. Click to toggle. Pinned items have a subtle left border in primary color.
- **Drag handle**: small grip icon (⠿) on the far left of each TodoItem. Drag to reorder.
- **Drop animation**: item slides into new position with layout animation (Motion)
- **Library**: `@dnd-kit/core` + `@dnd-kit/sortable` for accessible drag-and-drop

### Files
- `server/src/db/schema.ts` — add pinned + sortOrder columns
- `server/src/routes/todos.ts` — reorder endpoint, updated sorting
- `server/src/lib/backlog.ts` — updated sort logic
- `client/src/components/TodoItem.tsx` — pin icon, drag handle
- `client/src/components/TodoList.tsx` — DndContext wrapper, sortable items

---

## Batch B (future spec)
- Quick notes/scratchpad
- Templates (reusable todo structures)

---

## Verification Plan
1. Create tags, assign to todos, filter by tag, delete tag — verify cascade
2. Create recurring template with "Weekdays" schedule. Restart server on a weekday — verify todo created. Restart again same day — no duplicate.
3. Snooze a todo until tomorrow. Verify it disappears. Advance date — verify it reappears with "Snoozed" badge.
4. Pin a todo — verify it stays at top. Drag reorder 3 items — verify order persists on refresh.
5. All features work in both dark and light mode
6. Mobile: pin/snooze accessible from detail panel, drag works with touch
