# Themes & Fonts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand DevTodo from 6 to 14 themes and add a font picker (7 sans + 5 mono) with lazy CDN loading of only the selected fonts.

**Architecture:** 8 new CSS theme classes added to `index.css`. A new `fonts.ts` module manages a font registry, CDN `<link>` injection, and localStorage persistence. The inline `<script>` in `index.html` prevents FOUC for both theme and font. Settings page gets two font picker grids matching the existing theme picker pattern.

**Tech Stack:** CSS custom properties, Google Fonts/Fontshare/jsDelivr CDN, localStorage, React (existing).

**Reference spec:** `docs/superpowers/specs/2026-04-16-themes-fonts-design.md`

---

## File Structure

### New files
| File | Responsibility |
|---|---|
| `client/src/lib/fonts.ts` | Font registry, CDN loader, apply/preload functions |

### Modified files
| File | Changes |
|---|---|
| `client/src/index.css` | Add 8 new theme class blocks |
| `client/src/lib/theme.ts` | Add 8 theme entries, update type + class list |
| `client/index.html` | Remove hardcoded font links, expand inline FOUC script |
| `client/src/components/SettingsPage.tsx` | Add font picker grids |

---

## Task 0: Setup feature branch

- [ ] **Step 1: Create branch**

```bash
git checkout main
git checkout -b feat/themes-fonts
```

- [ ] **Step 2: Verify clean state**

```bash
git status
```

Expected: clean working tree on `feat/themes-fonts`.

---

## Task 1: Add 8 new CSS themes

**Files:**
- Modify: `client/src/index.css`

- [ ] **Step 1: Add 8 new theme blocks after the existing `.solarized` block**

In `/Users/adarshjha/claude-projects/dev-todo/client/src/index.css`, find the closing brace of `.solarized` (line 132) and add these blocks immediately after, before the `/* ═══ GLOBAL ═══ */` comment:

```css
.catppuccin {
  --bg: #1e1e2e;
  --bg-card: #181825;
  --bg-elevated: #313244;
  --border: #45475a;
  --border-light: #383a4e;
  --text-primary: #cdd6f4;
  --text-secondary: #bac2de;
  --text-muted: #6c7086;
  --text-dim: #585b70;
}

.dracula {
  --bg: #282a36;
  --bg-card: #21222c;
  --bg-elevated: #343746;
  --border: #44475a;
  --border-light: #3b3d50;
  --text-primary: #f8f8f2;
  --text-secondary: #e2e2dc;
  --text-muted: #6272a4;
  --text-dim: #565761;
}

.tokyonight {
  --bg: #1a1b26;
  --bg-card: #16161e;
  --bg-elevated: #232433;
  --border: #292e42;
  --border-light: #222639;
  --text-primary: #a9b1d6;
  --text-secondary: #9aa5ce;
  --text-muted: #565f89;
  --text-dim: #414868;
}

.gruvbox {
  --bg: #282828;
  --bg-card: #1d2021;
  --bg-elevated: #3c3836;
  --border: #504945;
  --border-light: #45403d;
  --text-primary: #ebdbb2;
  --text-secondary: #d5c4a1;
  --text-muted: #928374;
  --text-dim: #7c6f64;
}

.onedark {
  --bg: #282c34;
  --bg-card: #21252b;
  --bg-elevated: #2c313a;
  --border: #3e4452;
  --border-light: #353b45;
  --text-primary: #abb2bf;
  --text-secondary: #9da5b4;
  --text-muted: #636d83;
  --text-dim: #4b5263;
}

.githubdark {
  --bg: #0d1117;
  --bg-card: #161b22;
  --bg-elevated: #1c2128;
  --border: #30363d;
  --border-light: #262c33;
  --text-primary: #c9d1d9;
  --text-secondary: #b1bac4;
  --text-muted: #8b949e;
  --text-dim: #6e7681;
}

.ayulight {
  --bg: #fafafa;
  --bg-card: #ffffff;
  --bg-elevated: #f3f4f5;
  --border: #e7e8e9;
  --border-light: #eff0f1;
  --text-primary: #5c6166;
  --text-secondary: #787b80;
  --text-muted: #8a9199;
  --text-dim: #acb6bf;
}

.everforest {
  --bg: #2d353b;
  --bg-card: #272e33;
  --bg-elevated: #343f44;
  --border: #475258;
  --border-light: #3d484d;
  --text-primary: #d3c6aa;
  --text-secondary: #c5b899;
  --text-muted: #859289;
  --text-dim: #6e7f77;
}
```

- [ ] **Step 2: Verify CSS parses**

```bash
cd /Users/adarshjha/claude-projects/dev-todo
npx -w client vite build 2>&1 | tail -5
```

Expected: build succeeds (Vite/PostCSS parses the CSS without errors).

- [ ] **Step 3: Commit**

```bash
git add client/src/index.css
git commit -m "feat(themes): add 8 new theme palettes

Catppuccin Mocha, Dracula, Tokyo Night, Gruvbox Dark, One Dark,
GitHub Dark, Ayu Light, Everforest. Same CSS custom property
pattern as existing 6 themes."
```

---

## Task 2: Update theme.ts with new entries

**Files:**
- Modify: `client/src/lib/theme.ts`

- [ ] **Step 1: Replace entire contents of `client/src/lib/theme.ts`**

```typescript
export type Theme =
  | "dark" | "light" | "midnight" | "nord" | "rosepine" | "solarized"
  | "catppuccin" | "dracula" | "tokyonight" | "gruvbox" | "onedark"
  | "githubdark" | "ayulight" | "everforest";

export const THEMES: Array<{ id: Theme; label: string; preview: string }> = [
  { id: "dark", label: "Dark", preview: "#111113" },
  { id: "light", label: "Light", preview: "#f8f9fa" },
  { id: "midnight", label: "Midnight", preview: "#0b1120" },
  { id: "nord", label: "Nord", preview: "#2e3440" },
  { id: "rosepine", label: "Rosé Pine", preview: "#191724" },
  { id: "solarized", label: "Solarized", preview: "#002b36" },
  { id: "catppuccin", label: "Catppuccin", preview: "#cba6f7" },
  { id: "dracula", label: "Dracula", preview: "#bd93f9" },
  { id: "tokyonight", label: "Tokyo Night", preview: "#7aa2f7" },
  { id: "gruvbox", label: "Gruvbox", preview: "#d79921" },
  { id: "onedark", label: "One Dark", preview: "#61afef" },
  { id: "githubdark", label: "GitHub Dark", preview: "#58a6ff" },
  { id: "ayulight", label: "Ayu Light", preview: "#ff9940" },
  { id: "everforest", label: "Everforest", preview: "#a7c080" },
];

const STORAGE_KEY = "devtodo-theme";
const ALL_THEME_CLASSES: Theme[] = THEMES.map((t) => t.id);

export function getTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored && ALL_THEME_CLASSES.includes(stored)) return stored;
  return "dark";
}

export function setTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  const root = document.documentElement;
  ALL_THEME_CLASSES.forEach((t) => root.classList.remove(t));
  root.classList.add(theme);
}

export function toggleTheme(): Theme {
  const current = getTheme();
  const next = current === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

export function cycleTheme(): Theme {
  const current = getTheme();
  const idx = ALL_THEME_CLASSES.indexOf(current);
  const next = ALL_THEME_CLASSES[(idx + 1) % ALL_THEME_CLASSES.length];
  setTheme(next);
  return next;
}
```

Key change: `ALL_THEME_CLASSES` is now derived from `THEMES.map(t => t.id)` instead of a hardcoded array — so adding themes to the `THEMES` array automatically updates the class removal list.

- [ ] **Step 2: Type-check**

```bash
npx -w client tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/theme.ts
git commit -m "feat(themes): register 8 new themes in theme.ts

Adds Catppuccin, Dracula, Tokyo Night, Gruvbox, One Dark, GitHub Dark,
Ayu Light, Everforest to THEMES array. Derives ALL_THEME_CLASSES from
THEMES to stay in sync automatically."
```

---

## Task 3: Create fonts.ts — font registry and CDN loader

**Files:**
- Create: `client/src/lib/fonts.ts`

- [ ] **Step 1: Create `client/src/lib/fonts.ts`**

```typescript
export interface FontOption {
  id: string;
  name: string;
  type: "sans" | "mono";
  cssFamily: string;
  cdnUrl: string;
}

export const SANS_FONTS: FontOption[] = [
  {
    id: "general-sans",
    name: "General Sans",
    type: "sans",
    cssFamily: '"General Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    cdnUrl: "https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap",
  },
  {
    id: "inter",
    name: "Inter",
    type: "sans",
    cssFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    cdnUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  },
  {
    id: "geist",
    name: "Geist Sans",
    type: "sans",
    cssFamily: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    cdnUrl: "https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-sans/style.css",
  },
  {
    id: "dm-sans",
    name: "DM Sans",
    type: "sans",
    cssFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    cdnUrl: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap",
  },
  {
    id: "plus-jakarta",
    name: "Plus Jakarta Sans",
    type: "sans",
    cssFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    cdnUrl: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
  },
  {
    id: "outfit",
    name: "Outfit",
    type: "sans",
    cssFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    cdnUrl: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap",
  },
  {
    id: "space-grotesk",
    name: "Space Grotesk",
    type: "sans",
    cssFamily: '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    cdnUrl: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap",
  },
];

export const MONO_FONTS: FontOption[] = [
  {
    id: "jetbrains-mono",
    name: "JetBrains Mono",
    type: "mono",
    cssFamily: '"JetBrains Mono", "SF Mono", Monaco, "Cascadia Code", monospace',
    cdnUrl: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap",
  },
  {
    id: "geist-mono",
    name: "Geist Mono",
    type: "mono",
    cssFamily: '"Geist Mono", "SF Mono", Monaco, "Cascadia Code", monospace',
    cdnUrl: "https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-mono/style.css",
  },
  {
    id: "fira-code",
    name: "Fira Code",
    type: "mono",
    cssFamily: '"Fira Code", "SF Mono", Monaco, "Cascadia Code", monospace',
    cdnUrl: "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap",
  },
  {
    id: "source-code-pro",
    name: "Source Code Pro",
    type: "mono",
    cssFamily: '"Source Code Pro", "SF Mono", Monaco, "Cascadia Code", monospace',
    cdnUrl: "https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;600&display=swap",
  },
  {
    id: "ibm-plex-mono",
    name: "IBM Plex Mono",
    type: "mono",
    cssFamily: '"IBM Plex Mono", "SF Mono", Monaco, "Cascadia Code", monospace',
    cdnUrl: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap",
  },
];

const ALL_FONTS = [...SANS_FONTS, ...MONO_FONTS];

function findFont(id: string): FontOption | undefined {
  return ALL_FONTS.find((f) => f.id === id);
}

function loadFontLink(font: FontOption): void {
  if (document.querySelector(`link[data-font-id="${font.id}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = font.cdnUrl;
  link.dataset.fontId = font.id;
  link.dataset.fontType = font.type;
  document.head.appendChild(link);
}

function unloadFontLink(fontId: string): void {
  const link = document.querySelector(`link[data-font-id="${fontId}"]`);
  if (link) link.remove();
}

export function applyFont(type: "sans" | "mono", fontId: string): void {
  const font = findFont(fontId);
  if (!font) return;

  const storageKey = type === "sans" ? "devtodo-font-sans" : "devtodo-font-mono";
  const cssVar = type === "sans" ? "--font-sans" : "--font-mono";

  // Remove old font link for this type (if different)
  const oldId = localStorage.getItem(storageKey);
  if (oldId && oldId !== fontId) {
    unloadFontLink(oldId);
  }

  loadFontLink(font);
  document.documentElement.style.setProperty(cssVar, font.cssFamily);
  localStorage.setItem(storageKey, fontId);
}

export function getSavedFonts(): { sans: string; mono: string } {
  return {
    sans: localStorage.getItem("devtodo-font-sans") || "general-sans",
    mono: localStorage.getItem("devtodo-font-mono") || "jetbrains-mono",
  };
}

export function preloadAllFonts(): () => void {
  ALL_FONTS.forEach(loadFontLink);

  // Return cleanup: remove all font links except the currently selected ones
  return () => {
    const saved = getSavedFonts();
    ALL_FONTS.forEach((f) => {
      if (f.id !== saved.sans && f.id !== saved.mono) {
        unloadFontLink(f.id);
      }
    });
  };
}
```

- [ ] **Step 2: Type-check**

```bash
npx -w client tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/fonts.ts
git commit -m "feat(fonts): add font registry and CDN loader

12 fonts (7 sans + 5 mono) with lazy CDN link injection.
applyFont() loads only the selected font. preloadAllFonts()
for settings page preview with cleanup on unmount."
```

---

## Task 4: Update index.html — remove hardcoded fonts, add FOUC prevention

**Files:**
- Modify: `client/index.html`

- [ ] **Step 1: Replace entire contents of `client/index.html`**

```html
<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DevTodo</title>
    <script>
      // Prevent flash of wrong theme
      var theme = localStorage.getItem("devtodo-theme") || "dark";
      document.documentElement.className = theme;

      // Prevent flash of wrong font — inject CDN links before React mounts
      (function() {
        var FONT_URLS = {
          "general-sans": "https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap",
          "inter": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
          "geist": "https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-sans/style.css",
          "dm-sans": "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap",
          "plus-jakarta": "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
          "outfit": "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap",
          "space-grotesk": "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap",
          "jetbrains-mono": "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap",
          "geist-mono": "https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-mono/style.css",
          "fira-code": "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap",
          "source-code-pro": "https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;600&display=swap",
          "ibm-plex-mono": "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        };
        var FONT_FAMILIES = {
          "general-sans": '"General Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          "inter": '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          "geist": '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          "dm-sans": '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          "plus-jakarta": '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          "outfit": '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          "space-grotesk": '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          "jetbrains-mono": '"JetBrains Mono", "SF Mono", Monaco, "Cascadia Code", monospace',
          "geist-mono": '"Geist Mono", "SF Mono", Monaco, "Cascadia Code", monospace',
          "fira-code": '"Fira Code", "SF Mono", Monaco, "Cascadia Code", monospace',
          "source-code-pro": '"Source Code Pro", "SF Mono", Monaco, "Cascadia Code", monospace',
          "ibm-plex-mono": '"IBM Plex Mono", "SF Mono", Monaco, "Cascadia Code", monospace'
        };
        function injectFont(key, type) {
          var id = localStorage.getItem(key);
          if (id && FONT_URLS[id]) {
            var l = document.createElement("link");
            l.rel = "stylesheet";
            l.href = FONT_URLS[id];
            l.dataset.fontId = id;
            l.dataset.fontType = type;
            document.head.appendChild(l);
            if (FONT_FAMILIES[id]) {
              document.documentElement.style.setProperty("--font-" + type, FONT_FAMILIES[id]);
            }
          }
        }
        injectFont("devtodo-font-sans", "sans");
        injectFont("devtodo-font-mono", "mono");
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Key changes:
- Removed the two hardcoded `<link>` tags for General Sans and JetBrains Mono
- Expanded the inline `<script>` with font FOUC prevention
- Used `var` (not `const`/`let`) for broad browser compat in the inline script
- Wrapped font logic in an IIFE to avoid polluting global scope

- [ ] **Step 2: Start dev server and verify no FOUC**

```bash
npm run dev 2>&1 &
sleep 5
curl -sf http://localhost:5173 | head -30
```

Expected: HTML loads. No hardcoded font `<link>` tags in `<head>`. The inline script is present.

- [ ] **Step 3: Commit**

```bash
git add client/index.html
git commit -m "feat(fonts): dynamic font loading with FOUC prevention

Removes hardcoded General Sans and JetBrains Mono CDN links.
Inline script injects only the selected font's CDN link before
React mounts, preventing font flash. Falls back to CSS defaults
if no font is saved in localStorage."
```

---

## Task 5: Add font picker grids to SettingsPage

**Files:**
- Modify: `client/src/components/SettingsPage.tsx`

- [ ] **Step 1: Add imports**

At the top of `/Users/adarshjha/claude-projects/dev-todo/client/src/components/SettingsPage.tsx`, add after existing imports:

```typescript
import { SANS_FONTS, MONO_FONTS, applyFont, getSavedFonts, preloadAllFonts } from "../lib/fonts";
```

- [ ] **Step 2: Add font state and preload effect**

Inside the `SettingsPage` component function, find the existing state declarations (around line 50-70). Add after the `currentTheme` state:

```typescript
const [currentSansFont, setCurrentSansFont] = useState(getSavedFonts().sans);
const [currentMonoFont, setCurrentMonoFont] = useState(getSavedFonts().mono);

// Preload all fonts so the picker shows actual typefaces
useEffect(() => {
  const cleanup = preloadAllFonts();
  return cleanup;
}, []);
```

Make sure `useEffect` is in the imports from "react" at the top of the file (it should already be there).

- [ ] **Step 3: Add font handler functions**

Add after the `handleThemeChange` function:

```typescript
function handleSansFontChange(fontId: string) {
  applyFont("sans", fontId);
  setCurrentSansFont(fontId);
}

function handleMonoFontChange(fontId: string) {
  applyFont("mono", fontId);
  setCurrentMonoFont(fontId);
}
```

- [ ] **Step 4: Add font picker UI after the Compact Mode toggle**

Find this block in the JSX (around line 231-234):

```tsx
          <SettingRow label="Compact Mode" description="Reduce padding and spacing in the todo list">
            <Toggle value={settings.compactMode} onChange={(v) => updateSetting("compactMode", v)} />
          </SettingRow>
        </Section>
```

Replace with:

```tsx
          <SettingRow label="Compact Mode" description="Reduce padding and spacing in the todo list">
            <Toggle value={settings.compactMode} onChange={(v) => updateSetting("compactMode", v)} />
          </SettingRow>
          <SettingRow label="UI Font" description="Sans-serif font for titles, labels, and body text">
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {SANS_FONTS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleSansFontChange(f.id)}
                  style={{
                    padding: "5px 10px",
                    fontSize: "11px",
                    fontWeight: 500,
                    fontFamily: f.cssFamily,
                    borderRadius: "6px",
                    cursor: "pointer",
                    border: currentSansFont === f.id ? "1px solid var(--color-primary-border)" : "1px solid var(--border)",
                    backgroundColor: currentSansFont === f.id ? "var(--color-primary-dim)" : "var(--bg-card)",
                    color: currentSansFont === f.id ? "var(--color-primary-light)" : "var(--text-secondary)",
                  }}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </SettingRow>
          <SettingRow label="Code Font" description="Monospace font for timestamps, IDs, and code blocks">
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {MONO_FONTS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleMonoFontChange(f.id)}
                  style={{
                    padding: "5px 10px",
                    fontSize: "11px",
                    fontWeight: 500,
                    fontFamily: f.cssFamily,
                    borderRadius: "6px",
                    cursor: "pointer",
                    border: currentMonoFont === f.id ? "1px solid var(--color-primary-border)" : "1px solid var(--border)",
                    backgroundColor: currentMonoFont === f.id ? "var(--color-primary-dim)" : "var(--bg-card)",
                    color: currentMonoFont === f.id ? "var(--color-primary-light)" : "var(--text-secondary)",
                  }}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </SettingRow>
        </Section>
```

- [ ] **Step 5: Type-check**

```bash
npx -w client tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/SettingsPage.tsx
git commit -m "feat(fonts): add font picker grids to Settings

Visual grid of 7 sans + 5 mono fonts, matching theme picker style.
Each button renders in its actual typeface. Fonts preloaded on
settings mount, cleaned up on unmount. Selection persisted to
localStorage, applied instantly via CSS var override."
```

---

## Task 6: Integration test — verify themes + fonts end-to-end

- [ ] **Step 1: Build**

```bash
cd /Users/adarshjha/claude-projects/dev-todo
npm run build
```

Expected: build succeeds.

- [ ] **Step 2: Start dev mode**

```bash
npm run dev 2>&1 &
sleep 5
```

- [ ] **Step 3: Open browser and test themes**

Open http://localhost:5173, go to Settings > Appearance.

Verify:
- All 14 themes appear as buttons with preview colors
- Clicking each theme instantly changes the app colors
- Refreshing the page preserves the selected theme (no flash)
- Light themes (Light, Ayu Light) properly invert text colors

- [ ] **Step 4: Test fonts**

In Settings > Appearance:

Verify:
- "UI Font" grid shows 7 buttons, each rendered in its own typeface
- "Code Font" grid shows 5 buttons, each rendered in its own typeface
- Clicking a font instantly changes the app (titles, body text for sans; timestamps, IDs for mono)
- Refreshing preserves the font selection with no flash of default font
- Switching back to General Sans / JetBrains Mono works correctly

- [ ] **Step 5: Test font cleanup**

Verify that leaving the Settings page unloads unused font CDN links:
- Open Settings (all 12 fonts load)
- Navigate back to the todo list
- In browser DevTools > Elements > `<head>`, verify only 2 `<link data-font-id="...">` tags remain (the selected sans + mono), not all 12

- [ ] **Step 6: Stop dev server**

```bash
kill %1 2>/dev/null || true
```

---

## Task 7: Push branch and open PR

- [ ] **Step 1: Push**

```bash
git push -u origin feat/themes-fonts
```

(If token issues, push manually via `! git push -u https://jha-adrs@github.com/jha-adrs/dev-todo.git feat/themes-fonts`)

- [ ] **Step 2: Create PR**

```bash
gh pr create --head feat/themes-fonts --base main --title "feat: 14 themes + font picker with lazy CDN loading" --body "$(cat <<'EOF'
## Summary
- **8 new themes**: Catppuccin Mocha, Dracula, Tokyo Night, Gruvbox Dark, One Dark, GitHub Dark, Ayu Light, Everforest (14 total)
- **Font picker**: 7 sans-serif + 5 monospace options in Settings, visual grid matching theme picker
- **Lazy CDN loading**: only the selected fonts are downloaded, not all 12
- **FOUC prevention**: inline script injects font CDN links before React mounts
- **Settings preload**: all fonts load when entering Settings (for visual preview), cleaned up on exit

## Design doc
`docs/superpowers/specs/2026-04-16-themes-fonts-design.md`

## Test plan
- [x] All 14 themes render correctly
- [x] Font picker shows actual typefaces
- [x] Font selection persisted across refresh
- [x] No FOUC on page load
- [x] Font cleanup on Settings exit (DevTools verification)
- [x] Build succeeds

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review

**Spec coverage:**
- 8 new CSS theme classes → Task 1 ✓
- Theme metadata in theme.ts → Task 2 ✓
- Font registry (7 sans + 5 mono) → Task 3 ✓
- CDN loader functions (loadFontLink, unloadFontLink, applyFont, getSavedFonts, preloadAllFonts) → Task 3 ✓
- FOUC prevention in index.html (remove hardcoded links, add inline font injection) → Task 4 ✓
- Font picker UI (visual grid matching theme picker) → Task 5 ✓
- localStorage persistence (devtodo-font-sans, devtodo-font-mono) → Task 3 (applyFont saves) + Task 4 (inline script reads) ✓
- Settings preload + cleanup → Task 3 (preloadAllFonts returns cleanup) + Task 5 (useEffect) ✓
- No backend changes → confirmed, zero server file changes ✓
- Mobile app compatibility (no coupling) → confirmed ✓

**Placeholder scan:** No TBD, TODO, or "fill in later". All code blocks complete.

**Type consistency:**
- `FontOption` interface consistent across fonts.ts (definition) and SettingsPage.tsx (usage via SANS_FONTS/MONO_FONTS)
- `applyFont("sans", fontId)` / `applyFont("mono", fontId)` signature matches definition
- `preloadAllFonts()` returns `() => void`, used as useEffect cleanup — consistent
- `getSavedFonts()` returns `{ sans: string, mono: string }` — used in useState init
- `data-font-id` / `data-font-type` attributes consistent between fonts.ts and index.html inline script
- CSS var names `--font-sans` / `--font-mono` consistent between index.css (@theme defaults), fonts.ts (setProperty), and index.html (inline script)
