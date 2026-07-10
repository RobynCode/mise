"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function ImportRecipeButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
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
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.id) {
      setOpen(false);
      setUrl("");
      setBusy(false);
      router.push(`/recipes/${data.id}`);
      router.refresh();
    } else {
      setError(data.error ?? "Import failed. Try another URL.");
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        ⤓ Import from web
      </button>

      {open && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
            <div className="modal-head">
              <h2 id="import-title">Import a recipe</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <p style={{ color: "var(--muted)", marginTop: 0 }}>
              Paste a link from most recipe sites and Mise will pull in the ingredients, steps, photo, and timings automatically.
            </p>
            <form onSubmit={submit}>
              {error && (
                <p className="alert alert-error" role="alert">
                  {error}
                </p>
              )}
              <div className="field">
                <label htmlFor="import-url">Recipe URL</label>
                <input
                  id="import-url"
                  ref={inputRef}
                  className="input"
                  type="url"
                  placeholder="https://example.com/best-dal-recipe"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={busy}>
                  {busy ? "Importing…" : "Import recipe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
