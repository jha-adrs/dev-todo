import { useState, useEffect } from "react";
import { X, Maximize2, Minimize2, Trash2, Pin, Archive } from "lucide-react";
import type { Note } from "../hooks/useNotes";
import RichTextEditor from "./RichTextEditor";

interface NoteDetailPanelProps {
  note: Note;
  onClose: () => void;
  onUpdate: (id: number, fields: Partial<Pick<Note, "title" | "content" | "pinned" | "archived">>) => void;
  onDelete: (id: number) => void;
  isFullPage: boolean;
  onToggleFullPage: () => void;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "yesterday";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NoteDetailPanel({
  note,
  onClose,
  onUpdate,
  onDelete,
  isFullPage,
  onToggleFullPage,
}: NoteDetailPanelProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(note.title);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setTitleValue(note.title);
    setConfirmDelete(false);
  }, [note.id, note.title]);

  function handleTitleSave() {
    setEditingTitle(false);
    if (titleValue.trim() !== note.title) {
      onUpdate(note.id, { title: titleValue.trim() });
    } else {
      setTitleValue(note.title);
    }
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg-elevated)",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "3px",
              border: `2px solid ${note.pinned === 1 ? "var(--color-primary)" : "var(--border)"}`,
              backgroundColor: note.pinned === 1 ? "var(--color-primary-dim)" : "transparent",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--text-muted)",
            }}
          >
            NOTE-{note.id}
          </span>
          {note.archived === 1 && (
            <span
              style={{
                fontSize: "9px",
                padding: "2px 6px",
                backgroundColor: "var(--bg-card)",
                color: "var(--text-muted)",
                borderRadius: "4px",
                fontWeight: 600,
              }}
            >
              ARCHIVED
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={onToggleFullPage}
            title={isFullPage ? "Collapse" : "Expand"}
            style={{
              padding: "4px 8px",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              color: "var(--text-muted)",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            {isFullPage ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={onClose}
            title="Close (Esc)"
            style={{
              padding: "4px 8px",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              color: "var(--text-muted)",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Panel content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {/* Title */}
        {editingTitle ? (
          <input
            autoFocus
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSave();
              if (e.key === "Escape") {
                setTitleValue(note.title);
                setEditingTitle(false);
              }
            }}
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "var(--text-primary)",
              backgroundColor: "transparent",
              border: "1px solid var(--color-primary)",
              borderRadius: "6px",
              padding: "4px 8px",
              width: "100%",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: "4px",
            }}
          />
        ) : (
          <h2
            onClick={() => setEditingTitle(true)}
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: note.title ? "var(--text-primary)" : "var(--text-dim)",
              fontStyle: note.title ? "normal" : "italic",
              margin: "0 0 4px",
              cursor: "text",
              lineHeight: 1.3,
            }}
          >
            {note.title || "Untitled"}
          </h2>
        )}

        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--text-muted)",
            marginBottom: "20px",
          }}
        >
          created {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          {" · "}edited {relativeTime(note.updatedAt)}
        </div>

        {/* Note content */}
        <div
          style={{
            fontSize: "10px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "var(--text-muted)",
            marginBottom: "8px",
          }}
        >
          Content
        </div>
        <RichTextEditor
          todoId={note.id}
          content={note.content}
          onChange={(html) => onUpdate(note.id, { content: html })}
        />

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", marginTop: "20px", flexWrap: "wrap" }}>
          <button
            onClick={() => onUpdate(note.id, { pinned: note.pinned === 1 ? 0 : 1 })}
            title={note.pinned === 1 ? "Unpin" : "Pin to top"}
            style={{
              flex: 1,
              padding: "9px",
              backgroundColor: note.pinned === 1 ? "var(--color-primary-dim)" : "var(--bg-card)",
              color: note.pinned === 1 ? "var(--color-primary-light)" : "var(--text-secondary)",
              border: note.pinned === 1 ? "1px solid var(--color-primary-border)" : "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <Pin size={15} />
            {note.pinned === 1 ? "Unpin" : "Pin"}
          </button>
          <button
            onClick={() => onUpdate(note.id, { archived: note.archived === 1 ? 0 : 1 })}
            title={note.archived === 1 ? "Unarchive" : "Archive"}
            style={{
              flex: 1,
              padding: "9px",
              backgroundColor: note.archived === 1 ? "var(--bg-card)" : "var(--bg-card)",
              color: note.archived === 1 ? "var(--text-primary)" : "var(--text-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <Archive size={15} />
            {note.archived === 1 ? "Unarchive" : "Archive"}
          </button>
          <button
            onClick={() => {
              if (confirmDelete) {
                onDelete(note.id);
                onClose();
              } else {
                setConfirmDelete(true);
                setTimeout(() => setConfirmDelete(false), 3000);
              }
            }}
            style={{
              padding: "9px 14px",
              backgroundColor: confirmDelete ? "var(--color-danger)" : "var(--bg-card)",
              color: confirmDelete ? "white" : "var(--color-danger)",
              border: confirmDelete ? "none" : "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Trash2 size={15} />
            {confirmDelete ? "Confirm?" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
