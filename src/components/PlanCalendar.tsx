"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { todayStr, friendlyDate, MEALS, MEAL_ORDER } from "@/lib/dates";

interface Entry {
  id: string;
  date: string;
  meal: string;
  servings: number;
  recipe: { id: string; title: string; servings: number };
}

interface RecipeOption {
  id: string;
  title: string;
  servings: number;
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function PlanCalendar({
  month,
  entries,
  recipes,
}: {
  month: string;
  entries: Entry[];
  recipes: RecipeOption[];
}) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [meal, setMeal] = useState("dinner");
  const [recipeId, setRecipeId] = useState(recipes[0]?.id ?? "");
  const [servings, setServings] = useState<number>(recipes[0]?.servings ?? 4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = todayStr();

  const cells = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return { date: str, dayNum: d.getDate(), inMonth: d.getMonth() === m - 1 };
    });
  }, [month]);

  const byDate = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    for (const list of map.values()) list.sort((a, b) => MEAL_ORDER[a.meal] - MEAL_ORDER[b.meal]);
    return map;
  }, [entries]);

  const monthLabel = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }, [month]);

  function selectRecipe(id: string) {
    setRecipeId(id);
    const r = recipes.find((r) => r.id === id);
    if (r) setServings(r.servings);
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDay || !recipeId) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedDay, meal, recipeId, servings }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError(data.error ?? "Couldn't add the meal.");
    }
  }

  async function removeEntry(id: string) {
    await fetch(`/api/plan/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const dayEntries = selectedDay ? byDate.get(selectedDay) ?? [] : [];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedDay(null);
    }
    if (selectedDay) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedDay]);

  return (
    <>
      <div className="spread">
        <h2 style={{ margin: 0 }}>{monthLabel}</h2>
        <div className="cal-controls">
          <Link href={`/plan?month=${shiftMonth(month, -1)}`} className="btn btn-secondary btn-sm" aria-label="Previous month">
            <ChevronLeft size={15} aria-hidden="true" /> Prev
          </Link>
          <Link href="/plan" className="btn btn-ghost btn-sm">
            Today
          </Link>
          <Link href={`/plan?month=${shiftMonth(month, 1)}`} className="btn btn-secondary btn-sm" aria-label="Next month">
            Next <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="cal-grid" role="grid" aria-label={`Meal plan for ${monthLabel}`}>
        {DOW.map((d) => (
          <div key={d} className="cal-dow" role="columnheader">
            {d}
          </div>
        ))}
        {cells.map((c) => {
          const list = byDate.get(c.date) ?? [];
          return (
            <button
              key={c.date}
              type="button"
              role="gridcell"
              className={`cal-cell${c.inMonth ? "" : " is-outside"}${c.date === today ? " is-today" : ""}`}
              onClick={() => {
                setSelectedDay(c.date);
                setError(null);
              }}
              aria-label={`${friendlyDate(c.date)}, ${list.length} meal${list.length === 1 ? "" : "s"} planned`}
            >
              <span className="cal-date">{c.dayNum}</span>
              {list.slice(0, 3).map((e) => (
                <span key={e.id} className={`meal-chip meal-${e.meal}`}>
                  {e.recipe.title}
                </span>
              ))}
              {list.length > 3 && <span className="cal-date">+{list.length - 3} more</span>}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setSelectedDay(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="day-title">
            <div className="modal-head">
              <h2 id="day-title">{friendlyDate(selectedDay)}</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedDay(null)} aria-label="Close">
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            {dayEntries.length > 0 && (
              <ul className="grocery-list card" style={{ marginBottom: 18 }}>
                {dayEntries.map((e) => (
                  <li key={e.id} className="grocery-item">
                    <span className={`meal-chip meal-${e.meal}`}>{e.meal}</span>
                    <span style={{ flex: 1 }}>
                      <Link href={`/recipes/${e.recipe.id}`}>{e.recipe.title}</Link>
                      <span className="grocery-detail"> · {e.servings} servings</span>
                    </span>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeEntry(e.id)} aria-label={`Remove ${e.recipe.title}`}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {recipes.length === 0 ? (
              <p>
                No recipes yet — <Link href="/recipes/new">add one</Link> or import from the web first.
              </p>
            ) : (
              <form onSubmit={addEntry}>
                <h3 style={{ marginTop: 0 }}>Add a meal</h3>
                {error && (
                  <p className="alert alert-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="field">
                  <label htmlFor="cal-recipe">Recipe</label>
                  <select id="cal-recipe" className="select" value={recipeId} onChange={(e) => selectRecipe(e.target.value)}>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="cal-meal">Meal</label>
                    <select id="cal-meal" className="select" value={meal} onChange={(e) => setMeal(e.target.value)}>
                      {MEALS.map((m) => (
                        <option key={m} value={m}>
                          {m[0].toUpperCase() + m.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="cal-servings">Servings</label>
                    <input
                      id="cal-servings"
                      className="input"
                      type="number"
                      min={1}
                      max={64}
                      value={servings}
                      onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                </div>
                <div className="row" style={{ justifyContent: "flex-end" }}>
                  <button type="submit" className="btn" disabled={busy || !recipeId}>
                    {busy ? "Adding…" : "Add to this day"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
