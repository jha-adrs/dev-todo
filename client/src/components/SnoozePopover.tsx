import { useState } from "react";
import { Clock, X, CalendarClock } from "lucide-react";

interface SnoozePopoverProps {
  currentSnooze: string | null;
  onSnooze: (date: string | null) => void;
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function nextMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export default function SnoozePopover({ currentSnooze, onSnooze }: SnoozePopoverProps) {
  const [open, setOpen] = useState(false);
  const [customDate, setCustomDate] = useState("");

  const isSnoozed = currentSnooze && currentSnooze > new Date().toISOString().split("T")[0];

  function handleSnooze(date: string | null) {
    onSnooze(date);
    setOpen(false);
  }

  if (isSnoozed) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          backgroundColor: "rgba(107, 114, 128, 0.08)",
          border: "1px solid rgba(107, 114, 128, 0.2)",
          borderRadius: "8px",
        }}
      >
        <Clock size={14} style={{ color: "var(--text-muted)" }} />
        <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
          Snoozed until {currentSnooze}
        </span>
        <button
          onClick={() => handleSnooze(null)}
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "3px",
            padding: "3px 8px",
            fontSize: "11px",
            color: "var(--color-primary-light)",
            backgroundColor: "var(--color-primary-dim)",
            border: "1px solid var(--color-primary-border)",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Unsnooze
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "9px 12px",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          color: "var(--text-secondary)",
          cursor: "pointer",
          fontSize: "13px",
        }}
      >
        <CalendarClock size={15} />
        Snooze
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 20,
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "6px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            minWidth: "200px",
          }}
        >
          <div style={{ padding: "4px 8px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Snooze until
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "2px" }}
            >
              <X size={14} />
            </button>
          </div>

          {[
            { label: "Tomorrow", date: addDays(1) },
            { label: "In 3 days", date: addDays(3) },
            { label: "Next Monday", date: nextMonday() },
            { label: "Next week", date: addDays(7) },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => handleSnooze(opt.date)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                padding: "7px 10px",
                fontSize: "12px",
                color: "var(--text-primary)",
                backgroundColor: "transparent",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span>{opt.label}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)" }}>
                {opt.date}
              </span>
            </button>
          ))}

          <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0", padding: "6px 4px 0" }}>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              min={addDays(1)}
              style={{
                width: "100%",
                padding: "6px 8px",
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "5px",
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                outline: "none",
                boxSizing: "border-box",
                colorScheme: "dark",
              }}
            />
            {customDate && (
              <button
                onClick={() => handleSnooze(customDate)}
                style={{
                  width: "100%",
                  marginTop: "4px",
                  padding: "6px",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "var(--color-primary-light)",
                  backgroundColor: "var(--color-primary-dim)",
                  border: "1px solid var(--color-primary-border)",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Snooze until {customDate}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
