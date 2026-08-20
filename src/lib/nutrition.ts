/**
 * Nutrition engine.
 *
 * Pipeline per ingredient:
 *   1. Convert the amount to grams
 *        dry  → weight units convert directly
 *        wet  → volume → ml → grams via the food's density (default 1.0)
 *        count→ items × the food's typical unit weight
 *   2. Match the ingredient name against the bundled food database
 *      (exact → singular/plural → longest whole-word alias inside the name).
 *   3. If no local match and USDA_API_KEY is set, query USDA FoodData
 *      Central (cached in Postgres so each name is fetched at most once).
 *   4. Sum macros; divide by servings.
 *
 * Results are approximate by nature and flagged with coverage
 * (how many ingredients could be counted).
 */

import { FOOD_DB, type FoodEntry, type Macros } from "./nutritionData";
import { normalizeName } from "./ingredients";
import { UNITS, type Ingredient } from "./units";
import { nutritionCache } from "./repo";

export interface NutrientTotals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sugar: number;
  sodium: number; // mg
}

export interface RecipeNutrition {
  perServing: NutrientTotals;
  total: NutrientTotals;
  matchedCount: number;
  ingredientCount: number; // ingredients that had a usable amount
  unmatched: string[];
}

const ZERO: NutrientTotals = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 0 };

function fromMacros(m: Macros, grams: number): NutrientTotals {
  const f = grams / 100;
  return {
    calories: m[0] * f,
    protein: m[1] * f,
    fat: m[2] * f,
    carbs: m[3] * f,
    fiber: m[4] * f,
    sugar: m[5] * f,
    sodium: m[6] * f,
  };
}

function add(a: NutrientTotals, b: NutrientTotals): NutrientTotals {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    fat: a.fat + b.fat,
    carbs: a.carbs + b.carbs,
    fiber: a.fiber + b.fiber,
    sugar: a.sugar + b.sugar,
    sodium: a.sodium + b.sodium,
  };
}

function round(t: NutrientTotals): NutrientTotals {
  const r = (n: number) => Math.round(n * 10) / 10;
  return {
    calories: Math.round(t.calories),
    protein: r(t.protein),
    fat: r(t.fat),
    carbs: r(t.carbs),
    fiber: r(t.fiber),
    sugar: r(t.sugar),
    sodium: Math.round(t.sodium),
  };
}

/* ---------- local matching ---------- */

const ALIAS_INDEX = new Map<string, FoodEntry>();
for (const entry of FOOD_DB) {
  for (const alias of entry.names) {
    ALIAS_INDEX.set(alias.toLowerCase(), entry);
  }
}

function singular(word: string): string {
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("es") && !word.endsWith("ses")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export function matchFood(rawName: string): FoodEntry | null {
  const norm = normalizeName(rawName);
  if (!norm) return null;

  // 1. Exact alias match (and singular form).
  const direct = ALIAS_INDEX.get(norm) ?? ALIAS_INDEX.get(norm.split(" ").map(singular).join(" "));
  if (direct) return direct;

  // 2. Longest alias appearing as whole words inside the ingredient name.
  const words = new Set(norm.split(" ").flatMap((w) => [w, singular(w)]));
  let best: FoodEntry | null = null;
  let bestLen = 0;
  for (const entry of FOOD_DB) {
    for (const alias of entry.names) {
      const aliasWords = alias.toLowerCase().split(" ");
      if (aliasWords.every((w) => words.has(w)) && alias.length > bestLen) {
        best = entry;
        bestLen = alias.length;
      }
    }
  }
  return best;
}

/* ---------- amount → grams ---------- */

export function toGrams(ing: Ingredient, food: Pick<FoodEntry, "density" | "unitWeight">): number | null {
  if (ing.amount == null) return null;
  const def = ing.unit ? UNITS[ing.unit] : undefined;

  if (def?.kind === "dry") {
    return ing.amount * def.factor; // already grams
  }
  if (def?.kind === "wet") {
    const ml = ing.amount * def.factor;
    return ml * (food.density ?? 1.0);
  }
  // count-style ("2 eggs", "1 onion", "3 cloves garlic")
  if (food.unitWeight) {
    return ing.amount * food.unitWeight;
  }
  return null;
}

/* ---------- optional USDA FoodData Central lookup ---------- */

interface RemoteFood {
  per100g: Macros;
}

// FoodData Central nutrient IDs → macro tuple positions.
const USDA_NUTRIENTS: Record<number, number> = {
  1008: 0, // Energy (kcal)
  1003: 1, // Protein
  1004: 2, // Total fat
  1005: 3, // Carbohydrate
  1079: 4, // Fiber
  2000: 5, // Total sugars
  1093: 6, // Sodium (mg)
};

async function lookupUsda(name: string): Promise<RemoteFood | null> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) return null;

  const cached = await nutritionCache.get(name);
  if (cached !== undefined) return cached; // may be null = known miss

  try {
    const url =
      "https://api.nal.usda.gov/fdc/v1/foods/search?" +
      new URLSearchParams({
        api_key: apiKey,
        query: name,
        dataType: "Foundation,SR Legacy",
        pageSize: "1",
      });
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null; // don't cache transient failures
    const data = (await res.json()) as {
      foods?: Array<{ foodNutrients?: Array<{ nutrientId: number; value: number }> }>;
    };
    const food = data.foods?.[0];
    if (!food?.foodNutrients) {
      await nutritionCache.set(name, null);
      return null;
    }
    const macros: Macros = [0, 0, 0, 0, 0, 0, 0];
    for (const n of food.foodNutrients) {
      const idx = USDA_NUTRIENTS[n.nutrientId];
      if (idx !== undefined && typeof n.value === "number") macros[idx] = n.value;
    }
    const remote: RemoteFood = { per100g: macros };
    await nutritionCache.set(name, remote);
    return remote;
  } catch {
    return null;
  }
}

/* ---------- main ---------- */

export async function computeRecipeNutrition(
  ingredients: Ingredient[],
  servings: number,
): Promise<RecipeNutrition | null> {
  let total = { ...ZERO };
  let matchedCount = 0;
  let ingredientCount = 0;
  const unmatched: string[] = [];

  for (const ing of ingredients) {
    if (ing.amount == null) continue; // "salt to taste" — nothing to count
    ingredientCount += 1;

    const local = matchFood(ing.name);
    if (local) {
      const grams = toGrams(ing, local);
      if (grams != null) {
        total = add(total, fromMacros(local.per100g, grams));
        matchedCount += 1;
        continue;
      }
    }

    // Fall back to USDA (only if configured). Densities/unit weights aren't
    // available remotely, so only weight- and volume-measured items qualify.
    const remote = await lookupUsda(normalizeName(ing.name) || ing.name);
    if (remote) {
      const grams = toGrams(ing, { density: 1.0 });
      if (grams != null) {
        total = add(total, fromMacros(remote.per100g, grams));
        matchedCount += 1;
        continue;
      }
    }

    unmatched.push(ing.name);
  }

  if (matchedCount === 0) return null;

  const safeServings = Math.max(1, servings);
  const perServing = Object.fromEntries(
    Object.entries(total).map(([k, v]) => [k, v / safeServings]),
  ) as unknown as NutrientTotals;

  return {
    perServing: round(perServing),
    total: round(total),
    matchedCount,
    ingredientCount,
    unmatched: unmatched.slice(0, 12),
  };
}
