"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { MENU_THEMES } from "@/lib/menus";

export default function NewMenuButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [theme, setTheme] = useState<string>(MENU_THEMES[0].value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/menus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, theme }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.id) {
      setOpen(false);
      setName("");
      setBusy(false);
      router.push(`/recipes/menus/${data.id}`);
      router.refresh();
    } else {
      setError(data.error ?? "Couldn't create the menu.");
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        <Plus size={16} aria-hidden="true" /> New menu
      </button>

      {open && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-menu-title">
            <div className="modal-head">
              <h2 id="new-menu-title">New menu</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label="Close">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <p style={{ color: "var(--muted)", marginTop: 0 }}>
              Give it a restaurant-style name, then add recipes and pick categories once it's created.
            </p>
            <form onSubmit={submit}>
              {error && (
                <p className="alert alert-error" role="alert">
                  {error}
                </p>
              )}
              <div className="field">
                <label htmlFor="menu-name">Menu name</label>
                <input
                  id="menu-name"
                  ref={inputRef}
                  className="input"
                  placeholder="The Weeknight Table"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Theme</label>
                <div className="theme-picker" role="radiogroup" aria-label="Menu theme">
                  {MENU_THEMES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      role="radio"
                      aria-checked={theme === t.value}
                      className={`theme-swatch${theme === t.value ? " is-selected" : ""}`}
                      onClick={() => setTheme(t.value)}
                      style={{ "--swatch-a": t.primaryColor, "--swatch-b": t.secondaryColor } as React.CSSProperties}
                    >
                      <span className="theme-swatch-preview" aria-hidden="true" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={busy || !name.trim()}>
                  {busy ? "Creating…" : "Create menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
