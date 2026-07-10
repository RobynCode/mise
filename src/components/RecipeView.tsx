"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { displayAmount, type Ingredient, type System } from "@/lib/units";
import { todayStr, MEALS } from "@/lib/dates";

interface RecipeMeta {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  tags: string;
  createdByName: string | null;
}

export default function RecipeView({
  recipe,
  ingredients,
  steps,
  prefs,
}: {
  recipe: RecipeMeta;
  ingredients: Ingredient[];
  steps: string[];
  prefs: { wet: System; dry: System };
}) {
  const router = useRouter();
  const [servings, setServings] = useState(recipe.servings);
  const [planOpen, setPlanOpen] = useState(false);
  const [planDate, setPlanDate] = useState(todayStr());
  const [planMeal, setPlanMeal] = useState("dinner");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const factor = servings / recipe.servings;
  const tags = recipe.tags.split(",").map((t) => t.trim()).filter(Boolean);

  async function addToPlan(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: planDate, meal: planMeal, recipeId: recipe.id, servings }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setPlanOpen(false);
      setNotice({ kind: "ok", text: `Added to the plan for ${planDate} (${planMeal}).` });
      router.refresh();
    } else {
      setNotice({ kind: "err", text: data.error ?? "Couldn't add to the plan." });
    }
  }

  async function deleteRecipe() {
    if (!confirm(`Delete “${recipe.title}”? This also removes it from the meal plan.`)) return;
    const res = await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/recipes");
      router.refresh();
    }
  }

  return (
    <>
      <div className="recipe-hero">
        <div>
          <h1 style={{ fontSize: "2.3rem" }}>{recipe.title}</h1>
          {recipe.description && <p style={{ color: "var(--muted)", fontSize: "1.02rem" }}>{recipe.description}</p>}
          <div className="row" style={{ margin: "10px 0 16px" }}>
            {recipe.prepMinutes != null && <span className="badge">Prep {recipe.prepMinutes} min</span>}
            {recipe.cookMinutes != null && <span className="badge">Cook {recipe.cookMinutes} min</span>}
            {tags.map((t) => (
              <span key={t} className="badge badge-accent">
                {t}
              </span>
            ))}
          </div>
          {(recipe.sourceUrl || recipe.createdByName) && (
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
              {recipe.sourceUrl ? (
                <>
                  From{" "}
                  <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {recipe.sourceName ?? recipe.sourceUrl}
                  </a>
                </>
              ) : (
                <>Added by {recipe.createdByName}</>
              )}
            </p>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <button type="button" className="btn" onClick={() => setPlanOpen(true)}>
              🗓️ Add to meal plan
            </button>
            <Link href={`/recipes/${recipe.id}/edit`} className="btn btn-secondary">
              Edit
            </Link>
            <button type="button" className="btn btn-ghost" onClick={deleteRecipe}>
              Delete
            </button>
          </div>
          {notice && (
            <p className={`alert ${notice.kind === "ok" ? "alert-success" : "alert-error"}`} role="status" style={{ marginTop: 14 }}>
              {notice.text}
            </p>
          )}
        </div>
        {recipe.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="recipe-hero-img" src={recipe.imageUrl} alt={recipe.title} />
        )}
      </div>

      <div className="recipe-columns">
        <section className="card card-pad" aria-labelledby="ingredients-heading">
          <div className="spread" style={{ marginBottom: 10 }}>
            <h2 id="ingredients-heading" style={{ margin: 0 }}>
              Ingredients
            </h2>
          </div>
          <div className="scaler" role="group" aria-label="Adjust servings" style={{ marginBottom: 14 }}>
            <button type="button" onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label="Decrease servings">
              −
            </button>
            <span className="scaler-value" aria-live="polite">
              {servings} serving{servings === 1 ? "" : "s"}
            </span>
            <button type="button" onClick={() => setServings((s) => Math.min(64, s + 1))} aria-label="Increase servings">
              +
            </button>
          </div>
          {servings !== recipe.servings && (
            <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 0 }}>
              Scaled from {recipe.servings} · <button type="button" className="btn btn-ghost btn-sm" onClick={() => setServings(recipe.servings)}>Reset</button>
            </p>
          )}
          <ul className="ingredient-list">
            {ingredients.map((ing) => {
              const amt =
                ing.amount != null
                  ? displayAmount(ing.amount * factor, ing.unit, ing.kind, prefs)
                  : null;
              return (
                <li key={ing.id}>
                  <span className="ingredient-amt">{amt ? amt.text : "—"}</span>
                  <span>{ing.name}</span>
                </li>
              );
            })}
            {ingredients.length === 0 && <li style={{ color: "var(--muted)" }}>No ingredients listed yet.</li>}
          </ul>
        </section>

        <section aria-labelledby="steps-heading">
          <h2 id="steps-heading">Method</h2>
          {steps.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No steps written yet — edit the recipe to add them.</p>
          ) : (
            <ol className="steps-list">
              {steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {planOpen && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setPlanOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="plan-title">
            <div className="modal-head">
              <h2 id="plan-title">Add to meal plan</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPlanOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <form onSubmit={addToPlan}>
              <div className="field">
                <label htmlFor="plan-date">Date</label>
                <input id="plan-date" className="input" type="date" required value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="plan-meal">Meal</label>
                <select id="plan-meal" className="select" value={planMeal} onChange={(e) => setPlanMeal(e.target.value)}>
                  {MEALS.map((m) => (
                    <option key={m} value={m}>
                      {m[0].toUpperCase() + m.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
                Planned at {servings} serving{servings === 1 ? "" : "s"} — adjust with the scaler before adding.
              </p>
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setPlanOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={busy}>
                  {busy ? "Adding…" : "Add to plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
