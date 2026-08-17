"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function GuestPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    async function signIn() {
      const res = await fetch("/api/guest-login", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setStatus("error");
      }
    }
    signIn();
  }, [router]);

  return (
    <div className="auth-wrap">
      <div className="card card-pad auth-card" style={{ textAlign: "center" }}>
        <p className="auth-brand" style={{ marginTop: 0 }}>
          Mise<span style={{ color: "var(--accent)" }}>.</span>
        </p>
        {status === "loading" ? (
          <>
            <p style={{ color: "var(--muted)" }}>Signing you in as a guest…</p>
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
              <span className="spinner" role="status" aria-label="Loading" />
            </div>
          </>
        ) : (
          <>
            <p className="alert alert-error" role="alert">
              Something went wrong. Make sure the app is set up correctly.
            </p>
            <a href="/login" className="btn">
              Try signing in manually
            </a>
          </>
        )}
      </div>
    </div>
  );
}
