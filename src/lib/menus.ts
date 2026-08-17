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

export function menuCategoryLabel(value: string): string {
  return MENU_CATEGORIES.find((c) => c.value === value)?.label ?? "Uncategorized";
}

/** Preset visual styles a household can pick for a menu. Only the swatch is used for now — full themed layouts come later. */
export const MENU_THEMES = [
  { value: "classic", label: "Classic Bistro", primaryColor: "#2f6b48", secondaryColor: "#f7ecd9" },
  { value: "modern", label: "Modern Slate", primaryColor: "#20242b", secondaryColor: "#ffffff" },
  { value: "trattoria", label: "Trattoria Red", primaryColor: "#8c2f26", secondaryColor: "#fbf3e6" },
  { value: "minimal", label: "Minimal Mono", primaryColor: "#000000", secondaryColor: "#ffffff" },
] as const;

export type MenuThemeId = (typeof MENU_THEMES)[number]["value"];

const THEME_VALUES = new Set<string>(MENU_THEMES.map((t) => t.value));

export function isMenuTheme(v: string): v is MenuThemeId {
  return THEME_VALUES.has(v);
}

export function themeById(value: string) {
  return MENU_THEMES.find((t) => t.value === value) ?? MENU_THEMES[0];
}
