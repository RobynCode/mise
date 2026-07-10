"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { displayAmount, type IngredientKind, type System } from "@/lib/units";
import { addDays, todayStr } from "@/lib/dates";

interface Item {
  id: string;
  name: string;
  amount: number | null;
  unit: string | null;
  kind: string;
  checked: boolean;
  note: string;
}

export default function GroceryList({ items, prefs }: { items: Item[]; prefs: { wet: System; dry: System } }) {
  const router = useRouter();
  const [start, setStart] = useState(todayStr());
  const [end, setEnd] = useState(addDays(todayStr(), 6));
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const remaining = items.filter((i) => !i.checked).length;

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    const res = await fetch("/api/groceries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate", start, end }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setNotice({ kind: "ok", text: `Added ${data.added} item${data.added === 1 ? "" : "s"} from your meal plan.` });
      router.refresh();
    } else {
      setNotice({ kind: "err", text: data.error ?? "Couldn't build the list." });
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch("/api/groceries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", name: newName }),
    });
    if (res.ok) {
      setNewName("");
      router.refresh();
    }
  }

  async function toggle(item: Item) {
    setPending((p) => ({ ...p, [item.id]: !item.checked }));
    await fetch(`/api/groceries/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: !item.checked }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/groceries/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function clear(scope: "checked" | "all") {
    if (scope === "all" && !confirm("Clear the entire grocery list?")) return;
    await fetch(`/api/groceries?scope=${scope}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <section className="card card-pad" aria-labelledby="gen-heading">
        <h2 id="gen-heading" style={{ marginTop: 0 }}>
          Build from meal plan
        </h2>
        <form onSubmit={generate} className="row" style={{ alignItems: "flex-end" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="start">From</label>
            <input id="start" className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="end">To</label>
            <input id="end" className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <button type="submit" className="btn" disabled={busy}>
            {busy ? "Building…" : "🧺 Generate list"}
          </button>
        </form>
        <p className="hint" style={{ marginTop: 10 }}>
          Combines every ingredient from the meals planned in this range, scaled to the planned servings, and merges duplicates.
        </p>
        {notice && (
          <p className={`alert ${notice.kind === "ok" ? "alert-success" : "alert-error"}`} role="status" style={{ marginBottom: 0 }}>
            {notice.text}
          </p>
        )}
      </section>

      <section aria-labelledby="list-heading">
        <div className="spread" style={{ marginBottom: 10 }}>
          <h2 id="list-heading" style={{ margin: 0 }}>
            Shopping list{" "}
            <span className="badge" aria-label={`${remaining} items remaining`}>
              {remaining} to buy
            </span>
          </h2>
          <div className="row">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => clear("checked")} disabled={items.every((i) => !i.checked)}>
              Clear checked
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => clear("all")} disabled={items.length === 0}>
              Clear all
            </button>
          </div>
        </div>

        <form onSubmit={addItem} className="row" style={{ marginBottom: 12 }}>
          <label htmlFor="new-item" className="visually-hidden">
            Add an item
          </label>
          <input
            id="new-item"
            className="input"
            placeholder="Add an item… e.g. paper towels"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ maxWidth: 380 }}
          />
          <button type="submit" className="btn btn-secondary" disabled={!newName.trim()}>
            Add
          </button>
        </form>

        {items.length === 0 ? (
          <div className="empty">
            <h3>Nothing on the list</h3>
            <p>Generate a list from your meal plan above, or add items by hand.</p>
          </div>
        ) : (
          <ul className="grocery-list card">
            {items.map((item) => {
              const checked = pending[item.id] ?? item.checked;
              const amt =
                item.amount != null
                  ? displayAmount(item.amount, item.unit, item.kind as IngredientKind, prefs).text
                  : null;
              return (
                <li key={item.id} className={`grocery-item${checked ? " is-checked" : ""}`}>
                  <input
                    type="checkbox"
                    className="grocery-check"
                    id={`check-${item.id}`}
                    checked={checked}
                    onChange={() => toggle(item)}
                  />
                  <label htmlFor={`check-${item.id}`} style={{ flex: 1, cursor: "pointer" }}>
                    <span className="grocery-name">{item.name}</span>
                    {amt && <span className="grocery-detail"> · {amt}</span>}
                    {item.note && <span className="grocery-detail"> · for {item.note}</span>}
                  </label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(item.id)} aria-label={`Remove ${item.name}`}>
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
