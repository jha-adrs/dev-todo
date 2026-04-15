import {
  ChevronsUp,
  ChevronUp,
  Minus,
  ChevronDown,
  ChevronsDown,
} from "lucide-react";
import type { Priority } from "../hooks/useTodos";

const PRIORITY_CONFIG: Record<
  Priority,
  { icon: React.ReactNode; color: string; label: string }
> = {
  highest: { icon: <ChevronsUp size={14} />, color: "#ef4444", label: "Highest" },
  high: { icon: <ChevronUp size={14} />, color: "#f97316", label: "High" },
  medium: { icon: <Minus size={14} />, color: "#eab308", label: "Medium" },
  low: { icon: <ChevronDown size={14} />, color: "#3b82f6", label: "Low" },
  lowest: { icon: <ChevronsDown size={14} />, color: "#6b7280", label: "Lowest" },
};

interface PriorityIconProps {
  priority: Priority;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export default function PriorityIcon({
  priority,
  size = "sm",
  showLabel,
}: PriorityIconProps) {
  const config = PRIORITY_CONFIG[priority];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        color: config.color,
        fontWeight: 600,
      }}
      title={config.label}
    >
      {config.icon}
      {showLabel && (
        <span style={{ fontSize: size === "sm" ? "10px" : "11px" }}>
          {config.label}
        </span>
      )}
    </span>
  );
}

interface PrioritySelectProps {
  value: Priority;
  onChange: (p: Priority) => void;
}

export function PrioritySelect({ value, onChange }: PrioritySelectProps) {
  const priorities: Priority[] = ["highest", "high", "medium", "low", "lowest"];

  return (
    <div style={{ display: "flex", gap: "3px" }}>
      {priorities.map((p) => {
        const config = PRIORITY_CONFIG[p];
        const isActive = value === p;
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            title={config.label}
            style={{
              padding: "5px 8px",
              fontSize: "11px",
              borderRadius: "5px",
              cursor: "pointer",
              border: isActive
                ? `1px solid ${config.color}66`
                : "1px solid var(--border)",
              backgroundColor: isActive ? `${config.color}18` : "var(--bg-card)",
              color: isActive ? config.color : "var(--text-muted)",
              fontWeight: 600,
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: "2px",
            }}
          >
            {config.icon}
          </button>
        );
      })}
    </div>
  );
}

export { PRIORITY_CONFIG };
