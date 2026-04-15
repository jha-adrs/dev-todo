interface ProgressRingProps {
  completed: number;
  total: number;
  backlogCount: number;
}

export default function ProgressRing({ completed, total, backlogCount }: ProgressRingProps) {
  if (total === 0 && backlogCount === 0) return null;

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const remaining = total - completed;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
      {/* SVG ring */}
      <div style={{ position: "relative", width: "64px", height: "64px", flexShrink: 0 }}>
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Background track */}
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth="3"
          />
          {/* Progress arc */}
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={percentage === 100 ? "var(--color-green)" : "var(--color-primary)"}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s" }}
          />
        </svg>
        {/* Center text */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {completed}/{total}
          </span>
        </div>
      </div>

      {/* Stats text */}
      <div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {percentage}% done today
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--text-muted)",
            marginTop: "2px",
          }}
        >
          {remaining} remaining // {backlogCount} backlog
        </div>
        {/* Dot indicators */}
        <div style={{ display: "flex", gap: "3px", marginTop: "6px" }}>
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "2px",
                backgroundColor:
                  i < completed ? "var(--color-green)" : "var(--color-primary)",
                transition: "background-color 0.3s",
              }}
            />
          ))}
          {Array.from({ length: backlogCount }).map((_, i) => (
            <div
              key={`b-${i}`}
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "2px",
                backgroundColor: "var(--color-amber)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
