import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { api } from "../lib/api";
import { useSpace } from "../contexts/SpaceContext";

interface CalendarSidebarProps {
  open: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
}

type CalendarData = Record<string, { total: number; completed: number }>;

const DAY_NAMES = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export default function CalendarSidebar({
  open,
  onClose,
  selectedDate,
  onSelectDate,
}: CalendarSidebarProps) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(selectedDate);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const { currentSpaceId } = useSpace();

  const monthStr = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, "0")}`;

  const fetchCalendar = useCallback(async () => {
    if (!currentSpaceId) return;
    try {
      const data = await api.get<CalendarData>(`/api/todos/calendar?month=${monthStr}`);
      setCalendarData(data);
    } catch {
      setCalendarData({});
    }
  }, [monthStr, currentSpaceId]);

  useEffect(() => {
    if (open) fetchCalendar();
  }, [open, fetchCalendar]);

  function prevMonth() {
    setViewDate((d) => {
      if (d.month === 0) return { year: d.year - 1, month: 11 };
      return { ...d, month: d.month - 1 };
    });
  }

  function nextMonth() {
    setViewDate((d) => {
      if (d.month === 11) return { year: d.year + 1, month: 0 };
      return { ...d, month: d.month + 1 };
    });
  }

  function goToToday() {
    const now = new Date();
    setViewDate({ year: now.getFullYear(), month: now.getMonth() });
    onSelectDate(now.toISOString().split("T")[0]);
  }

  // Build calendar grid
  const firstDay = new Date(viewDate.year, viewDate.month, 1);
  // Monday=0, Sunday=6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate();

  const cells: Array<{ day: number | null; dateStr: string }> = [];
  for (let i = 0; i < startDow; i++) cells.push({ day: null, dateStr: "" });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateStr });
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  function getDayColor(dateStr: string): string {
    const data = calendarData[dateStr];
    if (!data || data.total === 0) return "transparent";
    const ratio = data.completed / data.total;
    if (ratio === 1) return "var(--color-green)";
    if (ratio === 0) return "var(--color-amber)";
    if (ratio >= 0.75) return "var(--color-primary-75)";
    if (ratio >= 0.5) return "var(--color-primary-50)";
    return "var(--color-primary-25)";
  }

  if (!open) return null;

  return (
    <div
      style={{
        width: "280px",
        height: "100vh",
        backgroundColor: "var(--bg-elevated)",
        borderRight: "1px solid var(--border)",
        padding: "20px 16px",
        flexShrink: 0,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
          Calendar
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "16px",
            cursor: "pointer",
            padding: "2px 6px",
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Month navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <button
          onClick={prevMonth}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            color: "var(--text-secondary)",
            padding: "3px 8px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          <ChevronLeft size={14} />
        </button>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {monthNames[viewDate.month]} {viewDate.year}
        </span>
        <button
          onClick={nextMonth}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            color: "var(--text-secondary)",
            padding: "3px 8px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Go to date */}
      <div style={{ marginBottom: "14px" }}>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            const val = e.target.value;
            if (val) {
              onSelectDate(val);
              const d = new Date(val);
              setViewDate({ year: d.getFullYear(), month: d.getMonth() });
            }
          }}
          style={{
            width: "100%",
            padding: "6px 10px",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            outline: "none",
            boxSizing: "border-box",
            colorScheme: "dark",
          }}
        />
      </div>

      {/* Day names */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "2px",
          marginBottom: "4px",
        }}
      >
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            style={{
              textAlign: "center",
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              padding: "4px 0",
            }}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "2px",
        }}
      >
        {cells.map((cell, i) => {
          if (!cell.day) {
            return <div key={`empty-${i}`} />;
          }

          const isToday = cell.dateStr === todayStr;
          const isSelected = cell.dateStr === selectedDate;
          const dayColor = getDayColor(cell.dateStr);
          const data = calendarData[cell.dateStr];
          const isHovered = hoveredDay === cell.dateStr;

          return (
            <div
              key={cell.dateStr}
              onClick={() => onSelectDate(cell.dateStr)}
              onMouseEnter={() => setHoveredDay(cell.dateStr)}
              onMouseLeave={() => setHoveredDay(null)}
              style={{
                position: "relative",
                textAlign: "center",
                padding: "6px 2px",
                fontSize: "12px",
                fontWeight: isToday ? 700 : 500,
                color: isSelected
                  ? "white"
                  : isToday
                    ? "var(--color-primary-light)"
                    : "var(--text-primary)",
                backgroundColor: isSelected
                  ? "var(--color-primary)"
                  : dayColor,
                borderRadius: "6px",
                cursor: "pointer",
                border: isToday && !isSelected
                  ? "1px solid var(--color-primary)"
                  : "1px solid transparent",
                transition: "all 0.15s",
                outline: isHovered ? "1px solid var(--border)" : "none",
              }}
            >
              {cell.day}
              {/* Tooltip on hover */}
              {isHovered && data && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 4px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    fontSize: "10px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-secondary)",
                    whiteSpace: "nowrap",
                    zIndex: 10,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  }}
                >
                  {data.completed}/{data.total} done
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Back to today */}
      {selectedDate !== todayStr && (
        <button
          onClick={goToToday}
          style={{
            marginTop: "16px",
            padding: "8px",
            backgroundColor: "var(--color-primary-dim)",
            border: "1px solid var(--color-primary-border)",
            borderRadius: "6px",
            color: "var(--color-primary-light)",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
            width: "100%",
          }}
        >
          <RotateCcw size={13} style={{ marginRight: "4px" }} />
          Back to today
        </button>
      )}

      {/* Legend */}
      <div style={{ marginTop: "20px", padding: "12px", backgroundColor: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Completion
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {[
            { color: "var(--color-green)", label: "All done" },
            { color: "var(--color-primary-75)", label: "75%+" },
            { color: "var(--color-primary-50)", label: "50%+" },
            { color: "var(--color-primary-25)", label: "<50%" },
            { color: "var(--color-amber)", label: "None done" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: "10px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
