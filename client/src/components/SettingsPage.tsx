import { useState, useEffect } from "react";
import { Trash2, Edit3, Plus } from "lucide-react";
import { api } from "../lib/api";
import { getTheme, setTheme, THEMES, type Theme } from "../lib/theme";
import { SANS_FONTS, MONO_FONTS, applyFont, getSavedFonts, preloadAllFonts } from "../lib/fonts";
import { useSpace, type Space } from "../contexts/SpaceContext";
import { SPACE_COLORS } from "./SpaceSwitcher";

interface SettingsPageProps {
  onBack: () => void;
  onLogout: () => void;
}

interface AppStats {
  totalTodos: number;
  completedTodos: number;
  totalImages: number;
  oldestTodo: string | null;
}

const SETTINGS_KEY = "devtodo-settings";

interface AppSettings {
  defaultPriority: string;
  calendarOpen: boolean;
  notificationsEnabled: boolean;
  compactMode: boolean;
  showBacklog: boolean;
  showProgressRing: boolean;
}

function getSettings(): AppSettings {
  const stored = localStorage.getItem(SETTINGS_KEY);
  const defaults: AppSettings = {
    defaultPriority: "medium",
    calendarOpen: true,
    notificationsEnabled: true,
    compactMode: false,
    showBacklog: true,
    showProgressRing: true,
  };
  if (!stored) return defaults;
  return { ...defaults, ...JSON.parse(stored) };
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export default function SettingsPage({ onBack, onLogout }: SettingsPageProps) {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [settings, setSettingsState] = useState(getSettings);
  const [currentTheme, setCurrentTheme] = useState<Theme>(getTheme());
  const [currentSansFont, setCurrentSansFont] = useState(getSavedFonts().sans);
  const [currentMonoFont, setCurrentMonoFont] = useState(getSavedFonts().mono);
  const [confirmReset, setConfirmReset] = useState<"todos" | "all" | null>(null);
  const [message, setMessage] = useState("");
  const [allTags, setAllTags] = useState<Array<{ id: number; name: string; color: string; usageCount: number }>>([]);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editingTagName, setEditingTagName] = useState("");

  useEffect(() => {
    api.get<AppStats>("/api/settings/stats").then(setStats).catch(console.error);
    api.get<Array<{ id: number; name: string; color: string; usageCount: number }>>("/api/tags").then(setAllTags).catch(console.error);
  }, []);

  // Preload all fonts so the picker shows actual typefaces
  useEffect(() => {
    const cleanup = preloadAllFonts();
    return cleanup;
  }, []);

  function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const updated = { ...settings, [key]: value };
    setSettingsState(updated);
    saveSettings(updated);
  }

  function handleThemeChange(t: Theme) {
    setTheme(t);
    setCurrentTheme(t);
  }

  function handleSansFontChange(fontId: string) {
    applyFont("sans", fontId);
    setCurrentSansFont(fontId);
  }

  function handleMonoFontChange(fontId: string) {
    applyFont("mono", fontId);
    setCurrentMonoFont(fontId);
  }

  async function handleBackup() {
    try {
      const res = await fetch("/api/settings/backup", { credentials: "include" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `devtodo-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      flash("Backup downloaded");
    } catch {
      flash("Backup failed");
    }
  }

  async function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const result = await api.post<{ imported: number }>("/api/settings/import", data);
        flash(`Imported ${result.imported} todos`);
        api.get<AppStats>("/api/settings/stats").then(setStats);
      } catch {
        flash("Import failed — invalid file");
      }
    };
    input.click();
  }

  async function handleReset(type: "todos" | "all") {
    try {
      await api.post(`/api/settings/reset/${type}`);
      if (type === "all") {
        onLogout();
      } else {
        flash("All todos deleted");
        setConfirmReset(null);
        api.get<AppStats>("/api/settings/stats").then(setStats);
      }
    } catch {
      flash("Reset failed");
    }
  }

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", padding: "20px 24px" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
          <button
            onClick={onBack}
            style={{
              padding: "6px 12px",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              color: "var(--text-secondary)",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                background: "var(--color-primary)",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 700,
                fontSize: "12px",
              }}
            >
              ⚙
            </div>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
              Settings
            </span>
          </div>
        </div>

        {/* Toast */}
        {message && (
          <div
            style={{
              padding: "10px 16px",
              backgroundColor: "var(--color-green-dim, rgba(34,197,94,0.1))",
              border: "1px solid var(--color-green)",
              borderRadius: "8px",
              color: "var(--color-green)",
              fontSize: "13px",
              marginBottom: "20px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {message}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <Section title="Overview">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
              <StatCard label="Total Todos" value={stats.totalTodos} />
              <StatCard label="Completed" value={stats.completedTodos} />
              <StatCard label="Completion Rate" value={stats.totalTodos > 0 ? `${Math.round((stats.completedTodos / stats.totalTodos) * 100)}%` : "—"} />
              <StatCard label="Files Uploaded" value={stats.totalImages} />
            </div>
          </Section>
        )}

        {/* Appearance */}
        <Section title="Appearance">
          <SettingRow label="Theme" description="Choose your preferred color scheme">
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  style={{
                    padding: "5px 10px",
                    fontSize: "11px",
                    fontWeight: 500,
                    borderRadius: "6px",
                    cursor: "pointer",
                    border: currentTheme === t.id ? "1px solid var(--color-primary-border)" : "1px solid var(--border)",
                    backgroundColor: currentTheme === t.id ? "var(--color-primary-dim)" : "var(--bg-card)",
                    color: currentTheme === t.id ? "var(--color-primary-light)" : "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: t.preview, border: "1px solid var(--border)" }} />
                  {t.label}
                </button>
              ))}
            </div>
          </SettingRow>
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

        {/* Tags Management */}
        <SpacesSection />

        <Section title="Tags">
          {allTags.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--text-muted)", padding: "8px 0" }}>
              No tags created yet. Add tags from any todo's detail panel.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {allTags.map((tag) => (
                <div
                  key={tag.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "6px 4px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <input
                    type="color"
                    value={tag.color}
                    onChange={async (e) => {
                      const color = e.target.value;
                      await api.patch(`/api/tags/${tag.id}`, { color });
                      setAllTags((prev) => prev.map((t) => (t.id === tag.id ? { ...t, color } : t)));
                    }}
                    style={{
                      width: "22px",
                      height: "22px",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      padding: 0,
                      backgroundColor: "transparent",
                    }}
                  />
                  {editingTagId === tag.id ? (
                    <input
                      autoFocus
                      value={editingTagName}
                      onChange={(e) => setEditingTagName(e.target.value)}
                      onBlur={async () => {
                        if (editingTagName.trim() && editingTagName.trim() !== tag.name) {
                          await api.patch(`/api/tags/${tag.id}`, { name: editingTagName.trim() });
                          setAllTags((prev) => prev.map((t) => (t.id === tag.id ? { ...t, name: editingTagName.trim() } : t)));
                        }
                        setEditingTagId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setEditingTagId(null);
                      }}
                      style={{
                        flex: 1,
                        padding: "3px 6px",
                        fontSize: "13px",
                        backgroundColor: "var(--bg)",
                        border: "1px solid var(--color-primary)",
                        borderRadius: "4px",
                        color: "var(--text-primary)",
                        outline: "none",
                      }}
                    />
                  ) : (
                    <span
                      style={{ flex: 1, fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}
                    >
                      {tag.name}
                    </span>
                  )}
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      color: "var(--text-dim)",
                      padding: "1px 6px",
                      backgroundColor: "var(--bg)",
                      borderRadius: "10px",
                    }}
                  >
                    {tag.usageCount}
                  </span>
                  <button
                    onClick={() => {
                      setEditingTagId(tag.id);
                      setEditingTagName(tag.name);
                    }}
                    title="Rename"
                    style={{
                      padding: "3px",
                      backgroundColor: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      display: "flex",
                    }}
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={async () => {
                      await api.delete(`/api/tags/${tag.id}`);
                      setAllTags((prev) => prev.filter((t) => t.id !== tag.id));
                      flash(`Tag "${tag.name}" deleted`);
                    }}
                    title="Delete tag"
                    style={{
                      padding: "3px",
                      backgroundColor: "transparent",
                      border: "none",
                      color: "var(--color-danger)",
                      cursor: "pointer",
                      display: "flex",
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Behavior */}
        <Section title="Behavior">
          <SettingRow label="Default Priority" description="Priority assigned to new todos">
            <select
              value={settings.defaultPriority}
              onChange={(e) => updateSetting("defaultPriority", e.target.value)}
              style={{
                padding: "5px 10px",
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                color: "var(--text-primary)",
                fontSize: "12px",
                outline: "none",
              }}
            >
              <option value="highest">Highest</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="lowest">Lowest</option>
            </select>
          </SettingRow>
          <SettingRow label="Calendar Open by Default" description="Show the calendar sidebar on startup">
            <Toggle value={settings.calendarOpen} onChange={(v) => updateSetting("calendarOpen", v)} />
          </SettingRow>
          <SettingRow label="Show Backlog Section" description="Display overdue items from past days">
            <Toggle value={settings.showBacklog} onChange={(v) => updateSetting("showBacklog", v)} />
          </SettingRow>
          <SettingRow label="Show Progress Ring" description="Daily completion tracker in the header">
            <Toggle value={settings.showProgressRing} onChange={(v) => updateSetting("showProgressRing", v)} />
          </SettingRow>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <SettingRow
            label="Daily Summary"
            description={`Browser notification on page load. Current: ${Notification.permission}`}
          >
            <Toggle
              value={settings.notificationsEnabled}
              onChange={(v) => {
                updateSetting("notificationsEnabled", v);
                if (v && Notification.permission === "default") {
                  Notification.requestPermission();
                }
              }}
            />
          </SettingRow>
        </Section>

        {/* Data Management */}
        <Section title="Data">
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            <ActionButton onClick={handleBackup} color="var(--color-primary)">
              Download Backup
            </ActionButton>
            <ActionButton onClick={handleImport} color="var(--color-primary)">
              Import Backup
            </ActionButton>
          </div>

          <div
            style={{
              padding: "16px",
              backgroundColor: "rgba(239, 68, 68, 0.05)",
              border: "1px solid rgba(239, 68, 68, 0.15)",
              borderRadius: "10px",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-danger)", marginBottom: "8px" }}>
              Danger Zone
            </div>

            {confirmReset === null ? (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <ActionButton onClick={() => setConfirmReset("todos")} color="var(--color-danger)">
                  Reset Todos
                </ActionButton>
                <ActionButton onClick={() => setConfirmReset("all")} color="var(--color-danger)">
                  Factory Reset
                </ActionButton>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "13px", color: "var(--text-primary)", marginBottom: "12px" }}>
                  {confirmReset === "todos"
                    ? "This will delete all todos and uploaded files. Your account stays."
                    : "This will delete EVERYTHING — todos, files, and your account. You'll need to set up again."}
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <ActionButton
                    onClick={async () => {
                      if (confirmReset === "todos") {
                        await handleBackup();
                      }
                      handleReset(confirmReset);
                    }}
                    color="var(--color-danger)"
                  >
                    {confirmReset === "todos" ? "Backup & Reset" : "Yes, delete everything"}
                  </ActionButton>
                  {confirmReset === "todos" && (
                    <ActionButton onClick={() => handleReset("todos")} color="var(--color-danger)">
                      Reset without backup
                    </ActionButton>
                  )}
                  <ActionButton onClick={() => setConfirmReset(null)} color="var(--text-muted)">
                    Cancel
                  </ActionButton>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Keyboard shortcuts reference */}
        <Section title="Keyboard Shortcuts">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "6px 16px",
              fontSize: "13px",
            }}
          >
            {[
              ["⌘K", "Command palette (everything else)"],
              ["⌘1–9", "Switch space"],
              ["↑ / ↓", "Navigate list"],
              ["→ / Enter", "Open focused todo"],
              ["←", "Close detail panel"],
              ["Space", "Toggle complete"],
              ["Esc", "Close panel / palette"],
            ].map(([key, desc]) => (
              <div key={key} style={{ display: "contents" }}>
                <kbd
                  style={{
                    padding: "2px 8px",
                    backgroundColor: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    color: "var(--text-secondary)",
                    textAlign: "center",
                    display: "inline-block",
                  }}
                >
                  {key}
                </kbd>
                <span style={{ color: "var(--text-primary)", alignSelf: "center" }}>{desc}</span>
              </div>
            ))}
          </div>
        </Section>

        <div
          style={{
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--text-dim)",
            padding: "30px 0",
          }}
        >
          devtodo v1.0 // local-first developer todos
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "var(--text-muted)",
          marginBottom: "12px",
        }}
      >
        {title}
      </div>
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "16px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
            {description}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: "40px",
        height: "22px",
        borderRadius: "11px",
        border: "none",
        backgroundColor: value ? "var(--color-primary)" : "var(--border)",
        cursor: "pointer",
        position: "relative",
        transition: "background-color 0.2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          backgroundColor: "white",
          position: "absolute",
          top: "3px",
          left: value ? "21px" : "3px",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        padding: "12px",
        backgroundColor: "var(--bg)",
        borderRadius: "8px",
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
        {value}
      </div>
      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
        {label}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  color,
}: {
  children: React.ReactNode;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px",
        backgroundColor: `${color}15`,
        border: `1px solid ${color}30`,
        borderRadius: "6px",
        color,
        fontSize: "12px",
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function SpacesSection() {
  const { spaces, currentSpaceId, switchSpace, refreshSpaces } = useSpace();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(SPACE_COLORS[0]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      await api.post("/api/spaces", {
        name: newName.trim(),
        color: newColor,
        icon: newName.trim().charAt(0).toUpperCase(),
      });
      await refreshSpaces();
      setCreating(false);
      setNewName("");
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(space: Space) {
    if (!confirm(`Delete "${space.name}" and all its todos? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/spaces/${space.id}`);
      // If we deleted the current one, switch to first remaining
      if (space.id === currentSpaceId) {
        const remaining = spaces.find((s) => s.id !== space.id);
        if (remaining) switchSpace(remaining.id);
      }
      await refreshSpaces();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function updateSpace(id: number, fields: Partial<Pick<Space, "name" | "color" | "icon">>) {
    try {
      await api.patch(`/api/spaces/${id}`, fields);
      await refreshSpaces();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div style={{ marginBottom: "28px" }}>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "var(--text-muted)",
          marginBottom: "12px",
        }}
      >
        Spaces
      </div>
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "12px",
        }}
      >
        {spaces.map((space) => (
          <div
            key={space.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 4px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <input
              type="color"
              value={space.color}
              onChange={(e) => updateSpace(space.id, { color: e.target.value })}
              style={{
                width: "28px",
                height: "28px",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                padding: 0,
                backgroundColor: "transparent",
              }}
            />
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "var(--radius-md)",
                background: `linear-gradient(135deg, ${space.color}, ${space.color}cc)`,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 700,
                flexShrink: 0,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 3px ${space.color}66`,
              }}
            >
              {space.icon || space.name.charAt(0).toUpperCase()}
            </div>
            {editingId === space.id ? (
              <input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => {
                  if (editingName.trim() && editingName.trim() !== space.name) {
                    updateSpace(space.id, { name: editingName.trim() });
                  }
                  setEditingId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setEditingId(null);
                }}
                style={{
                  flex: 1,
                  padding: "4px 8px",
                  fontSize: "var(--text-base)",
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--color-primary)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              />
            ) : (
              <span
                style={{
                  flex: 1,
                  fontSize: "var(--text-base)",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                {space.name}
                {space.id === currentSpaceId && (
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "10px",
                      color: space.color,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    active
                  </span>
                )}
              </span>
            )}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--text-dim)",
                padding: "2px 8px",
                backgroundColor: "var(--bg)",
                borderRadius: "var(--radius-full)",
              }}
            >
              {space.todoCount} todos
            </span>
            <button
              onClick={() => {
                setEditingId(space.id);
                setEditingName(space.name);
              }}
              title="Rename"
              style={{
                padding: "5px",
                backgroundColor: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                display: "flex",
              }}
            >
              <Edit3 size={13} />
            </button>
            <button
              onClick={() => handleDelete(space)}
              disabled={spaces.length <= 1}
              title={spaces.length <= 1 ? "Can't delete last space" : "Delete space"}
              style={{
                padding: "5px",
                backgroundColor: "transparent",
                border: "none",
                color: spaces.length <= 1 ? "var(--text-dim)" : "var(--color-danger)",
                cursor: spaces.length <= 1 ? "not-allowed" : "pointer",
                display: "flex",
                opacity: spaces.length <= 1 ? 0.4 : 1,
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}

        {/* Create new space */}
        {creating ? (
          <div style={{ padding: "12px 4px 4px" }}>
            <input
              autoFocus
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
                padding: "8px 10px",
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "var(--text-base)",
                outline: "none",
                boxSizing: "border-box",
                marginBottom: "8px",
              }}
            />
            <div style={{ display: "flex", gap: "4px", marginBottom: "8px", flexWrap: "wrap" }}>
              {SPACE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    backgroundColor: c,
                    border: newColor === c ? "2px solid var(--text-primary)" : "2px solid transparent",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                style={{
                  flex: 1,
                  padding: "7px",
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
                Create space
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setNewName("");
                }}
                style={{
                  padding: "7px 14px",
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
          <button
            onClick={() => setCreating(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "10px 4px",
              marginTop: "4px",
              backgroundColor: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "var(--text-base)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "var(--radius-md)",
                border: "1px dashed var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Plus size={14} />
            </span>
            New space
          </button>
        )}
      </div>
    </div>
  );
}

export { getSettings, type AppSettings };
