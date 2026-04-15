import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "./hooks/useAuth";
import { useTodos } from "./hooks/useTodos";
import LoginPage from "./components/LoginPage";
import TodoList from "./components/TodoList";
import DetailPanel from "./components/DetailPanel";
import CommandPalette, { type CommandAction } from "./components/CommandPalette";
import CalendarSidebar from "./components/CalendarSidebar";
import DbExplorer from "./components/DbExplorer";
import SettingsPage from "./components/SettingsPage";
import { toggleTheme } from "./lib/theme";
import { requestPermission, showDailySummaryOnce } from "./lib/notifications";
import { SpaceProvider, useSpace } from "./contexts/SpaceContext";

export default function App() {
  const { loading: authLoading, authenticated, needsSetup, setup, login, logout } = useAuth();
  const [selectedTodoId, setSelectedTodoId] = useState<number | null>(null);
  const [isFullPage, setIsFullPage] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [showDbExplorer, setShowDbExplorer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Global shortcuts — only Cmd+K and Esc. Everything else through command palette.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Escape: close command palette first, then detail panel
      if (e.key === "Escape") {
        if (cmdPaletteOpen) {
          setCmdPaletteOpen(false);
          return;
        }
        if (selectedTodoId) {
          setSelectedTodoId(null);
          setIsFullPage(false);
          return;
        }
      }

      // Cmd+K — command palette (no other Cmd shortcuts to avoid browser collisions)
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCmdPaletteOpen((v) => !v);
        return;
      }
    },
    [selectedTodoId, cmdPaletteOpen],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              background: "var(--color-primary)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 700,
              fontSize: "16px",
            }}
          >
            D
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              color: "var(--text-muted)",
            }}
          >
            loading...
          </span>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage needsSetup={needsSetup} onSetup={setup} onLogin={login} />;
  }

  return (
    <SpaceProvider>
      <AuthenticatedApp
        onLogout={logout}
        selectedTodoId={selectedTodoId}
        setSelectedTodoId={setSelectedTodoId}
        isFullPage={isFullPage}
        setIsFullPage={setIsFullPage}
        cmdPaletteOpen={cmdPaletteOpen}
        setCmdPaletteOpen={setCmdPaletteOpen}
        calendarOpen={calendarOpen}
        setCalendarOpen={setCalendarOpen}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        showDbExplorer={showDbExplorer}
        setShowDbExplorer={setShowDbExplorer}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
      />
    </SpaceProvider>
  );
}

function AuthenticatedApp({
  onLogout,
  selectedTodoId,
  setSelectedTodoId,
  isFullPage,
  setIsFullPage,
  cmdPaletteOpen,
  setCmdPaletteOpen,
  calendarOpen,
  setCalendarOpen,
  selectedDate,
  setSelectedDate,
  showDbExplorer,
  setShowDbExplorer,
  showSettings,
  setShowSettings,
}: {
  onLogout: () => void;
  selectedTodoId: number | null;
  setSelectedTodoId: (id: number | null) => void;
  isFullPage: boolean;
  setIsFullPage: (v: boolean) => void;
  cmdPaletteOpen: boolean;
  setCmdPaletteOpen: (v: boolean) => void;
  calendarOpen: boolean;
  setCalendarOpen: (v: boolean) => void;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  showDbExplorer: boolean;
  setShowDbExplorer: (v: boolean) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const isViewingToday = selectedDate === todayStr;
  const { today, backlog, loading, stats, createTodo, updateTodo, deleteTodo } = useTodos(
    isViewingToday ? undefined : selectedDate,
  );
  const allTodos = [...today, ...backlog];
  const selectedTodo = selectedTodoId ? allTodos.find((t) => t.id === selectedTodoId) : null;
  const { spaces, currentSpace, switchSpace, loading: spacesLoading } = useSpace();
  const [switchToast, setSwitchToast] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedTodoId && !selectedTodo) {
      setSelectedTodoId(null);
    }
  }, [selectedTodoId, selectedTodo, setSelectedTodoId]);

  // Track focused index against current todos so it stays valid
  useEffect(() => {
    if (focusedIndex >= allTodos.length) {
      setFocusedIndex(allTodos.length - 1);
    }
  }, [allTodos.length, focusedIndex]);

  // Left arrow closes detail panel (only when not in an input + no modifier)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      const isMod = e.metaKey || e.ctrlKey || e.altKey;

      if (e.key === "ArrowLeft" && selectedTodoId && !isInput && !isMod) {
        e.preventDefault();
        setSelectedTodoId(null);
        setIsFullPage(false);
        setTimeout(() => listRef.current?.focus(), 0);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedTodoId, setSelectedTodoId, setIsFullPage]);

  // Cmd+1..9 to switch spaces (works everywhere, modifier prevents conflict with typing)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (!/^[1-9]$/.test(e.key)) return;

      const idx = parseInt(e.key, 10) - 1;
      if (spaces[idx]) {
        e.preventDefault();
        switchSpace(spaces[idx].id);
        setSwitchToast(spaces[idx].name);
        setTimeout(() => setSwitchToast(null), 1500);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [spaces, switchSpace]);

  // Request notification permission + show daily summary once
  useEffect(() => {
    if (!loading && isViewingToday) {
      requestPermission().then(() => {
        showDailySummaryOnce(stats);
      });
    }
  }, [loading, isViewingToday, stats]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const cmdActions: CommandAction[] = useMemo(
    () => [
      {
        id: "new",
        label: "New todo",
        icon: "+",
        action: () => {
          const input = document.querySelector<HTMLInputElement>(
            'input[placeholder*="What needs"]',
          );
          input?.focus();
        },
      },
      {
        id: "focus-list",
        label: "Focus todo list",
        icon: "↕",
        action: () => listRef.current?.focus(),
      },
      {
        id: "calendar",
        label: "Toggle calendar",
        icon: "▦",
        action: () => setCalendarOpen(!calendarOpen),
      },
      {
        id: "theme",
        label: "Toggle theme",
        icon: "◑",
        action: () => {
          toggleTheme();
          window.dispatchEvent(new Event("themechange"));
        },
      },
      {
        id: "settings",
        label: "Settings",
        icon: "⚙",
        action: () => setShowSettings(true),
      },
      {
        id: "db",
        label: "Database explorer",
        icon: "⊞",
        action: () => setShowDbExplorer(true),
      },
      {
        id: "logout",
        label: "Logout",
        icon: "→",
        action: onLogout,
      },
    ],
    [onLogout, setShowDbExplorer, setShowSettings, calendarOpen, setCalendarOpen],
  );

  if (showSettings) {
    return <SettingsPage onBack={() => setShowSettings(false)} onLogout={onLogout} />;
  }

  if (showDbExplorer) {
    return <DbExplorer onBack={() => setShowDbExplorer(false)} />;
  }

  if (spacesLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
          }}
        >
          loading workspaces...
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        display: "flex",
        position: "relative",
      }}
    >
      {/* Top accent bar — gradient colored by current space */}
      {currentSpace && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: `linear-gradient(90deg, ${currentSpace.color}, ${currentSpace.color}cc 50%, ${currentSpace.color})`,
              zIndex: 100,
              transition: "background 0.3s",
            }}
          />
          {/* Subtle ambient glow at top — barely visible, adds depth */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              height: "120px",
              background: `radial-gradient(ellipse at top, ${currentSpace.color}10, transparent 70%)`,
              zIndex: 1,
              pointerEvents: "none",
              transition: "background 0.3s",
            }}
          />
        </>
      )}

      {/* Switch toast */}
      {switchToast && (
        <div
          style={{
            position: "fixed",
            top: "var(--sp-5)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 200,
            padding: "var(--sp-2) var(--sp-4)",
            backgroundColor: "var(--bg-card)",
            border: `1px solid ${currentSpace?.color || "var(--border)"}`,
            borderRadius: "var(--radius-full)",
            color: "var(--text-primary)",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            boxShadow: "var(--shadow-lg)",
            display: "flex",
            alignItems: "center",
            gap: "var(--sp-2)",
            animation: "fadeInOut 1.5s ease-out forwards",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: currentSpace?.color || "var(--text-muted)",
            }}
          />
          {switchToast}
        </div>
      )}

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          15%, 85% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
        }
      `}</style>

      {/* Command palette */}
      <CommandPalette
        open={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        actions={cmdActions}
        todos={allTodos}
        onSelectTodo={(id) => setSelectedTodoId(id)}
      />

      {/* Calendar sidebar */}
      <CalendarSidebar
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      {/* Todo list */}
      {!(isMobile && selectedTodo) && !isFullPage && (
        <div
          style={{
            width: selectedTodo ? "50%" : "100%",
            maxWidth: selectedTodo ? undefined : "700px",
            margin: selectedTodo ? undefined : "0 auto",
            transition: "width 0.3s ease",
            height: "100vh",
            overflow: "hidden",
          }}
        >
          <TodoList
            today={today}
            backlog={backlog}
            loading={loading}
            stats={stats}
            selectedDate={selectedDate}
            onLogout={onLogout}
            selectedTodoId={selectedTodoId}
            onSelectTodo={setSelectedTodoId}
            onCreateTodo={createTodo}
            onUpdateTodo={updateTodo}
            onDeleteTodo={deleteTodo}
            onToggleCalendar={() => setCalendarOpen(!calendarOpen)}
            onOpenSettings={() => setShowSettings(true)}
            focusedIndex={focusedIndex}
            setFocusedIndex={setFocusedIndex}
            listRef={listRef}
          />
        </div>
      )}

      {/* Detail panel */}
      {selectedTodo && (
        <div
          style={{
            width: isFullPage || isMobile ? "100%" : "50%",
            position: isMobile ? "fixed" : "relative",
            top: isMobile ? 0 : undefined,
            left: isMobile ? 0 : undefined,
            right: isMobile ? 0 : undefined,
            bottom: isMobile ? 0 : undefined,
            zIndex: isMobile ? 50 : undefined,
            borderLeft: isFullPage || isMobile ? "none" : "1px solid var(--border)",
            height: "100vh",
            transition: "width 0.3s ease",
          }}
        >
          <DetailPanel
            todo={selectedTodo}
            onClose={() => {
              setSelectedTodoId(null);
              setIsFullPage(false);
            }}
            onUpdate={updateTodo}
            onDelete={deleteTodo}
            isFullPage={isFullPage}
            onToggleFullPage={() => setIsFullPage(!isFullPage)}
          />
        </div>
      )}
    </div>
  );
}
