import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { getTheme, toggleTheme, type Theme } from "../lib/theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(getTheme());
    const handler = () => setTheme(getTheme());
    window.addEventListener("themechange", handler);
    return () => window.removeEventListener("themechange", handler);
  }, []);

  function handleToggle() {
    const next = toggleTheme();
    setTheme(next);
  }

  return (
    <button
      onClick={handleToggle}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      style={{
        padding: "6px 10px",
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        color: "var(--text-secondary)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.3s ease",
      }}
    >
      <div
        style={{
          transition: "transform 0.3s ease",
          transform: theme === "dark" ? "rotate(0deg)" : "rotate(180deg)",
          display: "flex",
        }}
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </div>
    </button>
  );
}
