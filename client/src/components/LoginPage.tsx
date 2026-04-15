import { useState } from "react";
import { Loader2 } from "lucide-react";

interface LoginPageProps {
  needsSetup: boolean;
  onSetup: (password: string) => Promise<void>;
  onLogin: (password: string) => Promise<void>;
}

export default function LoginPage({ needsSetup, onSetup, onLogin }: LoginPageProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (needsSetup) {
      if (password.length < 4) {
        setError("Password must be at least 4 characters");
        return;
      }
      if (password !== confirm) {
        setError("Passwords don't match");
        return;
      }
    }

    setLoading(true);
    try {
      if (needsSetup) {
        await onSetup(password);
      } else {
        await onLogin(password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg)",
        padding: "var(--sp-5)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "380px" }}>
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--sp-3)",
            justifyContent: "center",
            marginBottom: "var(--sp-8)",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              background: "var(--color-primary)",
              borderRadius: "var(--radius-xl)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 700,
              fontSize: "var(--text-xl)",
            }}
          >
            D
          </div>
          <span
            style={{
              fontSize: "var(--text-2xl)",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            DevTodo
          </span>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-2xl)",
            padding: "28px",
          }}
        >
          <h2
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: "0 0 var(--sp-1) 0",
            }}
          >
            {needsSetup ? "Create your password" : "Welcome back"}
          </h2>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
              margin: "0 0 var(--sp-6) 0",
            }}
          >
            {needsSetup
              ? "set up a password to secure your todos"
              : "enter your password to continue"}
          </p>

          <div style={{ marginBottom: "var(--sp-3)" }}>
            <label
              style={{
                display: "block",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: "var(--sp-2)",
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              style={{
                width: "100%",
                padding: "10px var(--sp-3)",
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                color: "var(--text-primary)",
                fontSize: "var(--text-base)",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          {needsSetup && (
            <div style={{ marginBottom: "var(--sp-3)" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "var(--text-sm)",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: "var(--sp-2)",
                }}
              >
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm password"
                style={{
                  width: "100%",
                  padding: "10px var(--sp-3)",
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  color: "var(--text-primary)",
                  fontSize: "var(--text-base)",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--color-primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
          )}

          {error && (
            <p
              style={{
                color: "var(--color-danger)",
                fontSize: "var(--text-sm)",
                margin: "0 0 var(--sp-3) 0",
                padding: "var(--sp-2) var(--sp-3)",
                backgroundColor: "var(--color-danger-dim)",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "var(--color-primary)",
              color: "white",
              border: "none",
              borderRadius: "var(--radius-lg)",
              fontSize: "var(--text-base)",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "opacity 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--sp-2)",
            }}
          >
            {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
            {loading
              ? needsSetup ? "Creating..." : "Logging in..."
              : needsSetup
                ? "Create password"
                : "Log in"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            color: "var(--text-dim)",
            marginTop: "var(--sp-4)",
          }}
        >
          devtodo // local-first developer todos
        </p>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
