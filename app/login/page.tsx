"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Network error — please try again");
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="bg-overlay" />
      <div className="app-content" style={{ justifyContent: "center", minHeight: "100vh" }}>
        <div className="glass-card panel" style={{ maxWidth: 420, margin: "0 auto", width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
            <span className="header-icon" style={{ fontSize: "2.5rem", display: "block", marginBottom: "0.5rem" }}>◈</span>
            <h1 className="header-title" style={{ fontSize: "1.5rem" }}>AI Calendar</h1>
            <p className="header-sub" style={{ display: "block" }}>
              {isRegister ? "Create your account" : "Sign in to your calendar"}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="glass-input"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? "At least 6 characters" : "Your password"}
                className="glass-input"
                required
                minLength={isRegister ? 6 : undefined}
                autoComplete={isRegister ? "new-password" : "current-password"}
              />
            </div>

            {error && (
              <div className="status-msg status-msg--error">
                <span className="status-icon">✗</span>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary" style={{ alignSelf: "stretch" }}>
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner" /> {isRegister ? "Creating account..." : "Signing in..."}
                </span>
              ) : (
                isRegister ? "Create Account" : "Sign In"
              )}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
            <button
              onClick={() => { setIsRegister(!isRegister); setError(null); }}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: "0.85rem",
              }}
            >
              {isRegister ? "Already have an account? Sign in" : "Don't have an account? Register"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
