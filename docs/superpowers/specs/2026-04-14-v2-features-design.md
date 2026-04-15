# DevTodo v2 Features — Design Spec

## Features

### 1. Sidebar Calendar with Heat Map

**Toggle**: Button in header + `C` keyboard shortcut. Slides in from left (~280px).

**Monthly grid**: 7-column calendar, current month by default.
- Day cells color-coded by completion ratio:
  - No tasks: neutral bg
  - Partial completion: indigo at 25%/50%/75% opacity
  - All completed: green
  - None done (overdue): amber
- Hover tooltip: "X/Y completed"
- Click date → load that day's todos in main list
- Today highlighted with primary ring
- "Back to today" button when viewing past date
- Left/right arrows to navigate months

**API**: `GET /api/todos/calendar?month=YYYY-MM` returns `{ [date]: { total, completed } }`

**Files**:
- `client/src/components/CalendarSidebar.tsx` — sidebar with monthly grid
- `server/src/routes/todos.ts` — add calendar endpoint

### 2. Image Controls in Editor

Floating toolbar on selected image (TipTap BubbleMenu):
- Delete button (remove from editor)
- Size toggle: small (50%) / medium (75%) / full width (100%)

**Files**:
- `client/src/components/RichTextEditor.tsx` — add BubbleMenu for images

### 3. File Attachment Support

- "Attach" button in editor toolbar
- Accept all file types, 25MB limit
- Non-image files render as download cards (filename + size + icon)
- Custom TipTap node `FileAttachment`

**Files**:
- `client/src/components/RichTextEditor.tsx` — file attach button + custom node
- `server/src/routes/upload.ts` — accept all file types

### 4. Global N-Key Focus Fix

Move `N` key handler from TodoList's local keydown to App.tsx's global handler (same pattern as `T` for theme).

**Files**:
- `client/src/App.tsx` — add N to global handler

### Bug Fixes (already applied)

- List bullet/number markers now visible
- Font contrast improved (--text-secondary, --text-muted, --text-dim bumped up)
- TipTap caching fixed (editor content updates when switching todos via todoId prop)
- Amber backlog text color fixed for dark mode
