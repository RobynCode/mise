/** Shared constants for the "menu" (faux restaurant) feature — used by both the client forms and server validation. */

export const MENU_CATEGORIES = [
  { value: "appetizers", label: "Appetizers & Shareables" },
  { value: "salads", label: "Salads" },
  { value: "soups", label: "Soups" },
  { value: "sandwiches", label: "Sandwiches & Burgers" },
  { value: "pizza", label: "Pizza" },
  { value: "pasta", label: "Pasta" },
  { value: "entrees", label: "Entrées" },
  { value: "dessert", label: "Dessert" },
] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number]["value"];

const CATEGORY_VALUES = new Set<string>(MENU_CATEGORIES.map((c) => c.value));

export function isMenuCategory(v: string): v is MenuCategory {
  return CATEGORY_VALUES.has(v);
}

/** Presets resolve to their display label; anything else is a household's custom category label. */
export function menuCategoryLabel(value: string): string {
  if (!value) return "Uncategorized";
  return MENU_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

/** Preset visual styles a household can pick for a menu. Each one maps to a `.menu-theme-<value>`
 *  stylesheet in src/styles/menu-themes/ that restyles the menu preview's headings, dividers, and text. */
export const MENU_THEMES = [
  { value: "bistro", label: "Bistro Fancy", primaryColor: "#2f6b48", secondaryColor: "#f7ecd9" },
  { value: "retro", label: "Retro Comic", primaryColor: "#d81159", secondaryColor: "#fff6d8" },
  { value: "rustic", label: "Rustic Farmhouse", primaryColor: "#6b4423", secondaryColor: "#f1e6d2" },
  { value: "chalkboard", label: "Chalkboard Café", primaryColor: "#f2efe4", secondaryColor: "#232b23" },
] as const;

export type MenuThemeId = (typeof MENU_THEMES)[number]["value"];

const THEME_VALUES = new Set<string>(MENU_THEMES.map((t) => t.value));

export function isMenuTheme(v: string): v is MenuThemeId {
  return THEME_VALUES.has(v);
}

export function themeById(value: string) {
  return MENU_THEMES.find((t) => t.value === value) ?? MENU_THEMES[0];
}
