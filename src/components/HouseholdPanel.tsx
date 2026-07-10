"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Member {
  id: string;
  name: string;
  email: string;
}

export default function HouseholdPanel({
  household,
  currentUserId,
}: {
  household: { name: string; inviteCode: string; members: Member[] };
  currentUserId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(household.name);
  const [joinCode, setJoinCode] = useState("");
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function act(payload: Record<string, string>, okMessage?: string) {
    setBusy(true);
    setNotice(null);
    const res = await fetch("/api/household", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      if (okMessage) setNotice({ kind: "ok", text: okMessage });
      router.refresh();
      return data;
    }
    setNotice({ kind: "err", text: data.error ?? "Something went wrong." });
    return null;
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(household.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice({ kind: "err", text: "Couldn't copy — the code is shown above." });
    }
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      {notice && (
        <p className={`alert ${notice.kind === "ok" ? "alert-success" : "alert-error"}`} role="status">
          {notice.text}
        </p>
      )}

      <div className="grid-2">
        <section className="card card-pad" aria-labelledby="members-heading">
          <h2 id="members-heading" style={{ marginTop: 0 }}>
            {household.name}
          </h2>
          <ul className="member-list">
            {household.members.map((m) => (
              <li key={m.id}>
                <span className="avatar" aria-hidden="true">
                  {m.name.slice(0, 1).toUpperCase()}
                </span>
                <span style={{ flex: 1 }}>
                  <strong>{m.name}</strong>
                  {m.id === currentUserId && <span className="badge" style={{ marginLeft: 8 }}>You</span>}
                  <br />
                  <span className="grocery-detail">{m.email}</span>
                </span>
              </li>
            ))}
          </ul>
          <form
            className="row"
            style={{ marginTop: 16 }}
            onSubmit={(e) => {
              e.preventDefault();
              act({ action: "rename", name }, "Household renamed.");
            }}
          >
            <label htmlFor="hh-name" className="visually-hidden">
              Household name
            </label>
            <input id="hh-name" className="input" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 260 }} />
            <button type="submit" className="btn btn-secondary btn-sm" disabled={busy || !name.trim()}>
              Rename
            </button>
          </form>
          {household.members.length > 1 && (
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (confirm("Leave this household? You'll get a fresh, empty one of your own.")) {
                    act({ action: "leave" }, "You've left the household.");
                  }
                }}
              >
                Leave household
              </button>
            </div>
          )}
        </section>

        <div className="stack">
          <section className="card card-pad" aria-labelledby="invite-heading">
            <h2 id="invite-heading" style={{ marginTop: 0 }}>
              Invite someone
            </h2>
            <p style={{ color: "var(--muted)", marginTop: 0 }}>
              Share this code — they can enter it below on their own account to join your household.
            </p>
            <div className="row">
              <span className="invite-code" aria-label={`Invite code ${household.inviteCode.split("").join(" ")}`}>
                {household.inviteCode}
              </span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={copyCode}>
                {copied ? "Copied ✓" : "Copy"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (confirm("Generate a new code? The old one stops working.")) {
                    act({ action: "regenerate" }, "New invite code generated.");
                  }
                }}
              >
                New code
              </button>
            </div>
          </section>

          <section className="card card-pad" aria-labelledby="join-heading">
            <h2 id="join-heading" style={{ marginTop: 0 }}>
              Join a household
            </h2>
            <p style={{ color: "var(--muted)", marginTop: 0 }}>
              Have a code from a partner or roommate? Joining moves you to their shared kitchen.
            </p>
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                act({ action: "join", code: joinCode }, "Welcome to your new household! 🎉");
              }}
            >
              <label htmlFor="join-code" className="visually-hidden">
                Invite code
              </label>
              <input
                id="join-code"
                className="input"
                placeholder="e.g. K7M2PX"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ maxWidth: 160, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700 }}
              />
              <button type="submit" className="btn" disabled={busy || joinCode.length < 6}>
                Join
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
