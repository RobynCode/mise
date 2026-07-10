"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.push(params.get("next") || "/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't sign in. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          className="input"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          className="input"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-wrap">
      <div className="card card-pad auth-card">
        <p className="auth-brand">
          Mise<span style={{ color: "var(--accent)" }}>.</span>
        </p>
        <p className="auth-sub">Plan meals, cook together, shop once.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p style={{ textAlign: "center", marginTop: 18, marginBottom: 0 }}>
          New here? <Link href="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
