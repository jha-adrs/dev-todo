interface ProgressRingProps {
  completed: number;
  total: number;
  backlogCount: number;
}

export default function ProgressRing({ completed, total, backlogCount }: ProgressRingProps) {
  if (total === 0 && backlogCount === 0) return null;

  const pct = total > 0 ? completed / total : 0;
  const percentage = Math.round(pct * 100);
  const radius = 26;
  const stroke = 3;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  const remaining = total - completed;

  // Color transitions: red/primary (<30%) → amber (<70%) → green (≥70%)
  const ringColor =
    pct >= 0.7
      ? "var(--color-green)"
      : pct >= 0.3
      ? "var(--color-amber)"
      : "var(--color-primary)";

  const svgSize = radius * 2 + stroke * 2;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
      {/* SVG ring */}
      <div style={{ position: "relative", width: svgSize + "px", height: svgSize + "px", flexShrink: 0 }}>
        <svg
          width={svgSize}
          height={svgSize}
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Background track */}
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={stroke}
          />
          {/* Progress arc */}
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
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
              fontSize: "11px",
              fontWeight: 600,
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
      </div>
    </div>
  );
}
