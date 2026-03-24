import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import Header from "../components/Header";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("test@test.com");
  const [password, setPassword] = useState("secret");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  useEffect(() => {
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Sign-in failed");
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
      }
      
      nav("/payment");
    } catch (err: any) {
      setError(err?.message ?? "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={darkMode ? "dark-mode" : ""} style={{ minHeight: "100vh", paddingTop: "80px", paddingBottom: "40px", paddingLeft: "20px", paddingRight: "20px", backgroundColor: "var(--bg-body)", color: "var(--text-main)", transition: "background 0.3s", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: 'border-box' }}>
      <Header 
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <div className="card">
        <h1 style={{ textAlign: "center", marginBottom: 24, color: "var(--text-main)" }}>Sign In</h1>
        {error && (
          <div style={{ marginBottom: 16, padding: "10px", background: "var(--error-bg)", color: "var(--error-text)", borderRadius: 8, border: "1px solid var(--error-border)", fontSize: 14 }}>
            {error}
          </div>
        )}

      <form onSubmit={onSubmit} style={{ width: "100%" }}>
        <div style={{ marginBottom: 16 }}>
          <label>Email</label>
          <input name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label>Password</label>
          <input name="password" autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
    </div>
  );
}
