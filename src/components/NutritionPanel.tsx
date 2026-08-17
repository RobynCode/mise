import type { RecipeNutrition } from "@/lib/nutrition";

const ROWS: Array<{ key: keyof RecipeNutrition["perServing"]; label: string; unit: string }> = [
  { key: "calories", label: "Calories", unit: "" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fiber", label: "Fiber", unit: "g" },
  { key: "sugar", label: "Sugar", unit: "g" },
  { key: "sodium", label: "Sodium", unit: "mg" },
];

export default function NutritionPanel({ nutrition }: { nutrition: RecipeNutrition }) {
  const partial = nutrition.matchedCount < nutrition.ingredientCount;
  return (
    <section className="card card-pad" aria-labelledby="nutrition-heading" style={{ marginTop: 18 }}>
      <h2 id="nutrition-heading" style={{ marginTop: 0 }}>
        Nutrition <span className="badge badge-accent">per serving</span>
      </h2>
      <dl style={{ margin: 0 }}>
        {ROWS.map((r, i) => (
          <div
            key={r.key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "7px 2px",
              borderBottom: i < ROWS.length - 1 ? "1px dashed var(--border)" : undefined,
              fontWeight: r.key === "calories" ? 700 : undefined,
            }}
          >
            <dt style={{ margin: 0 }}>{r.label}</dt>
            <dd style={{ margin: 0 }}>
              {nutrition.perServing[r.key]}
              {r.unit && <span style={{ color: "var(--muted)", fontSize: "0.85em" }}> {r.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <p className="hint" style={{ marginTop: 12, marginBottom: 0 }}>
        Approximate — estimated from {nutrition.matchedCount} of {nutrition.ingredientCount} measurable ingredients.
        {partial && nutrition.unmatched.length > 0 && (
          <> Not counted: {nutrition.unmatched.join(", ")}.</>
        )}
      </p>
    </section>
  );
}
