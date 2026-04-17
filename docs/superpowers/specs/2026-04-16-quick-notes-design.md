# Quick Notes — Design

**Status:** Approved, ready for implementation
**Date:** 2026-04-16

## Goal

Add a Quick Notes feature to DevTodo — space-scoped notes with rich text and file attachments, accessible via Cmd+K, reusing the existing layout (list on left, detail panel on right).

## Non-goals

- Search within notes
- Note ordering / drag-reorder (updatedAt sorting is enough)
- Markdown export
- Note sharing / collaboration
- Note-specific tags or categories
- Persisting the view state (always land on todos)

## Design decisions

| Decision | Choice |
|---|---|
| Navigation | Separate view, toggled via Cmd+K command palette |
| Scope | Per-space (like todos) |
| Structure | Title + rich body (TipTap HTML) + file attachments via existing upload |
| Layout | Reuse exact same layout — note list replaces todo list, note editor opens in detail panel slot |
| Editor | Reuse existing `RichTextEditor` component (TipTap + drag-and-drop upload) |
| Persistence | SQLite via Drizzle (same as todos) |
| Auto-save | Debounced PATCH on title/content change |

## Data Model

### `notes` table (Drizzle schema)

```typescript
export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  spaceId: integer("space_id").notNull().references(() => spaces.id),
  title: text("title").notNull().default(""),
  content: text("content"),
  pinned: integer("pinned").notNull().default(0),
  archived: integer("archived").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});
```

Scoped to space via `spaceId`. `pinned` and `archived` are 0/1 integers (same pattern as todos). `content` is nullable TipTap HTML. Migration auto-applied on startup via existing `runMigrations()`.

## API

New file: `server/src/routes/notes.ts`
Mounted at `/api/notes` behind `requireAuth` + `requireSpace` middleware (same as todos).

| Method | Path | Body/Query | Response | Notes |
|---|---|---|---|---|
| `GET` | `/api/notes` | `?archived=1` | `Note[]` | Returns notes for current space. Default: non-archived only. Sorted: pinned first, then updatedAt desc. |
| `POST` | `/api/notes` | `{ title?, content? }` | `Note` | Creates note with empty defaults. Returns the new note. |
| `PATCH` | `/api/notes/:id` | `{ title?, content?, pinned?, archived? }` | `Note` | Updates fields. Sets `updatedAt` to now. Returns updated note. |
| `DELETE` | `/api/notes/:id` | — | `{ ok: true }` | Hard delete. |

File attachments use the existing `POST /api/upload` endpoint — no changes needed.

## Frontend

### View switching (`App.tsx`)

New state: `view: "todos" | "notes"` (default `"todos"`, not persisted).

When `view === "notes"`:
- `NoteList` renders in the same slot as `TodoList`
- Clicking a note sets `selectedNoteId` → `NoteDetailPanel` opens in the same right-panel slot as `DetailPanel` (50% width, same slide-from-right animation)
- Calendar sidebar remains toggleable

When `view === "todos"`: unchanged behavior.

Switching view clears any selected todo/note to avoid stale state.

### Command palette (`CommandPalette.tsx`)

Two new actions:
- `"Switch to Notes"` — visible when `view === "todos"`, sets `view: "notes"`
- `"Switch to Todos"` — visible when `view === "notes"`, sets `view: "todos"`

### New hook: `useNotes.ts`

Mirrors `useTodos.ts` pattern:

```typescript
export function useNotes() {
  // State: notes[], loading
  // fetchNotes() — GET /api/notes (re-fetches on spaceId change)
  // createNote() — POST /api/notes, optimistic insert
  // updateNote(id, fields) — PATCH /api/notes/:id, optimistic update
  // deleteNote(id) — DELETE /api/notes/:id, optimistic remove
  // Returns: { notes, loading, createNote, updateNote, deleteNote }
}
```

Scoped to current space via `useSpace()` context (same as useTodos).

### New component: `NoteList.tsx`

Mirrors `TodoList.tsx` structure:

- Header: space name + "New Note" button (creates empty note and selects it)
- Pinned section at top (if any pinned notes)
- Notes sorted by `updatedAt` desc
- Each note row shows:
  - Title (or "Untitled" in muted text if empty)
  - First ~80 chars of plain text preview (strip HTML from content)
  - Relative timestamp ("2 min ago", "yesterday", "3 days ago")
  - Pin indicator if pinned
- Selected note gets the same highlight style as selected todo (accent left border + background)
- Archive toggle in header: "Show archived" checkbox/button
- Keyboard navigation: up/down arrows, Enter to select, same pattern as todo list

### New component: `NoteDetailPanel.tsx`

Mirrors `DetailPanel.tsx` structure:

- Header bar: close button (X), expand/collapse button, note ID
- Editable title: click to edit inline (same pattern as todo title editing)
- `RichTextEditor` component for the body (reused directly — already supports images, files, code blocks, checklists)
- Action buttons row:
  - Pin / Unpin toggle
  - Archive / Unarchive toggle
  - Delete with confirmation (same 3-second confirm pattern as todos)
- Timestamps: "created {date} · edited {relative time}"
- Auto-save: `RichTextEditor` already debounces `onChange` at 500ms — title saves on blur (same as todo title)

### Utility: HTML → plain text for preview

Small helper function (in `NoteList.tsx` or a shared util):

```typescript
function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
}
```

Used to generate the preview snippet in the note list.

## Files summary

### New files
| File | Responsibility |
|---|---|
| `server/src/routes/notes.ts` | Notes CRUD API |
| `client/src/hooks/useNotes.ts` | Notes data hook |
| `client/src/components/NoteList.tsx` | Note list view |
| `client/src/components/NoteDetailPanel.tsx` | Note editor panel |

### Modified files
| File | Changes |
|---|---|
| `server/src/db/schema.ts` | Add `notes` table |
| `server/src/index.ts` | Mount `/api/notes` router |
| `client/src/App.tsx` | Add `view` state, render NoteList/NoteDetailPanel when view=notes |
| `client/src/components/CommandPalette.tsx` | Add "Switch to Notes" / "Switch to Todos" actions |

### Unchanged (reused as-is)
| File | How it's reused |
|---|---|
| `client/src/components/RichTextEditor.tsx` | Embedded in NoteDetailPanel for note body |
| `server/src/routes/upload.ts` | File attachments via existing upload endpoint |
| `server/src/middleware/auth.ts` | requireAuth on notes routes |
| `server/src/middleware/space.ts` | requireSpace on notes routes |

## Mobile app compatibility

- Notes API follows the same REST pattern as todos — a mobile app can consume it identically
- No client-side-only state — everything persists in SQLite via the API
- Space scoping works the same way (space ID in cookie/header)
