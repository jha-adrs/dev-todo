# Themes & Fonts Customization — Design

**Status:** Approved, ready for implementation plan
**Date:** 2026-04-16

## Goal

Expand DevTodo's theme library from 6 to 14 themes and add a font picker (7 sans-serif + 5 monospace options) with lazy CDN loading — only the selected fonts are downloaded.

## Non-goals

- Font size customization (browser zoom handles this)
- Font weight customization
- Custom/uploaded fonts
- Per-theme font pairing (font choice is global, applies to all themes)
- Backend changes (theme + font are purely client-side, localStorage)
- Self-hosted font files (CDN only)

## Design decisions

| Decision | Choice |
|---|---|
| Theme count | 14 total (6 existing + 8 new) |
| Font options | 7 sans + 5 mono = 12 total |
| Font loading | CDN `<link>` injection, only selected fonts loaded |
| Font picker UI | Visual grid (buttons rendered in actual typeface), matches theme picker pattern |
| Storage | localStorage: `devtodo-font-sans`, `devtodo-font-mono` |
| FOUC prevention | Inline `<script>` in index.html injects font `<link>` before React mounts |
| Font preview in settings | Preload all font CDN links on settings mount, cleanup on unmount |
| Defaults | General Sans + JetBrains Mono (unchanged for existing users) |

## Architecture

### 1. New Themes (CSS)

8 new theme classes appended to `client/src/index.css`. Each defines the same 8 CSS custom properties as existing themes (`--bg`, `--bg-card`, `--bg-elevated`, `--border`, `--border-light`, `--text-primary`, `--text-secondary`, `--text-muted`, `--text-dim`).

| Theme | CSS Class | `--bg` | `--bg-card` | `--bg-elevated` | `--border` | `--text-primary` | `--text-secondary` | `--text-muted` | `--text-dim` | Accent/Preview |
|---|---|---|---|---|---|---|---|---|---|---|
| Catppuccin Mocha | `.catppuccin` | `#1e1e2e` | `#181825` | `#313244` | `#45475a` | `#cdd6f4` | `#bac2de` | `#6c7086` | `#585b70` | `#cba6f7` |
| Dracula | `.dracula` | `#282a36` | `#21222c` | `#343746` | `#44475a` | `#f8f8f2` | `#e2e2dc` | `#6272a4` | `#565761` | `#bd93f9` |
| Tokyo Night | `.tokyonight` | `#1a1b26` | `#16161e` | `#232433` | `#292e42` | `#a9b1d6` | `#9aa5ce` | `#565f89` | `#414868` | `#7aa2f7` |
| Gruvbox Dark | `.gruvbox` | `#282828` | `#1d2021` | `#3c3836` | `#504945` | `#ebdbb2` | `#d5c4a1` | `#928374` | `#7c6f64` | `#d79921` |
| One Dark | `.onedark` | `#282c34` | `#21252b` | `#2c313a` | `#3e4452` | `#abb2bf` | `#9da5b4` | `#636d83` | `#4b5263` | `#61afef` |
| GitHub Dark | `.githubdark` | `#0d1117` | `#161b22` | `#1c2128` | `#30363d` | `#c9d1d9` | `#b1bac4` | `#8b949e` | `#6e7681` | `#58a6ff` |
| Ayu Light | `.ayulight` | `#fafafa` | `#ffffff` | `#f3f4f5` | `#e7e8e9` | `#5c6166` | `#787b80` | `#8a9199` | `#acb6bf` | `#ff9940` |
| Everforest | `.everforest` | `#2d353b` | `#272e33` | `#343f44` | `#475258` | `#d3c6aa` | `#c5b899` | `#859289` | `#6e7f77` | `#a7c080` |

### 2. Theme Metadata

Add 8 entries to the `THEMES` array in `client/src/lib/theme.ts`:

```typescript
{ id: "catppuccin", label: "Catppuccin Mocha", preview: "#cba6f7" },
{ id: "dracula", label: "Dracula", preview: "#bd93f9" },
{ id: "tokyonight", label: "Tokyo Night", preview: "#7aa2f7" },
{ id: "gruvbox", label: "Gruvbox Dark", preview: "#d79921" },
{ id: "onedark", label: "One Dark", preview: "#61afef" },
{ id: "githubdark", label: "GitHub Dark", preview: "#58a6ff" },
{ id: "ayulight", label: "Ayu Light", preview: "#ff9940" },
{ id: "everforest", label: "Everforest", preview: "#a7c080" },
```

The `setTheme()` function already removes all classes and adds the new one — no change needed. The FOUC-prevention script in `index.html` already reads from localStorage and sets the class — no change needed.

### 3. Font Registry

New file: `client/src/lib/fonts.ts`

```typescript
export interface FontOption {
  id: string;
  name: string;
  type: "sans" | "mono";
  cssFamily: string;    // full font-family value with fallbacks
  cdnUrl: string;       // CSS URL to load from CDN
}
```

**Sans fonts:**

| ID | Name | `cssFamily` | CDN |
|---|---|---|---|
| `general-sans` | General Sans | `"General Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | `https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap` |
| `inter` | Inter | `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap` |
| `geist` | Geist Sans | `"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | `https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-sans/style.css` |
| `dm-sans` | DM Sans | `"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | `https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap` |
| `plus-jakarta` | Plus Jakarta Sans | `"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap` |
| `outfit` | Outfit | `"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | `https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap` |
| `space-grotesk` | Space Grotesk | `"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap` |

**Mono fonts:**

| ID | Name | `cssFamily` | CDN |
|---|---|---|---|
| `jetbrains-mono` | JetBrains Mono | `"JetBrains Mono", "SF Mono", Monaco, "Cascadia Code", monospace` | `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap` |
| `geist-mono` | Geist Mono | `"Geist Mono", "SF Mono", Monaco, "Cascadia Code", monospace` | `https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-mono/style.css` |
| `fira-code` | Fira Code | `"Fira Code", "SF Mono", Monaco, "Cascadia Code", monospace` | `https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap` |
| `source-code-pro` | Source Code Pro | `"Source Code Pro", "SF Mono", Monaco, "Cascadia Code", monospace` | `https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;600&display=swap` |
| `ibm-plex-mono` | IBM Plex Mono | `"IBM Plex Mono", "SF Mono", Monaco, "Cascadia Code", monospace` | `https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap` |

### 4. Font Loading Functions

Exported from `client/src/lib/fonts.ts`:

**`loadFontLink(font: FontOption): void`**
- Creates a `<link rel="stylesheet" href="..." data-font-id="..." data-font-type="sans|mono">` and appends to `<head>`
- No-op if a link with matching `data-font-id` already exists

**`unloadFontLink(fontId: string): void`**
- Removes the `<link>` tag with matching `data-font-id`

**`applyFont(type: "sans" | "mono", fontId: string): void`**
- Looks up the font in the registry
- Calls `loadFontLink()` for the new font
- Removes the old font link (if different)
- Sets `document.documentElement.style.setProperty("--font-sans", font.cssFamily)` or `--font-mono`
- Saves to localStorage (`devtodo-font-sans` or `devtodo-font-mono`)

**`getSavedFonts(): { sans: string, mono: string }`**
- Reads from localStorage, defaults to `general-sans` + `jetbrains-mono`

**`preloadAllFonts(): () => void`**
- Loads all 12 font CDN links (for the settings page preview)
- Returns a cleanup function that removes all links except the currently selected ones

### 5. FOUC Prevention (index.html)

Update the existing inline `<script>` block in `client/index.html`. Currently:

```javascript
const t = localStorage.getItem("devtodo-theme") || "dark";
document.documentElement.className = t;
```

Becomes:

```javascript
// Theme
const t = localStorage.getItem("devtodo-theme") || "dark";
document.documentElement.className = t;

// Fonts — minimal inline map to avoid FOUC
const FONT_URLS = {
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
  "ibm-plex-mono": "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap",
};
const FONT_FAMILIES = {
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
  "ibm-plex-mono": '"IBM Plex Mono", "SF Mono", Monaco, "Cascadia Code", monospace',
};
function injectFont(key, type) {
  const id = localStorage.getItem(key);
  if (id && FONT_URLS[id]) {
    const l = document.createElement("link");
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
```

The duplication of URL/family maps between `index.html` and `fonts.ts` is intentional — the inline script runs before any JS bundles load, preventing the font flash. The `fonts.ts` module is the source of truth for the settings UI and runtime font switching.

**Remove** the two existing hardcoded `<link>` tags for General Sans and JetBrains Mono from `index.html`. If no font is saved in localStorage, the inline script does nothing and the `--font-sans` / `--font-mono` CSS vars fall through to the defaults defined in `index.css` — which still reference General Sans and JetBrains Mono. The browser uses system fallbacks until the CDN link loads. This is acceptable because:
- New users see system fonts for ~100ms on first load, then General Sans kicks in
- Existing users who already have the fonts cached see no flash at all

### 6. Settings UI

In `client/src/components/SettingsPage.tsx`, add two new sections below the existing theme grid in Appearance:

**"UI Font" section:**
- Grid of 7 buttons (same layout as theme grid)
- Each button renders the font name in that font using `style={{ fontFamily: font.cssFamily }}`
- Active font gets highlighted border (same pattern as active theme)
- Click calls `applyFont("sans", fontId)` and updates local state

**"Code Font" section:**
- Grid of 5 buttons
- Same pattern, `applyFont("mono", fontId)`

**Font preview preloading:**
- On settings page mount: call `preloadAllFonts()`, save cleanup function
- On settings page unmount: call cleanup to remove unused font links
- This ensures all 12 fonts are visible in their actual typeface while browsing settings, but don't persist in memory during normal app use

### 7. CSS changes in index.css

The `--font-sans` and `--font-mono` definitions in the `@theme {}` block remain as defaults:

```css
--font-sans: "General Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "JetBrains Mono", "SF Mono", Monaco, "Cascadia Code", monospace;
```

These serve as fallbacks. When a user picks a font, `document.documentElement.style.setProperty()` overrides the CSS variable at the element level, which takes precedence over the `@theme` definition. No existing CSS rules change.

## Files summary

| File | Change |
|---|---|
| `client/src/index.css` | Add 8 new theme class blocks (~80 lines) |
| `client/src/lib/theme.ts` | Add 8 entries to `THEMES` array |
| `client/src/lib/fonts.ts` | **New** — font registry, CDN loader, apply/preload functions |
| `client/index.html` | Remove hardcoded font `<link>` tags, expand inline script for font FOUC prevention |
| `client/src/components/SettingsPage.tsx` | Add font picker grids (sans + mono) below theme picker |

## Mobile app compatibility

- Fonts are purely client-side (localStorage + CDN). A mobile app would have its own font system.
- Themes are CSS classes. A mobile app would need to read the theme's CSS vars or replicate the palette — but that's a bridge to cross later.
- No API changes, no database changes. Zero coupling.
