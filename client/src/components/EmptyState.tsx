import { Target, Coffee } from "lucide-react";

interface EmptyStateProps {
  allCompleted: boolean;
}

export default function EmptyState({ allCompleted }: EmptyStateProps) {
  if (allCompleted) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
          }}
        >
          <Target size={28} color="var(--color-green)" />
        </div>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "var(--color-green)",
          }}
        >
          Zero inbox
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--text-muted)",
            marginTop: "6px",
          }}
        >
          all tasks completed // go ship something
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "16px",
          backgroundColor: "var(--color-primary-dim)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 14px",
        }}
      >
        <Coffee size={28} color="var(--color-primary-light)" />
      </div>
      <div
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "var(--text-primary)",
        }}
      >
        New day, clean slate
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          color: "var(--text-muted)",
          marginTop: "6px",
        }}
      >
        press N to start planning
      </div>
    </div>
  );
}
