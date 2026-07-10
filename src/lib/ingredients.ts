import { canonicalUnit, kindOfUnit, type Ingredient } from "./units";

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3,
  "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875, "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
};

function parseNumberToken(token: string): number | null {
  token = token.trim();
  if (token in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[token];
  if (/^\d+\/\d+$/.test(token)) {
    const [a, b] = token.split("/").map(Number);
    return b ? a / b : null;
  }
  if (/^\d*\.?\d+$/.test(token)) return parseFloat(token);
  return null;
}

let counter = 0;
export function newId() {
  counter += 1;
  return `ing_${Date.now().toString(36)}_${counter}`;
}

/**
 * Parse a free-text ingredient line like:
 *   "1 1/2 cups all-purpose flour"
 *   "½ tsp vanilla extract"
 *   "2 large eggs"
 *   "400 g cherry tomatoes, halved"
 *   "Salt to taste"
 */
export function parseIngredientLine(line: string): Ingredient {
  const original = line.replace(/\s+/g, " ").trim();
  let rest = original;

  // Leading amount: "1 1/2", "1½", "3/4", "0.5", "½", possibly a range "1-2" (take the first).
  let amount: number | null = null;

  const rangeMatch = rest.match(/^(\S+)\s*(?:-|–|to)\s*(\S+)\s+/);
  const mixedMatch = rest.match(/^(\d+)\s+(\d+\/\d+|[¼½¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘])\s*/);
  const attachedMixed = rest.match(/^(\d+)([¼½¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘])\s*/);
  const singleMatch = rest.match(/^(\d+\/\d+|\d*\.?\d+|[¼½¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘])\s*/);

  if (mixedMatch) {
    const frac = parseNumberToken(mixedMatch[2]);
    if (frac != null) {
      amount = parseInt(mixedMatch[1], 10) + frac;
      rest = rest.slice(mixedMatch[0].length);
    }
  } else if (attachedMixed) {
    const frac = parseNumberToken(attachedMixed[2]);
    if (frac != null) {
      amount = parseInt(attachedMixed[1], 10) + frac;
      rest = rest.slice(attachedMixed[0].length);
    }
  } else if (rangeMatch && parseNumberToken(rangeMatch[1]) != null && parseNumberToken(rangeMatch[2]) != null) {
    amount = parseNumberToken(rangeMatch[1]);
    rest = rest.slice(rangeMatch[0].length);
  } else if (singleMatch) {
    const n = parseNumberToken(singleMatch[1]);
    if (n != null) {
      amount = n;
      rest = rest.slice(singleMatch[0].length);
    }
  }

  // Unit: first word (or two-word "fl oz") after the amount.
  let unit: string | null = null;
  if (amount != null) {
    const two = rest.match(/^(fl\.?\s?oz\.?|fluid ounces?)\s+/i);
    if (two) {
      unit = "floz";
      rest = rest.slice(two[0].length);
    } else {
      const one = rest.match(/^([A-Za-z.]+)\s+/);
      if (one) {
        const canon = canonicalUnit(one[1]);
        if (canon) {
          unit = canon;
          rest = rest.slice(one[0].length);
        }
      }
    }
  }

  // Strip leading "of " — "2 cups of milk".
  rest = rest.replace(/^of\s+/i, "").trim();

  const name = rest.length > 0 ? rest : original;

  return {
    id: newId(),
    name,
    amount,
    unit,
    kind: kindOfUnit(unit),
  };
}

export function parseIngredientLines(lines: string[]): Ingredient[] {
  return lines
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseIngredientLine);
}

/** Loose normalization for grocery aggregation ("Cherry Tomatoes, halved" ≈ "cherry tomatoes"). */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .split(",")[0]
    .replace(/\(.*?\)/g, "")
    .replace(/\b(fresh|large|small|medium|chopped|diced|minced|sliced|halved|grated|shredded|softened|melted|room temperature|to taste|optional|finely|roughly|thinly)\b/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
