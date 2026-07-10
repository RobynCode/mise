/**
 * Unit engine.
 *
 * Ingredients are classified by how they are measured:
 *  - "wet"  → volume units (tsp, tbsp, cup, fl oz, ml, l, …)
 *  - "dry"  → weight units (g, kg, oz, lb)
 *  - "count"→ everything else (2 eggs, 1 clove garlic, 1 can beans)
 *
 * Users choose a preferred system per class (e.g. wet = imperial cups,
 * dry = metric grams). Volume converts to volume, weight to weight —
 * we never cross the streams, so no density guessing.
 */

export type IngredientKind = "wet" | "dry" | "count";

export interface Ingredient {
  id: string;
  name: string;
  amount: number | null;
  unit: string | null; // canonicalized unit key, e.g. "cup", "g" — or free text for "count"
  kind: IngredientKind;
}

export type System = "metric" | "imperial";

interface UnitDef {
  kind: "wet" | "dry";
  system: System;
  factor: number; // → ml for wet, → g for dry
  labels: [string, string]; // [singular, plural]
  aliases: string[];
}

export const UNITS: Record<string, UnitDef> = {
  tsp:  { kind: "wet", system: "imperial", factor: 4.92892,  labels: ["tsp", "tsp"],     aliases: ["teaspoon", "teaspoons", "t", "tsp.", "tsps"] },
  tbsp: { kind: "wet", system: "imperial", factor: 14.7868,  labels: ["tbsp", "tbsp"],   aliases: ["tablespoon", "tablespoons", "tbs", "tbsp.", "tbsps", "tbl"] },
  floz: { kind: "wet", system: "imperial", factor: 29.5735,  labels: ["fl oz", "fl oz"], aliases: ["fluid ounce", "fluid ounces", "fl. oz.", "fl oz"] },
  cup:  { kind: "wet", system: "imperial", factor: 236.588,  labels: ["cup", "cups"],    aliases: ["cups", "c", "c."] },
  pint: { kind: "wet", system: "imperial", factor: 473.176,  labels: ["pint", "pints"],  aliases: ["pints", "pt"] },
  quart:{ kind: "wet", system: "imperial", factor: 946.353,  labels: ["quart", "quarts"],aliases: ["quarts", "qt"] },
  gallon:{kind: "wet", system: "imperial", factor: 3785.41,  labels: ["gallon", "gallons"], aliases: ["gallons", "gal"] },
  ml:   { kind: "wet", system: "metric",   factor: 1,        labels: ["ml", "ml"],       aliases: ["milliliter", "milliliters", "millilitre", "millilitres", "mL"] },
  l:    { kind: "wet", system: "metric",   factor: 1000,     labels: ["l", "l"],         aliases: ["liter", "liters", "litre", "litres", "L"] },

  g:    { kind: "dry", system: "metric",   factor: 1,        labels: ["g", "g"],         aliases: ["gram", "grams", "gr", "g."] },
  kg:   { kind: "dry", system: "metric",   factor: 1000,     labels: ["kg", "kg"],       aliases: ["kilogram", "kilograms", "kilo", "kilos"] },
  oz:   { kind: "dry", system: "imperial", factor: 28.3495,  labels: ["oz", "oz"],       aliases: ["ounce", "ounces", "oz."] },
  lb:   { kind: "dry", system: "imperial", factor: 453.592,  labels: ["lb", "lbs"],      aliases: ["pound", "pounds", "lbs", "lb."] },
};

const ALIAS_LOOKUP: Record<string, string> = {};
for (const [key, def] of Object.entries(UNITS)) {
  ALIAS_LOOKUP[key] = key;
  for (const a of def.aliases) ALIAS_LOOKUP[a.toLowerCase()] = key;
}

/** Map a raw token like "Tablespoons" to a canonical unit key, or null. */
export function canonicalUnit(raw: string): string | null {
  return ALIAS_LOOKUP[raw.trim().toLowerCase().replace(/\.$/, "")] ?? null;
}

export function kindOfUnit(unitKey: string | null): IngredientKind {
  if (!unitKey) return "count";
  return UNITS[unitKey]?.kind ?? "count";
}

/* ---------- formatting helpers ---------- */

const FRACTIONS: Array<[number, string]> = [
  [1 / 8, "⅛"], [1 / 4, "¼"], [1 / 3, "⅓"], [3 / 8, "⅜"], [1 / 2, "½"],
  [5 / 8, "⅝"], [2 / 3, "⅔"], [3 / 4, "¾"], [7 / 8, "⅞"],
];

/** 0.75 → "¾", 1.5 → "1½", 2.05 → "2" */
export function toNiceFraction(value: number): string {
  const whole = Math.floor(value);
  const rem = value - whole;
  if (rem < 0.05) return whole === 0 ? "0" : String(whole);
  let best: [number, string] | null = null;
  let bestDiff = Infinity;
  for (const f of FRACTIONS) {
    const diff = Math.abs(rem - f[0]);
    if (diff < bestDiff) { bestDiff = diff; best = f; }
  }
  if (best && bestDiff < 0.04) {
    return whole > 0 ? `${whole}${best[1]}` : best[1];
  }
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

function roundSmart(value: number): number {
  if (value >= 100) return Math.round(value);
  if (value >= 10) return Math.round(value * 10) / 10;
  return Math.round(value * 100) / 100;
}

export interface DisplayAmount {
  text: string; // "1½ cups", "350 g", "2"
  amountText: string;
  unitLabel: string | null;
}

/**
 * Convert a canonical ingredient amount into the user's preferred system
 * and pick the friendliest unit within that system.
 */
export function displayAmount(
  amount: number | null,
  unitKey: string | null,
  kind: IngredientKind,
  prefs: { wet: System; dry: System },
): DisplayAmount {
  if (amount == null) {
    return { text: unitKey ?? "", amountText: "", unitLabel: unitKey };
  }
  const def = unitKey ? UNITS[unitKey] : undefined;

  // Count-style ("2 eggs", "1 can") — no conversion, keep original unit text.
  if (!def || kind === "count") {
    const amt = toNiceFraction(amount);
    return {
      text: unitKey ? `${amt} ${unitKey}` : amt,
      amountText: amt,
      unitLabel: unitKey,
    };
  }

  const targetSystem = def.kind === "wet" ? prefs.wet : prefs.dry;
  const canonical = amount * def.factor; // ml or g

  let chosenKey: string;
  if (def.kind === "wet") {
    if (targetSystem === "metric") {
      chosenKey = canonical >= 1000 ? "l" : "ml";
    } else {
      if (canonical >= UNITS.cup.factor * 0.24) chosenKey = "cup";
      else if (canonical >= UNITS.tbsp.factor * 0.9) chosenKey = "tbsp";
      else chosenKey = "tsp";
    }
  } else {
    if (targetSystem === "metric") {
      chosenKey = canonical >= 1000 ? "kg" : "g";
    } else {
      chosenKey = canonical >= UNITS.lb.factor ? "lb" : "oz";
    }
  }

  const chosen = UNITS[chosenKey];
  const value = canonical / chosen.factor;
  const amountText =
    targetSystem === "imperial" && def.kind === "wet"
      ? toNiceFraction(value)
      : String(roundSmart(value));
  const unitLabel = value > 1 ? chosen.labels[1] : chosen.labels[0];
  return { text: `${amountText} ${unitLabel}`, amountText, unitLabel };
}
