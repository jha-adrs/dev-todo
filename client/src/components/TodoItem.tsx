import { useState } from "react";
import { motion } from "motion/react";
import { Check, X, Pin } from "lucide-react";
import type { Todo } from "../hooks/useTodos";
import PriorityIcon from "./PriorityIcon";
import TagChip from "./TagChip";

interface TodoItemProps {
  todo: Todo;
  index?: number;
  isBacklog?: boolean;
  isFocused?: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onClick: () => void;
}

export default function TodoItem({
  todo,
  index,
  isBacklog,
  isFocused,
  onToggle,
  onDelete,
  onClick,
}: TodoItemProps) {
  const isCompleted = todo.status === "completed";
  const [showConfetti, setShowConfetti] = useState(false);

  function handleToggle() {
    if (!isCompleted) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 500);
    }
    onToggle();
  }

  return (
    <motion.div
      data-todo-item
      data-idx={index}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.25 }}
      onClick={onClick}
      style={{
        padding: "10px 14px 10px 18px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        cursor: "pointer",
        borderRadius: "8px",
        borderLeft: isFocused
          ? "4px solid var(--color-primary)"
          : isBacklog
            ? "4px solid var(--color-amber)"
            : todo.pinned === 1
              ? "4px solid var(--color-primary-50)"
              : "4px solid transparent",
        backgroundColor: isFocused
          ? "var(--color-primary-dim)"
          : "transparent",
        boxShadow: isFocused ? "0 0 0 1px var(--color-primary-border)" : "none",
        position: "relative",
        transition: "border-left-color 0.15s, background-color 0.15s, box-shadow 0.15s",
      }}
      whileHover={{ backgroundColor: "var(--color-primary-dim)" }}
    >
      {/* Focus indicator chevron */}
      {isFocused && (
        <motion.div
          layoutId="focus-indicator"
          initial={false}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{
            position: "absolute",
            left: "-9px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: "var(--color-primary)",
            boxShadow: "0 0 8px var(--color-primary)",
          }}
        />
      )}
      {/* Checkbox */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "4px",
          border: `2px solid ${isCompleted ? "var(--color-green)" : isBacklog ? "var(--color-amber)" : "var(--color-primary)"}`,
          backgroundColor: isCompleted ? "var(--color-green)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          cursor: "pointer",
          transition: "all 0.2s",
          position: "relative",
        }}
      >
        {isCompleted && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ duration: 0.3 }}
          >
            <Check size={12} color="white" strokeWidth={3} />
          </motion.div>
        )}
        {showConfetti && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: "absolute",
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              border: "2px solid var(--color-green)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {todo.priority && todo.priority !== "medium" && (
            <PriorityIcon priority={todo.priority} />
          )}
          <span
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: isCompleted
                ? "var(--text-muted)"
                : isBacklog
                  ? "var(--color-amber)"
                  : "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              transition: "color 0.3s",
            }}
          >
            {todo.title}
          </span>
          {isCompleted && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                right: 0,
                height: "1px",
                backgroundColor: "var(--text-muted)",
                transformOrigin: "left",
              }}
            />
          )}
        </div>
        {isBacklog && todo.overdueDays ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--color-amber-text)",
              marginTop: "2px",
            }}
          >
            overdue by {todo.overdueDays} day{todo.overdueDays > 1 ? "s" : ""}
          </div>
        ) : todo.dueDate && todo.dueDate !== new Date().toISOString().split("T")[0] ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}
          >
            due {todo.dueDate}
          </div>
        ) : null}
        {todo.tags && todo.tags.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "3px",
              marginTop: "3px",
              flexWrap: "wrap",
            }}
          >
            {todo.tags.slice(0, 3).map((tag) => (
              <TagChip key={tag.id} tag={tag} />
            ))}
            {todo.tags.length > 3 && (
              <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                +{todo.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Pin indicator */}
      {todo.pinned === 1 && (
        <Pin
          size={13}
          style={{ flexShrink: 0, opacity: 0.4, color: "var(--color-primary-light)" }}
        />
      )}

      {/* Delete button */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="todo-delete-btn"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1, backgroundColor: "var(--color-danger-dim)" }}
        style={{
          opacity: 0,
          padding: "4px",
          backgroundColor: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          color: "var(--color-danger)",
          cursor: "pointer",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={14} />
      </motion.button>

    </motion.div>
  );
}
