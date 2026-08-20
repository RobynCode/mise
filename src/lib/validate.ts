import { randomBytes } from "crypto";
import { kindOfUnit, type Ingredient } from "./units";
import { isMenuTheme, themeById } from "./menus";

export function newInviteCode() {
  // 6 chars, unambiguous alphabet
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function sanitizeRecipeInput(body: Record<string, unknown>) {
  const title = String(body.title ?? "").trim();
  if (!title) throw new Error("A recipe needs a title.");

  const rawIngredients = Array.isArray(body.ingredients) ? (body.ingredients as Record<string, unknown>[]) : [];
  const ingredients: Ingredient[] = rawIngredients
    .map((i, idx) => {
      const name = String(i?.name ?? "").trim();
      const amountNum = i?.amount === null || i?.amount === "" || i?.amount === undefined ? null : Number(i.amount);
      const unit = i?.unit ? String(i.unit) : null;
      return {
        id: String(i?.id ?? `ing_${idx}`),
        name,
        amount: amountNum != null && Number.isFinite(amountNum) && amountNum > 0 ? amountNum : null,
        unit,
        kind: kindOfUnit(unit),
      };
    })
    .filter((i) => i.name.length > 0);

  const steps = (Array.isArray(body.steps) ? body.steps : [])
    .map((s: unknown) => String(s).trim())
    .filter(Boolean);

  const servings = Math.min(64, Math.max(1, Math.round(Number(body.servings)) || 4));
  const toMinutes = (v: unknown) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  return {
    title: title.slice(0, 160),
    description: String(body.description ?? "").trim().slice(0, 2000),
    imageUrl: body.imageUrl ? String(body.imageUrl).slice(0, 1000) : null,
    sourceUrl: body.sourceUrl ? String(body.sourceUrl).slice(0, 1000) : null,
    sourceName: body.sourceName ? String(body.sourceName).slice(0, 200) : null,
    servings,
    prepMinutes: toMinutes(body.prepMinutes),
    cookMinutes: toMinutes(body.cookMinutes),
    ingredients: JSON.stringify(ingredients),
    steps: JSON.stringify(steps),
    tags: String(body.tags ?? "").trim().slice(0, 300),
    menuCategory: sanitizeMenuCategory(body.menuCategory),
  };
}

/** Menu category is either a preset value or a household-typed custom label — either way it's just text. */
export function sanitizeMenuCategory(value: unknown): string {
  return String(value ?? "").trim().slice(0, 60);
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function sanitizeHexColor(value: unknown, fallback: string): string {
  const s = String(value ?? "").trim();
  return HEX_COLOR.test(s) ? s : fallback;
}

export function sanitizeMenuGroupInput(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim().slice(0, 80);
  if (!name) throw new Error("Give the menu a name.");
  const themeInput = String(body.theme ?? "bistro");
  const theme = isMenuTheme(themeInput) ? themeInput : "bistro";
  const preset = themeById(theme);
  return {
    name,
    theme,
    primaryColor: sanitizeHexColor(body.primaryColor, preset.primaryColor),
    secondaryColor: sanitizeHexColor(body.secondaryColor, preset.secondaryColor),
  };
}
