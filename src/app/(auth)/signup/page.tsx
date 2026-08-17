"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't create the account. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-visual" aria-hidden="true">
        <span className="auth-visual-brand">
          Mise<span style={{ color: "var(--accent)" }}>.</span>
        </span>
        <p className="auth-visual-quote">
          “Write it once, cook it forever — import any recipe from the web in seconds.”
        </p>
        <div className="auth-visual-foot">
          <span>Plan meals</span>
          <span>Cook together</span>
          <span>Shop once</span>
        </div>
      </div>
      <div className="auth-form-side">
        <div className="card card-pad auth-card">
          <p className="auth-brand">
            Mise<span style={{ color: "var(--accent)" }}>.</span>
          </p>
          <p className="auth-sub">Create an account to start your recipe box.</p>
          <form onSubmit={submit} noValidate>
            {error && (
              <p className="alert alert-error" role="alert">
                {error}
              </p>
            )}
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" className="input" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="hint">At least 8 characters.</p>
            </div>
            <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
              {busy ? "Creating account…" : "Create account"}
            </button>
          </form>
          <p style={{ textAlign: "center", marginTop: 18, marginBottom: 0 }}>
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
