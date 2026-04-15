import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check, Plus, Settings as SettingsIcon } from "lucide-react";
import { useSpace } from "../contexts/SpaceContext";
import { api } from "../lib/api";

const SPACE_COLORS = [
  "#6366f1", // indigo
  "#3b82f6", // blue
  "#06b6d4", // cyan
  "#22c55e", // green
  "#eab308", // amber
  "#f97316", // orange
  "#ef4444", // red
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#6b7280", // gray
];

interface SpaceSwitcherProps {
  onOpenSettings?: () => void;
}

export default function SpaceSwitcher({ onOpenSettings }: SpaceSwitcherProps) {
  const { spaces, currentSpace, switchSpace, refreshSpaces } = useSpace();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(SPACE_COLORS[0]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Focus input when create form opens
  useEffect(() => {
    if (creating) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [creating]);

  // Auto-cycle color suggestion
  useEffect(() => {
    if (creating) {
      const usedColors = new Set(spaces.map((s) => s.color));
      const next = SPACE_COLORS.find((c) => !usedColors.has(c)) || SPACE_COLORS[0];
      setNewColor(next);
    }
  }, [creating, spaces]);

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const created = await api.post<{ id: number }>("/api/spaces", {
        name: newName.trim(),
        color: newColor,
        icon: newName.trim().charAt(0).toUpperCase(),
      });
      await refreshSpaces();
      switchSpace(created.id);
      setOpen(false);
      setCreating(false);
      setNewName("");
    } catch (err) {
      console.error(err);
    }
  }

  if (!currentSpace) return null;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Pill button */}
      <button
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = `${currentSpace.color}44`;
            e.currentTarget.style.backgroundColor = `${currentSpace.color}0a`;
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.backgroundColor = "var(--bg-card)";
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--sp-2)",
          padding: "6px 10px 6px 6px",
          backgroundColor: open ? `${currentSpace.color}18` : "var(--bg-card)",
          border: `1px solid ${open ? `${currentSpace.color}66` : "var(--border)"}`,
          borderRadius: "var(--radius-lg)",
          cursor: "pointer",
          transition: "all 0.15s",
          boxShadow: open ? `0 0 0 3px ${currentSpace.color}15` : "none",
        }}
      >
        <span
          style={{
            width: "22px",
            height: "22px",
            borderRadius: "var(--radius-md)",
            background: `linear-gradient(135deg, ${currentSpace.color}, ${currentSpace.color}cc)`,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 700,
            flexShrink: 0,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 2px ${currentSpace.color}66`,
            letterSpacing: "-0.02em",
          }}
        >
          {currentSpace.icon || currentSpace.name.charAt(0).toUpperCase()}
        </span>
        <span
          style={{
            fontSize: "var(--text-base)",
            fontWeight: 600,
            color: "var(--text-primary)",
            lineHeight: 1,
            letterSpacing: "-0.01em",
          }}
        >
          {currentSpace.name}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: "var(--text-muted)",
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              minWidth: "260px",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-lg)",
              padding: "var(--sp-1)",
              zIndex: 50,
            }}
          >
            {/* Section label */}
            <div
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                padding: "var(--sp-2) var(--sp-3) var(--sp-1)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Spaces
            </div>

            {/* Space list */}
            {spaces.map((space, idx) => {
              const isActive = space.id === currentSpace.id;
              return (
                <button
                  key={space.id}
                  onClick={() => {
                    switchSpace(space.id);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--sp-2)",
                    width: "100%",
                    padding: "8px 10px",
                    backgroundColor: isActive
                      ? `${space.color}15`
                      : "transparent",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background-color 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      e.currentTarget.style.backgroundColor = "var(--color-primary-dim)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <span
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "var(--radius-md)",
                      background: `linear-gradient(135deg, ${space.color}, ${space.color}cc)`,
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 700,
                      flexShrink: 0,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 2px ${space.color}66`,
                    }}
                  >
                    {space.icon || space.name.charAt(0).toUpperCase()}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: "var(--text-base)",
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? space.color : "var(--text-primary)",
                    }}
                  >
                    {space.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      color: "var(--text-dim)",
                    }}
                  >
                    {space.todoCount > 0 ? `${space.todoCount} ` : ""}
                    {idx < 9 ? `⌘${idx + 1}` : ""}
                  </span>
                  {isActive && (
                    <Check size={14} style={{ color: space.color, marginLeft: "4px" }} />
                  )}
                </button>
              );
            })}

            <div
              style={{
                height: "1px",
                backgroundColor: "var(--border)",
                margin: "var(--sp-1) 0",
              }}
            />

            {/* Create form */}
            {creating ? (
              <div style={{ padding: "var(--sp-2) var(--sp-2) var(--sp-1)" }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Space name"
                  maxLength={50}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") {
                      setCreating(false);
                      setNewName("");
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    backgroundColor: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "var(--text-base)",
                    outline: "none",
                    boxSizing: "border-box",
                    marginBottom: "var(--sp-2)",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    marginBottom: "var(--sp-2)",
                    flexWrap: "wrap",
                  }}
                >
                  {SPACE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        backgroundColor: c,
                        border:
                          newColor === c
                            ? "2px solid var(--text-primary)"
                            : "2px solid transparent",
                        cursor: "pointer",
                        padding: 0,
                        transition: "transform 0.1s",
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim()}
                    style={{
                      flex: 1,
                      padding: "6px",
                      backgroundColor: newColor,
                      color: "white",
                      border: "none",
                      borderRadius: "var(--radius-md)",
                      fontSize: "var(--text-sm)",
                      fontWeight: 600,
                      cursor: newName.trim() ? "pointer" : "not-allowed",
                      opacity: newName.trim() ? 1 : 0.5,
                    }}
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setCreating(false);
                      setNewName("");
                    }}
                    style={{
                      padding: "6px var(--sp-3)",
                      backgroundColor: "transparent",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "var(--text-sm)",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setCreating(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--sp-2)",
                    width: "100%",
                    padding: "8px 10px",
                    backgroundColor: "transparent",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                    fontSize: "var(--text-base)",
                    textAlign: "left",
                    transition: "background-color 0.1s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--color-primary-dim)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <span
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "var(--radius-md)",
                      border: "1px dashed var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Plus size={12} />
                  </span>
                  Create space
                </button>
                {onOpenSettings && (
                  <button
                    onClick={() => {
                      onOpenSettings();
                      setOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--sp-2)",
                      width: "100%",
                      padding: "8px 10px",
                      backgroundColor: "transparent",
                      border: "none",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      fontSize: "var(--text-sm)",
                      textAlign: "left",
                      transition: "background-color 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "var(--color-primary-dim)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <SettingsIcon size={14} />
                    Manage spaces
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { SPACE_COLORS };
