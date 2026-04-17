import { useState, useRef, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { Calendar, Settings, ChevronRight, Trash2, Plus, LogOut } from "lucide-react";
import SpaceSwitcher from "./SpaceSwitcher";
import type { Todo } from "../hooks/useTodos";
import TodoItem from "./TodoItem";
import EmptyState from "./EmptyState";
import ThemeToggle from "./ThemeToggle";
import ProgressRing from "./ProgressRing";

interface TodoListProps {
  today: Todo[];
  backlog: Todo[];
  loading: boolean;
  stats: { total: number; completed: number; backlogCount: number };
  selectedDate?: string;
  onLogout: () => void;
  selectedTodoId: number | null;
  onSelectTodo: (id: number | null) => void;
  onCreateTodo: (title: string) => Promise<unknown>;
  onUpdateTodo: (id: number, fields: Partial<Pick<Todo, "title" | "description" | "status" | "priority" | "dueDate" | "pinned" | "snoozedUntil">>) => void;
  onDeleteTodo: (id: number) => void;
  onToggleCalendar?: () => void;
  onOpenSettings?: () => void;
  onSwitchToNotes?: () => void;
  focusedIndex?: number;
  setFocusedIndex?: (idx: number | ((prev: number) => number)) => void;
  listRef?: React.RefObject<HTMLDivElement | null>;
}

export default function TodoList({
  today,
  backlog,
  loading,
  stats,
  selectedDate,
  onLogout,
  selectedTodoId,
  onSelectTodo,
  onCreateTodo,
  onUpdateTodo,
  onDeleteTodo,
  onToggleCalendar,
  onOpenSettings,
  onSwitchToNotes,
  focusedIndex: externalFocusedIndex,
  setFocusedIndex: externalSetFocusedIndex,
  listRef,
}: TodoListProps) {
  const [newTitle, setNewTitle] = useState("");
  const [backlogOpen, setBacklogOpen] = useState(true);
  const [internalFocusedIndex, setInternalFocusedIndex] = useState(-1);
  const [inputFocused, setInputFocused] = useState(false);
  const focusedIndex = externalFocusedIndex !== undefined ? externalFocusedIndex : internalFocusedIndex;
  const setFocusedIndex = externalSetFocusedIndex || setInternalFocusedIndex;
  const inputRef = useRef<HTMLInputElement>(null);

  const allItems = [...today, ...(backlogOpen ? backlog : [])];
  const pendingTodos = today.filter((t) => t.status !== "completed");
  const isEmpty = today.length === 0 && backlog.length === 0;
  const allCompleted = today.length > 0 && pendingTodos.length === 0 && backlog.length === 0;

  const todayStr = new Date().toISOString().split("T")[0];
  const viewDate = selectedDate || todayStr;
  const isViewingToday = viewDate === todayStr;
  const viewDateObj = new Date(viewDate + "T12:00:00");
  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dateStr = `${viewDate} // ${dayNames[viewDateObj.getDay()]}`;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await onCreateTodo(newTitle.trim());
    setNewTitle("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Skip when typing in the new-todo input or any other input
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    // Arrow keys + Enter/Space/Right navigate (no single letters that conflict with typing)
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i, 0) === 0 && i < 0 ? 0 : Math.max(i - 1, 0));
    } else if ((e.key === "Enter" || e.key === "ArrowRight") && focusedIndex >= 0) {
      e.preventDefault();
      onSelectTodo(allItems[focusedIndex].id);
    } else if (e.key === " " && focusedIndex >= 0) {
      e.preventDefault();
      const item = allItems[focusedIndex];
      onUpdateTodo(item.id, {
        status: item.status === "completed" ? "pending" : "completed",
      });
    }
  }

  // Auto-focus first item when list gets focus and nothing is selected
  function handleFocus() {
    if (focusedIndex < 0 && allItems.length > 0) {
      setFocusedIndex(0);
    }
  }

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0) return;
    const el = document.querySelector<HTMLElement>(
      `[data-todo-item][data-idx="${focusedIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedIndex]);

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
    <div
      ref={listRef}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      tabIndex={0}
      style={{ outline: "none", height: "100%", display: "flex", flexDirection: "column" }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px 0",
        }}
      >
        <SpaceSwitcher onOpenSettings={onOpenSettings} />
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
          {onSwitchToNotes && (
            <button
              onClick={onSwitchToNotes}
              title="Notes"
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
              Notes
            </button>
          )}
          {onToggleCalendar && (
            <button
              onClick={onToggleCalendar}
              title="Calendar (C)"
              style={{
                padding: "6px 10px",
                backgroundColor: "var(--bg-card)",
                border: "none",
                borderRight: "1px solid var(--border)",
                borderRadius: 0,
                color: "var(--text-secondary)",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Calendar size={16} />
            </button>
          )}
          <ThemeToggle />
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="Settings"
              style={{
                padding: "6px 10px",
                backgroundColor: "var(--bg-card)",
                border: "none",
                borderRight: "1px solid var(--border)",
                borderRadius: 0,
                color: "var(--text-secondary)",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Settings size={16} />
            </button>
          )}
          <button
            onClick={onLogout}
            title="Logout"
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
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Date + stats */}
      <div style={{ padding: "20px 24px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              {isViewingToday ? "Today" : viewDateObj.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
            </h1>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                color: "var(--text-muted)",
                marginTop: "2px",
              }}
            >
              {dateStr}
              {stats.total > 0 &&
                ` — ${stats.total} task${stats.total !== 1 ? "s" : ""}, ${stats.backlogCount} backlog`}
            </div>
          </div>
        </div>

        {/* Progress ring */}
        {stats.total > 0 && (
          <div style={{ marginTop: "16px" }}>
            <ProgressRing
              completed={stats.completed}
              total={stats.total}
              backlogCount={stats.backlogCount}
            />
          </div>
        )}

        <form onSubmit={handleCreate} style={{ marginTop: "16px", position: "relative" }}>
          <Plus
            size={15}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            ref={inputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="What needs to be done?"
            style={{
              width: "100%",
              padding: "10px 60px 10px 36px",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--text-primary)",
              fontSize: "15px",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--color-primary)";
              e.target.style.boxShadow = "0 0 0 2px rgba(99,102,241,0.15)";
              setInputFocused(true);
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border)";
              e.target.style.boxShadow = "none";
              setInputFocused(false);
            }}
          />
          <span
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              opacity: inputFocused ? 1 : 0,
              transition: "opacity 0.2s",
              pointerEvents: "none",
            }}
          >
            <kbd
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--text-muted)",
                padding: "2px 6px",
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
              }}
            >
              ⏎
            </kbd>
          </span>
        </form>

        {/* Navigation hint — visible when list has activity */}
        {allItems.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "10px",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--text-dim)",
              flexWrap: "wrap",
              opacity: 0.6,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <kbd
                style={{
                  padding: "1px 5px",
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "3px",
                }}
              >
                ⌘K
              </kbd>{" "}
              commands
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <kbd
                style={{
                  padding: "1px 5px",
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "3px",
                }}
              >
                ↑↓
              </kbd>{" "}
              navigate
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <kbd
                style={{
                  padding: "1px 5px",
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "3px",
                }}
              >
                →
              </kbd>{" "}
              open
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <kbd
                style={{
                  padding: "1px 5px",
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "3px",
                }}
              >
                space
              </kbd>{" "}
              done
            </span>
          </div>
        )}
      </div>

      {/* Todo list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {isEmpty ? (
          <EmptyState allCompleted={false} />
        ) : allCompleted ? (
          <EmptyState allCompleted={true} />
        ) : (
          <>
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "4px",
              }}
            >
              <AnimatePresence mode="popLayout">
                {today.map((todo, i) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    index={i}
                    isFocused={focusedIndex === i}
                    onToggle={() =>
                      onUpdateTodo(todo.id, {
                        status: todo.status === "completed" ? "pending" : "completed",
                      })
                    }
                    onDelete={() => onDeleteTodo(todo.id)}
                    onClick={() => onSelectTodo(todo.id)}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Clear completed */}
            {today.some((t) => t.status === "completed") && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px", padding: "0 4px" }}>
                <button
                  onClick={() => {
                    today
                      .filter((t) => t.status === "completed")
                      .forEach((t) => onDeleteTodo(t.id));
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    backgroundColor: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={12} />
                  Clear completed
                </button>
              </div>
            )}

            {backlog.length > 0 && (
              <div style={{ marginTop: "20px" }}>
                <button
                  onClick={() => setBacklogOpen(!backlogOpen)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0 4px",
                    marginBottom: "8px",
                  }}
                >
                  <ChevronRight
                    size={14}
                    style={{
                      color: "var(--color-amber)",
                      transition: "transform 0.2s",
                      transform: backlogOpen ? "rotate(90deg)" : "rotate(0deg)",
                    }}
                  />
                  <span
                    style={{
                      color: "var(--color-amber)",
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Backlog ({backlog.length})
                  </span>
                </button>

                {backlogOpen && (
                  <div
                    style={{
                      backgroundColor: "var(--bg-card)",
                      border: "1px solid var(--color-amber-border)",
                      borderRadius: "10px",
                      padding: "4px",
                    }}
                  >
                    <AnimatePresence mode="popLayout">
                      {backlog.map((todo, i) => (
                        <TodoItem
                          key={todo.id}
                          todo={todo}
                          index={today.length + i}
                          isBacklog
                          isFocused={focusedIndex === today.length + i}
                          onToggle={() => onUpdateTodo(todo.id, { status: "completed" })}
                          onDelete={() => onDeleteTodo(todo.id)}
                          onClick={() => onSelectTodo(todo.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
