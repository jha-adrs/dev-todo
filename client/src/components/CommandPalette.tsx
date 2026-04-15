import { useState, useEffect, useRef, useMemo } from "react";
import type { Todo } from "../hooks/useTodos";

interface CommandAction {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  actions: CommandAction[];
  todos: Todo[];
  onSelectTodo: (id: number) => void;
}

function fuzzyMatch(query: string, text: string): { matches: boolean; indices: number[] } {
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const indices: number[] = [];
  let qi = 0;

  for (let i = 0; i < lower.length && qi < qLower.length; i++) {
    if (lower[i] === qLower[qi]) {
      indices.push(i);
      qi++;
    }
  }

  return { matches: qi === qLower.length, indices };
}

function HighlightedText({ text, indices }: { text: string; indices: number[] }) {
  const set = new Set(indices);
  return (
    <span>
      {text.split("").map((char, i) => (
        <span
          key={i}
          style={{
            color: set.has(i) ? "var(--color-primary-light)" : "inherit",
            fontWeight: set.has(i) ? 600 : "inherit",
          }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}

export default function CommandPalette({
  open,
  onClose,
  actions,
  todos,
  onSelectTodo,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo(() => {
    const items: Array<{
      type: "action" | "todo";
      label: string;
      icon: string;
      shortcut?: string;
      indices: number[];
      onSelect: () => void;
    }> = [];

    if (!query) {
      // Show all actions by default
      actions.forEach((a) => {
        items.push({
          type: "action",
          label: a.label,
          icon: a.icon,
          shortcut: a.shortcut,
          indices: [],
          onSelect: a.action,
        });
      });
    } else {
      // Filter actions
      actions.forEach((a) => {
        const match = fuzzyMatch(query, a.label);
        if (match.matches) {
          items.push({
            type: "action",
            label: a.label,
            icon: a.icon,
            shortcut: a.shortcut,
            indices: match.indices,
            onSelect: a.action,
          });
        }
      });

      // Filter todos
      todos.forEach((t) => {
        const match = fuzzyMatch(query, t.title);
        if (match.matches) {
          items.push({
            type: "todo",
            label: t.title,
            icon: t.status === "completed" ? "✓" : "○",
            indices: match.indices,
            onSelect: () => onSelectTodo(t.id),
          });
        }
      });
    }

    return items;
  }, [query, actions, todos, onSelectTodo]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      results[selectedIndex].onSelect();
      onClose();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "20vh",
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          width: "100%",
          maxWidth: "500px",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        {/* Search input */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>⌘</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or type a command..."
            style={{
              flex: 1,
              background: "none",
              border: "none",
              color: "var(--text-primary)",
              fontSize: "14px",
              outline: "none",
              fontFamily: "var(--font-sans)",
            }}
          />
        </div>

        {/* Results */}
        <div style={{ maxHeight: "300px", overflowY: "auto", padding: "6px" }}>
          {results.length === 0 && query && (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "13px",
              }}
            >
              No results found
            </div>
          )}
          {results.map((item, i) => (
            <div
              key={`${item.type}-${item.label}-${i}`}
              onClick={() => {
                item.onSelect();
                onClose();
              }}
              style={{
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                borderRadius: "6px",
                cursor: "pointer",
                backgroundColor: i === selectedIndex ? "var(--color-primary-dim)" : "transparent",
                transition: "background-color 0.1s",
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span style={{ fontSize: "13px", width: "20px", textAlign: "center" }}>
                {item.icon}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: "13px",
                  color: "var(--text-primary)",
                }}
              >
                <HighlightedText text={item.label} indices={item.indices} />
              </span>
              {item.shortcut && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    color: "var(--text-dim)",
                    padding: "2px 6px",
                    backgroundColor: "var(--bg)",
                    borderRadius: "3px",
                  }}
                >
                  {item.shortcut}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export type { CommandAction };
