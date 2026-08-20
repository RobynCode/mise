"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { UNITS, type Ingredient } from "@/lib/units";
import { parseIngredientLines, newId } from "@/lib/ingredients";
import MenuCategoryField from "@/components/MenuCategoryField";

interface RecipeDraft {
  id?: string;
  title: string;
  description: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  tags: string;
  menuCategory: string;
  ingredients: Ingredient[];
  steps: string[];
}

const EMPTY: RecipeDraft = {
  title: "",
  description: "",
  imageUrl: null,
  sourceUrl: null,
  sourceName: null,
  servings: 4,
  prepMinutes: null,
  cookMinutes: null,
  tags: "",
  menuCategory: "",
  ingredients: [],
  steps: [""],
};

const UNIT_OPTIONS = Object.entries(UNITS).map(([key, def]) => ({
  key,
  label: def.labels[0],
  group: def.kind === "wet" ? "Volume (wet)" : "Weight (dry)",
}));

export default function RecipeForm({ initial }: { initial?: RecipeDraft }) {
  const router = useRouter();
  const [draft, setDraft] = useState<RecipeDraft>(initial ?? EMPTY);
  const [bulk, setBulk] = useState("");
  const [bulkOpen, setBulkOpen] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isEdit = Boolean(initial?.id);

  function patch(p: Partial<RecipeDraft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function patchIngredient(id: string, p: Partial<Ingredient>) {
    setDraft((d) => ({
      ...d,
      ingredients: d.ingredients.map((i) => (i.id === id ? { ...i, ...p } : i)),
    }));
  }

  function addIngredient() {
    setDraft((d) => ({
      ...d,
      ingredients: [...d.ingredients, { id: newId(), name: "", amount: null, unit: null, kind: "count" }],
    }));
  }

  function removeIngredient(id: string) {
    setDraft((d) => ({ ...d, ingredients: d.ingredients.filter((i) => i.id !== id) }));
  }

  function applyBulk() {
    const parsed = parseIngredientLines(bulk.split("\n"));
    if (parsed.length === 0) return;
    setDraft((d) => ({ ...d, ingredients: [...d.ingredients, ...parsed] }));
    setBulk("");
    setBulkOpen(false);
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (res.ok && data.url) {
      patch({ imageUrl: data.url });
    } else {
      setError(data.error ?? "Image upload failed.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      ...draft,
      steps: draft.steps.map((s) => s.trim()).filter(Boolean),
    };
    const res = await fetch(isEdit ? `/api/recipes/${initial!.id}` : "/api/recipes", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.id) {
      router.push(`/recipes/${data.id}`);
      router.refresh();
    } else {
      setError(data.error ?? "Couldn't save the recipe.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 24, maxWidth: 760 }}>
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      <section className="card card-pad stack" style={{ gap: 0 }}>
        <h2>Basics</h2>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" className="input" required value={draft.title} onChange={(e) => patch({ title: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            className="textarea"
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="What makes this one special?"
          />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="servings">Servings</label>
            <input
              id="servings"
              className="input"
              type="number"
              min={1}
              max={64}
              required
              value={draft.servings}
              onChange={(e) => patch({ servings: Math.max(1, parseInt(e.target.value) || 1) })}
            />
          </div>
          <div className="field">
            <label htmlFor="tags">Tags</label>
            <input
              id="tags"
              className="input"
              value={draft.tags}
              onChange={(e) => patch({ tags: e.target.value })}
              placeholder="weeknight, vegan, comfort food"
            />
            <p className="hint">Separate with commas.</p>
          </div>
            <MenuCategoryField
              id="menuCategory"
              value={draft.menuCategory}
              onChange={(menuCategory) => patch({ menuCategory })}
              label="Menu category"
              hint="Where this recipe appears on a restaurant-style menu."
            />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="prep">Prep time (minutes)</label>
            <input
              id="prep"
              className="input"
              type="number"
              min={0}
              value={draft.prepMinutes ?? ""}
              onChange={(e) => patch({ prepMinutes: e.target.value ? parseInt(e.target.value) : null })}
            />
          </div>
          <div className="field">
            <label htmlFor="cook">Cook time (minutes)</label>
            <input
              id="cook"
              className="input"
              type="number"
              min={0}
              value={draft.cookMinutes ?? ""}
              onChange={(e) => patch({ cookMinutes: e.target.value ? parseInt(e.target.value) : null })}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="photo">Photo (optional)</label>
          {draft.imageUrl && (
            <div className="row" style={{ marginBottom: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.imageUrl} alt="Recipe photo preview" style={{ width: 140, borderRadius: 10, aspectRatio: "4/3", objectFit: "cover" }} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => patch({ imageUrl: null })}>
                Remove photo
              </button>
            </div>
          )}
          <input id="photo" className="input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImage} />
          <p className="hint">{uploading ? "Uploading…" : "JPG, PNG, WebP, or GIF up to 6 MB."}</p>
        </div>
      </section>

      <section className="card card-pad">
        <div className="spread" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Ingredients</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setBulkOpen((o) => !o)}>
            {bulkOpen ? "Hide quick paste" : "Quick paste"}
          </button>
        </div>

        {bulkOpen && (
          <div className="field" style={{ background: "var(--surface-2)", padding: 14, borderRadius: 10 }}>
            <label htmlFor="bulk">Paste ingredients, one per line</label>
            <textarea
              id="bulk"
              className="textarea"
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              placeholder={"1 1/2 cups all-purpose flour\n2 tbsp olive oil\n400 g cherry tomatoes"}
            />
            <div>
              <button type="button" className="btn btn-sm" onClick={applyBulk} disabled={!bulk.trim()}>
                Parse into ingredients
              </button>
            </div>
            <p className="hint">Amounts and units are detected automatically — you can adjust anything below.</p>
          </div>
        )}

        <div className="stack" style={{ gap: 8 }}>
          {draft.ingredients.map((ing, idx) => (
            <div key={ing.id} className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
              <label className="visually-hidden" htmlFor={`amt-${ing.id}`}>
                Amount for ingredient {idx + 1}
              </label>
              <input
                id={`amt-${ing.id}`}
                className="input"
                type="number"
                step="any"
                min={0}
                placeholder="Amt"
                style={{ width: 84 }}
                value={ing.amount ?? ""}
                onChange={(e) => patchIngredient(ing.id, { amount: e.target.value ? parseFloat(e.target.value) : null })}
              />
              <label className="visually-hidden" htmlFor={`unit-${ing.id}`}>
                Unit for ingredient {idx + 1}
              </label>
              <select
                id={`unit-${ing.id}`}
                className="select"
                style={{ width: 110 }}
                value={ing.unit && UNITS[ing.unit] ? ing.unit : ing.unit ? "__custom" : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__custom") return;
                  patchIngredient(ing.id, { unit: v || null });
                }}
              >
                <option value="">unit —</option>
                <optgroup label="Volume (wet)">
                  {UNIT_OPTIONS.filter((u) => u.group.startsWith("Volume")).map((u) => (
                    <option key={u.key} value={u.key}>
                      {u.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Weight (dry)">
                  {UNIT_OPTIONS.filter((u) => u.group.startsWith("Weight")).map((u) => (
                    <option key={u.key} value={u.key}>
                      {u.label}
                    </option>
                  ))}
                </optgroup>
                {ing.unit && !UNITS[ing.unit] && <option value="__custom">{ing.unit}</option>}
              </select>
              <label className="visually-hidden" htmlFor={`name-${ing.id}`}>
                Name for ingredient {idx + 1}
              </label>
              <input
                id={`name-${ing.id}`}
                className="input"
                placeholder="Ingredient"
                value={ing.name}
                onChange={(e) => patchIngredient(ing.id, { name: e.target.value })}
              />
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeIngredient(ing.id)} aria-label={`Remove ingredient ${idx + 1}`}>
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addIngredient}>
            <Plus size={14} aria-hidden="true" /> Add ingredient
          </button>
        </div>
      </section>

      <section className="card card-pad">
        <h2>Method</h2>
        <div className="stack" style={{ gap: 10 }}>
          {draft.steps.map((s, i) => (
            <div key={i} className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
              <span className="badge" aria-hidden="true" style={{ marginTop: 10 }}>
                {i + 1}
              </span>
              <label className="visually-hidden" htmlFor={`step-${i}`}>
                Step {i + 1}
              </label>
              <textarea
                id={`step-${i}`}
                className="textarea"
                style={{ minHeight: 60 }}
                value={s}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, steps: d.steps.map((x, j) => (j === i ? e.target.value : x)) }))
                }
              />
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setDraft((d) => ({ ...d, steps: d.steps.filter((_, j) => j !== i) }))}
                aria-label={`Remove step ${i + 1}`}
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDraft((d) => ({ ...d, steps: [...d.steps, ""] }))}>
            <Plus size={14} aria-hidden="true" /> Add step
          </button>
        </div>
      </section>

      <div className="row">
        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Saving…" : isEdit ? "Save changes" : "Create recipe"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
