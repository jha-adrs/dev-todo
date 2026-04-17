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
