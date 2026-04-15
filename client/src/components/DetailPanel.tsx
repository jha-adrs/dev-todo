import { useState, useEffect } from "react";
import { X, Maximize2, Minimize2, Trash2, Check, Pin } from "lucide-react";
import type { Todo } from "../hooks/useTodos";
import RichTextEditor from "./RichTextEditor";
import { PrioritySelect } from "./PriorityIcon";
import TagSelector from "./TagSelector";
import SnoozePopover from "./SnoozePopover";
import type { Priority } from "../hooks/useTodos";

interface DetailPanelProps {
  todo: Todo;
  onClose: () => void;
  onUpdate: (id: number, fields: Partial<Pick<Todo, "title" | "description" | "status" | "priority" | "dueDate" | "pinned" | "snoozedUntil">>) => void;
  onDelete: (id: number) => void;
  isFullPage: boolean;
  onToggleFullPage: () => void;
}

export default function DetailPanel({
  todo,
  onClose,
  onUpdate,
  onDelete,
  isFullPage,
  onToggleFullPage,
}: DetailPanelProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(todo.title);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setTitleValue(todo.title);
    setConfirmDelete(false);
  }, [todo.id, todo.title]);

  function handleTitleSave() {
    setEditingTitle(false);
    if (titleValue.trim() && titleValue.trim() !== todo.title) {
      onUpdate(todo.id, { title: titleValue.trim() });
    } else {
      setTitleValue(todo.title);
    }
  }

  const statuses: Array<{ value: Todo["status"]; label: string }> = [
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Done" },
  ];

  const isBacklog = todo.overdueDays !== undefined && todo.overdueDays > 0;

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
              border: `2px solid ${todo.status === "completed" ? "var(--color-green)" : isBacklog ? "var(--color-amber)" : "var(--color-primary)"}`,
              backgroundColor: todo.status === "completed" ? "var(--color-green)" : "transparent",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--text-muted)",
            }}
          >
            TODO-{todo.id}
          </span>
          {isBacklog && (
            <span
              style={{
                fontSize: "9px",
                padding: "2px 6px",
                backgroundColor: "var(--color-amber-dim)",
                color: "var(--color-amber)",
                borderRadius: "4px",
                fontWeight: 600,
              }}
            >
              BACKLOG
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
                setTitleValue(todo.title);
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
              color: "var(--text-primary)",
              margin: "0 0 4px",
              cursor: "text",
              lineHeight: 1.3,
            }}
          >
            {todo.title}
          </h2>
        )}

        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--text-muted)",
            marginBottom: "16px",
          }}
        >
          created {todo.createdAt.split(" ")[0]}
          {todo.completedAt && ` // completed ${todo.completedAt.split("T")[0]}`}
        </div>

        {/* Status toggle */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "20px" }}>
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => onUpdate(todo.id, { status: s.value })}
              style={{
                padding: "5px 12px",
                fontSize: "11px",
                fontWeight: 500,
                borderRadius: "6px",
                cursor: "pointer",
                border:
                  todo.status === s.value
                    ? "1px solid var(--color-primary-border)"
                    : "1px solid var(--border)",
                backgroundColor:
                  todo.status === s.value
                    ? "var(--color-primary-dim)"
                    : "var(--bg-card)",
                color:
                  todo.status === s.value
                    ? "var(--color-primary-light)"
                    : "var(--text-secondary)",
                transition: "all 0.15s",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Priority + Due Date */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
          <div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--text-muted)",
                marginBottom: "6px",
              }}
            >
              Priority
            </div>
            <PrioritySelect
              value={(todo.priority || "medium") as Priority}
              onChange={(p) => onUpdate(todo.id, { priority: p } )}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--text-muted)",
                marginBottom: "6px",
              }}
            >
              Due Date
            </div>
            <input
              type="date"
              value={todo.dueDate}
              onChange={(e) => onUpdate(todo.id, { dueDate: e.target.value } )}
              style={{
                padding: "5px 10px",
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                outline: "none",
                colorScheme: "dark",
              }}
            />
          </div>
        </div>

        {/* Tags */}
        <div
          style={{
            fontSize: "10px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "var(--text-muted)",
            marginBottom: "6px",
          }}
        >
          Tags
        </div>
        <div style={{ marginBottom: "20px" }}>
          <TagSelector
            todoId={todo.id}
            currentTags={todo.tags || []}
            onTagsChange={() => {
              // Tags update happens via API, re-fetch will pick it up
            }}
          />
        </div>

        {/* Snooze */}
        <div style={{ marginBottom: "20px" }}>
          <SnoozePopover
            currentSnooze={todo.snoozedUntil}
            onSnooze={(date) => onUpdate(todo.id, { snoozedUntil: date })}
          />
        </div>

        {/* Description */}
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
          Description
        </div>
        <RichTextEditor
          todoId={todo.id}
          content={todo.description}
          onChange={(html) => onUpdate(todo.id, { description: html })}
        />

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", marginTop: "20px", flexWrap: "wrap" }}>
          <button
            onClick={() =>
              onUpdate(todo.id, {
                status: todo.status === "completed" ? "pending" : "completed",
              })
            }
            style={{
              flex: 1,
              padding: "9px",
              backgroundColor:
                todo.status === "completed"
                  ? "var(--bg-card)"
                  : "var(--color-green)",
              color: todo.status === "completed" ? "var(--text-secondary)" : "white",
              border:
                todo.status === "completed"
                  ? "1px solid var(--border)"
                  : "none",
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
            <Check size={15} />
            {todo.status === "completed" ? "Reopen" : "Mark Done"}
          </button>
          <button
            onClick={() => onUpdate(todo.id, { pinned: todo.pinned === 1 ? 0 : 1 })}
            title={todo.pinned === 1 ? "Unpin" : "Pin to top"}
            style={{
              padding: "9px 12px",
              backgroundColor: todo.pinned === 1 ? "var(--color-primary-dim)" : "var(--bg-card)",
              color: todo.pinned === 1 ? "var(--color-primary-light)" : "var(--text-secondary)",
              border: todo.pinned === 1 ? "1px solid var(--color-primary-border)" : "1px solid var(--border)",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Pin size={15} />
          </button>
          <button
            onClick={() => {
              if (confirmDelete) {
                onDelete(todo.id);
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
