"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SettingsPanel({
  initial,
}: {
  initial: { name: string; wetUnits: string; dryUnits: string };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [wetUnits, setWetUnits] = useState(initial.wetUnits);
  const [dryUnits, setDryUnits] = useState(initial.dryUnits);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, wetUnits, dryUnits }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setNotice({ kind: "ok", text: "Settings saved." });
      router.refresh();
    } else {
      setNotice({ kind: "err", text: data.error ?? "Couldn't save settings." });
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 560 }}>
      {notice && (
        <p className={`alert ${notice.kind === "ok" ? "alert-success" : "alert-error"}`} role="status">
          {notice.text}
        </p>
      )}
      <form onSubmit={save} className="card card-pad">
        <h2 style={{ marginTop: 0 }}>Profile</h2>
        <div className="field">
          <label htmlFor="name">Display name</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <h2>Preferred units</h2>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Every recipe and grocery amount is converted for you on the fly. Wet ingredients are measured by
          volume, dry ingredients by weight — set each one independently.
        </p>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="wet">Wet ingredients (volume)</label>
            <select id="wet" className="select" value={wetUnits} onChange={(e) => setWetUnits(e.target.value)}>
              <option value="imperial">Cups, tbsp, tsp</option>
              <option value="metric">Millilitres, litres</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="dry">Dry ingredients (weight)</label>
            <select id="dry" className="select" value={dryUnits} onChange={(e) => setDryUnits(e.target.value)}>
              <option value="metric">Grams, kilograms</option>
              <option value="imperial">Ounces, pounds</option>
            </select>
          </div>
        </div>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </button>
      </form>

      <div className="card card-pad">
        <h2 style={{ marginTop: 0 }}>Account</h2>
        <button type="button" className="btn btn-secondary" onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
