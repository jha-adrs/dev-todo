export type Theme = "dark" | "light" | "midnight" | "nord" | "rosepine" | "solarized";

export const THEMES: Array<{ id: Theme; label: string; preview: string }> = [
  { id: "dark", label: "Dark", preview: "#111113" },
  { id: "light", label: "Light", preview: "#f8f9fa" },
  { id: "midnight", label: "Midnight", preview: "#0b1120" },
  { id: "nord", label: "Nord", preview: "#2e3440" },
  { id: "rosepine", label: "Rose Pine", preview: "#191724" },
  { id: "solarized", label: "Solarized", preview: "#002b36" },
];

const STORAGE_KEY = "devtodo-theme";
const ALL_THEME_CLASSES: Theme[] = ["dark", "light", "midnight", "nord", "rosepine", "solarized"];

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
