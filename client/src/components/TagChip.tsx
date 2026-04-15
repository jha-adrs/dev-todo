import { X } from "lucide-react";
import type { TagInfo } from "../hooks/useTodos";

interface TagChipProps {
  tag: TagInfo;
  size?: "sm" | "md";
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
}

export default function TagChip({ tag, size = "sm", onRemove, onClick, active }: TagChipProps) {
  const fontSize = size === "sm" ? "9px" : "11px";
  const padding = size === "sm" ? "1px 6px" : "2px 8px";

  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        padding,
        fontSize,
        fontWeight: 600,
        borderRadius: "4px",
        backgroundColor: `${tag.color}20`,
        color: tag.color,
        border: active ? `1px solid ${tag.color}` : `1px solid ${tag.color}30`,
        cursor: onClick ? "pointer" : "default",
        whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
    >
      <span
        style={{
          width: size === "sm" ? "5px" : "7px",
          height: size === "sm" ? "5px" : "7px",
          borderRadius: "50%",
          backgroundColor: tag.color,
          flexShrink: 0,
        }}
      />
      {tag.name}
      {onRemove && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            cursor: "pointer",
            marginLeft: "1px",
            opacity: 0.6,
            display: "flex",
          }}
        >
          <X size={size === "sm" ? 10 : 12} />
        </span>
      )}
    </span>
  );
}
