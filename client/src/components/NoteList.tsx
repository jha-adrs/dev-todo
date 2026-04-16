import { AnimatePresence, motion } from "motion/react";
import { Plus, Pin, Archive } from "lucide-react";
import type { Note } from "../hooks/useNotes";

// Helper to strip HTML for preview
function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
}

// Helper for relative time
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "yesterday";
  return `${Math.floor(diff / 86400)}d ago`;
}

interface NoteListProps {
  notes: Note[];
  loading: boolean;
  showArchived: boolean;
  onToggleArchived: () => void;
  selectedNoteId: number | null;
  onSelectNote: (id: number | null) => void;
  onCreateNote: () => Promise<Note>;
  onSwitchToTodos?: () => void;
}

export default function NoteList({
  notes,
  loading,
  showArchived,
  onToggleArchived,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onSwitchToTodos,
}: NoteListProps) {
  const pinnedNotes = notes.filter((n) => n.pinned === 1);
  const regularNotes = notes.filter((n) => n.pinned !== 1);

  async function handleCreate() {
    const note = await onCreateNote();
    onSelectNote(note.id);
  }

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-muted)" }}>
          loading...
        </span>
      </div>
    );
  }

  return (
    <div style={{ outline: "none", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px 0",
        }}
      >
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Notes
          </h1>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}
          >
            {notes.length} note{notes.length !== 1 ? "s" : ""}
            {showArchived ? " (archived)" : ""}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0",
            alignItems: "center",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {onSwitchToTodos && (
            <button
              onClick={onSwitchToTodos}
              title="Back to Todos"
              style={{
                padding: "6px 12px",
                backgroundColor: "var(--bg-card)",
                border: "none",
                borderRight: "1px solid var(--border)",
                borderRadius: 0,
                color: "var(--text-secondary)",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Todos
            </button>
          )}
          <button
            onClick={onToggleArchived}
            title={showArchived ? "Hide archived" : "Show archived"}
            style={{
              padding: "6px 10px",
              backgroundColor: showArchived ? "var(--color-primary-dim)" : "var(--bg-card)",
              border: "none",
              borderRight: "1px solid var(--border)",
              borderRadius: 0,
              color: showArchived ? "var(--color-primary-light)" : "var(--text-secondary)",
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Archive size={16} />
          </button>
          <button
            onClick={handleCreate}
            title="New note"
            style={{
              padding: "6px 10px",
              backgroundColor: "var(--bg-card)",
              border: "none",
              borderRadius: 0,
              color: "var(--text-secondary)",
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Note list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {notes.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
            }}
          >
            {showArchived ? "No archived notes." : "No notes yet. Create one!"}
          </div>
        ) : (
          <>
            {/* Pinned notes */}
            {pinnedNotes.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "0 4px",
                    marginBottom: "8px",
                  }}
                >
                  <Pin size={11} style={{ color: "var(--color-primary)" }} />
                  <span
                    style={{
                      color: "var(--color-primary)",
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Pinned
                  </span>
                </div>
                <div
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "4px",
                  }}
                >
                  <AnimatePresence mode="popLayout">
                    {pinnedNotes.map((note) => (
                      <NoteRow
                        key={note.id}
                        note={note}
                        isSelected={selectedNoteId === note.id}
                        showArchived={showArchived}
                        onSelect={() => onSelectNote(note.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Regular notes */}
            {regularNotes.length > 0 && (
              <div
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "4px",
                }}
              >
                <AnimatePresence mode="popLayout">
                  {regularNotes.map((note) => (
                    <NoteRow
                      key={note.id}
                      note={note}
                      isSelected={selectedNoteId === note.id}
                      showArchived={showArchived}
                      onSelect={() => onSelectNote(note.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface NoteRowProps {
  note: Note;
  isSelected: boolean;
  showArchived: boolean;
  onSelect: () => void;
}

function NoteRow({ note, isSelected, showArchived, onSelect }: NoteRowProps) {
  const preview = note.content ? stripHtml(note.content).slice(0, 80) : "";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: showArchived && note.archived === 1 ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      onClick={onSelect}
      style={{
        padding: "10px 12px",
        borderRadius: "7px",
        cursor: "pointer",
        backgroundColor: isSelected ? "rgba(99,102,241,0.14)" : "transparent",
        borderLeft: isSelected ? "3px solid var(--color-primary)" : "3px solid transparent",
        transition: "background-color 0.1s",
        marginBottom: "2px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <span
          style={{
            fontSize: "14px",
            fontWeight: 500,
            color: note.title ? "var(--text-primary)" : "var(--text-dim)",
            fontStyle: note.title ? "normal" : "italic",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {note.title || "Untitled"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          {note.pinned === 1 && (
            <Pin size={11} style={{ color: "var(--color-primary)", opacity: 0.7 }} />
          )}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--text-muted)",
            }}
          >
            {relativeTime(note.updatedAt)}
          </span>
        </div>
      </div>
      {preview && (
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-secondary)",
            marginTop: "3px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {preview}
        </div>
      )}
    </motion.div>
  );
}
