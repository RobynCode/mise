import { normalizeName } from "./ingredients";
import { UNITS, type Ingredient } from "./units";

export interface PlanEntryWithRecipe {
  servings: number;
  recipe: {
    title: string;
    servings: number;
    ingredients: string; // JSON
  };
}

export interface AggregatedItem {
  name: string;
  amount: number | null;
  unit: string | null;
  kind: string;
  note: string;
}

/**
 * Combine ingredients across every planned meal.
 * - Amounts are scaled by (planned servings / recipe base servings).
 * - Wet items merge in ml, dry items merge in g; count items merge when
 *   the (normalized name, unit) pair matches.
 */
export function buildGroceryList(entries: PlanEntryWithRecipe[]): AggregatedItem[] {
  interface Bucket {
    displayName: string;
    kind: string;
    unit: string | null;
    canonicalAmount: number; // ml, g, or raw count
    hasAmount: boolean;
    recipes: Set<string>;
  }
  const buckets = new Map<string, Bucket>();

  for (const entry of entries) {
    let ingredients: Ingredient[] = [];
    try {
      ingredients = JSON.parse(entry.recipe.ingredients);
    } catch {
      continue;
    }
    const factor = entry.recipe.servings > 0 ? entry.servings / entry.recipe.servings : 1;

    for (const ing of ingredients) {
      const norm = normalizeName(ing.name) || ing.name.toLowerCase();
      const def = ing.unit ? UNITS[ing.unit] : undefined;
      const dimension = def ? def.kind : `count:${ing.unit ?? ""}`;
      const key = `${norm}|${dimension}`;

      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          displayName: ing.name.split(",")[0].trim(),
          kind: ing.kind,
          unit: def ? (def.kind === "wet" ? "ml" : "g") : ing.unit,
          canonicalAmount: 0,
          hasAmount: false,
          recipes: new Set(),
        };
        buckets.set(key, bucket);
      }
      bucket.recipes.add(entry.recipe.title);
      if (ing.amount != null) {
        bucket.hasAmount = true;
        bucket.canonicalAmount += ing.amount * (def?.factor ?? 1) * factor;
      }
    }
  }

  return Array.from(buckets.values())
    .map((b) => ({
      name: b.displayName,
      amount: b.hasAmount ? Math.round(b.canonicalAmount * 100) / 100 : null,
      unit: b.hasAmount ? b.unit : null,
      kind: b.kind,
      note: Array.from(b.recipes).slice(0, 3).join(", "),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
