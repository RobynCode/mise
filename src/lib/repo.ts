import { randomUUID } from "crypto";
import { query, execute, driver, ready } from "./db";

/* ---------- row types ---------- */

export interface UserRow {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  wetUnits: string;
  dryUnits: string;
  householdId: string;
  createdAt: string;
}

export interface HouseholdRow {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
}

export interface RecipeRow {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  ingredients: string;
  steps: string;
  tags: string;
  nutrition: string | null; // JSON RecipeNutrition
  caloriesPerServing: number | null;
  menuCategory: string;
  householdId: string;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanEntryRow {
  id: string;
  date: string;
  meal: string;
  servings: number;
  recipeId: string;
  householdId: string;
  createdAt: string;
}

export interface GroceryItemRow {
  id: string;
  name: string;
  amount: number | null;
  unit: string | null;
  kind: string;
  checked: boolean;
  note: string;
  householdId: string;
  createdAt: string;
}

export type MemberSummary = Pick<UserRow, "id" | "name" | "email">;
export type UserWithHousehold = UserRow & {
  household: HouseholdRow & { members: MemberSummary[] };
};

/** Postgres returns COUNT() as a bigint string; normalize it to a number. */
function toCount(v: unknown): number {
  return typeof v === "number" ? v : Number(v ?? 0);
}

/* ---------- users ---------- */

export const users = {
  async byId(id: string): Promise<UserRow | undefined> {
    const rows = await query<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
    return rows[0];
  },
  async byEmail(email: string): Promise<UserRow | undefined> {
    const rows = await query<UserRow>("SELECT * FROM users WHERE email = ?", [email]);
    return rows[0];
  },
  async withHousehold(id: string): Promise<UserWithHousehold | null> {
    const user = await users.byId(id);
    if (!user) return null;
    const household = await households.byId(user.householdId);
    if (!household) return null;
    const members = await query<MemberSummary>(
      "SELECT id, name, email FROM users WHERE householdId = ? ORDER BY name",
      [user.householdId],
    );
    return { ...user, household: { ...household, members } };
  },
  async create(data: { name: string; email: string; passwordHash: string; householdId: string }): Promise<UserRow> {
    const id = randomUUID();
    await execute(
      "INSERT INTO users (id, name, email, passwordHash, householdId) VALUES (?, ?, ?, ?, ?)",
      [id, data.name, data.email, data.passwordHash, data.householdId],
    );
    return (await users.byId(id))!;
  },
  async update(
    id: string,
    data: Partial<Pick<UserRow, "name" | "wetUnits" | "dryUnits" | "householdId">>,
  ): Promise<void> {
    const fields = Object.keys(data);
    if (fields.length === 0) return;
    const sets = fields.map((f) => `${f} = ?`).join(", ");
    await execute(`UPDATE users SET ${sets} WHERE id = ?`, [
      ...fields.map((f) => (data as Record<string, unknown>)[f]),
      id,
    ]);
  },
  async countInHousehold(householdId: string): Promise<number> {
    const rows = await query<{ n: unknown }>("SELECT COUNT(*) AS n FROM users WHERE householdId = ?", [householdId]);
    return toCount(rows[0]?.n);
  },
};

/* ---------- households ---------- */

export const households = {
  async byId(id: string): Promise<HouseholdRow | undefined> {
    const rows = await query<HouseholdRow>("SELECT * FROM households WHERE id = ?", [id]);
    return rows[0];
  },
  async byInviteCode(code: string): Promise<HouseholdRow | undefined> {
    const rows = await query<HouseholdRow>("SELECT * FROM households WHERE inviteCode = ?", [code]);
    return rows[0];
  },
  async create(data: { name: string; inviteCode: string }): Promise<HouseholdRow> {
    const id = randomUUID();
    await execute("INSERT INTO households (id, name, inviteCode) VALUES (?, ?, ?)", [id, data.name, data.inviteCode]);
    return (await households.byId(id))!;
  },
  async update(id: string, data: Partial<Pick<HouseholdRow, "name" | "inviteCode">>): Promise<void> {
    const fields = Object.keys(data);
    if (fields.length === 0) return;
    const sets = fields.map((f) => `${f} = ?`).join(", ");
    await execute(`UPDATE households SET ${sets} WHERE id = ?`, [
      ...fields.map((f) => (data as Record<string, unknown>)[f]),
      id,
    ]);
  },
  async deleteIfEmpty(id: string): Promise<void> {
    if ((await users.countInHousehold(id)) === 0) {
      await execute("DELETE FROM households WHERE id = ?", [id]);
    }
  },
};

/* ---------- recipes ---------- */

export interface RecipeInput {
  title: string;
  description: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  ingredients: string;
  steps: string;
  tags: string;
  nutrition?: string | null;
  caloriesPerServing?: number | null;
  menuCategory?: string;
}

export const recipes = {
  async byId(id: string): Promise<RecipeRow | undefined> {
    const rows = await query<RecipeRow>("SELECT * FROM recipes WHERE id = ?", [id]);
    return rows[0];
  },
  async forHousehold(
    householdId: string,
    opts?: { query?: string; limit?: number; orderBy?: "updated" | "title"; minCal?: number; maxCal?: number },
  ): Promise<RecipeRow[]> {
    const order = opts?.orderBy === "title" ? "LOWER(title) ASC" : "updatedAt DESC";
    const where: string[] = ["householdId = ?"];
    const params: unknown[] = [householdId];
    if (opts?.query) {
      where.push(`(title ILIKE ? OR tags ILIKE ? OR ingredients ILIKE ?)`);
      const like = `%${opts.query}%`;
      params.push(like, like, like);
    }
    if (opts?.minCal != null) {
      where.push("caloriesPerServing >= ?");
      params.push(opts.minCal);
    }
    if (opts?.maxCal != null) {
      where.push("caloriesPerServing <= ?");
      params.push(opts.maxCal);
    }
    return query<RecipeRow>(
      `SELECT * FROM recipes WHERE ${where.join(" AND ")} ORDER BY ${order}${opts?.limit ? ` LIMIT ${Number(opts.limit)}` : ""}`,
      params,
    );
  },
  async create(data: RecipeInput & { householdId: string; createdById: string | null }): Promise<RecipeRow> {
    const id = randomUUID();
    await execute(
      `INSERT INTO recipes
       (id, title, description, imageUrl, sourceUrl, sourceName, servings, prepMinutes, cookMinutes, ingredients, steps, tags, nutrition, caloriesPerServing, menuCategory, householdId, createdById)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.title, data.description, data.imageUrl, data.sourceUrl, data.sourceName,
        data.servings, data.prepMinutes, data.cookMinutes, data.ingredients, data.steps, data.tags,
        data.nutrition ?? null, data.caloriesPerServing ?? null, data.menuCategory ?? "",
        data.householdId, data.createdById,
      ],
    );
    return (await recipes.byId(id))!;
  },
  async update(id: string, data: RecipeInput): Promise<void> {
    await execute(
      `UPDATE recipes SET
       title = ?, description = ?, imageUrl = ?, sourceUrl = ?, sourceName = ?,
       servings = ?, prepMinutes = ?, cookMinutes = ?, ingredients = ?, steps = ?, tags = ?,
       nutrition = ?, caloriesPerServing = ?, menuCategory = ?,
       updatedAt = NOW()
       WHERE id = ?`,
      [
        data.title, data.description, data.imageUrl, data.sourceUrl, data.sourceName,
        data.servings, data.prepMinutes, data.cookMinutes, data.ingredients, data.steps, data.tags,
        data.nutrition ?? null, data.caloriesPerServing ?? null, data.menuCategory ?? "",
        id,
      ],
    );
  },
  async remove(id: string): Promise<void> {
    await execute("DELETE FROM recipes WHERE id = ?", [id]);
  },
  async creatorName(recipe: RecipeRow): Promise<string | null> {
    if (!recipe.createdById) return null;
    const rows = await query<{ name: string }>("SELECT name FROM users WHERE id = ?", [recipe.createdById]);
    return rows[0]?.name ?? null;
  },
};

/* ---------- menu groups (faux restaurant menus) ---------- */

export interface MenuGroupRow {
  id: string;
  name: string;
  theme: string;
  primaryColor: string;
  secondaryColor: string;
  householdId: string;
  createdAt: string;
}

export const menuGroups = {
  async byId(id: string): Promise<MenuGroupRow | undefined> {
    const rows = await query<MenuGroupRow>("SELECT * FROM menu_group WHERE id = ?", [id]);
    return rows[0];
  },
  async forHousehold(householdId: string): Promise<MenuGroupRow[]> {
    return query<MenuGroupRow>("SELECT * FROM menu_group WHERE householdId = ? ORDER BY LOWER(name) ASC", [
      householdId,
    ]);
  },
  async create(data: {
    name: string;
    theme: string;
    primaryColor: string;
    secondaryColor: string;
    householdId: string;
  }): Promise<MenuGroupRow> {
    const id = randomUUID();
    await execute(
      "INSERT INTO menu_group (id, name, theme, primaryColor, secondaryColor, householdId) VALUES (?, ?, ?, ?, ?, ?)",
      [id, data.name, data.theme, data.primaryColor, data.secondaryColor, data.householdId],
    );
    return (await menuGroups.byId(id))!;
  },
  async update(
    id: string,
    data: Partial<Pick<MenuGroupRow, "name" | "theme" | "primaryColor" | "secondaryColor">>,
  ): Promise<void> {
    const fields = Object.keys(data);
    if (fields.length === 0) return;
    const sets = fields.map((f) => `${f} = ?`).join(", ");
    await execute(`UPDATE menu_group SET ${sets} WHERE id = ?`, [
      ...fields.map((f) => (data as Record<string, unknown>)[f]),
      id,
    ]);
  },
  async remove(id: string): Promise<void> {
    await execute("DELETE FROM menu_group WHERE id = ?", [id]);
  },
  async recipeIds(menuGroupId: string): Promise<string[]> {
    const rows = await query<{ recipeId: string }>("SELECT recipeId FROM menu_group_recipes WHERE menuGroupId = ?", [
      menuGroupId,
    ]);
    return rows.map((r) => r.recipeId);
  },
  async recipesForGroup(menuGroupId: string): Promise<RecipeRow[]> {
    return query<RecipeRow>(
      `SELECT r.* FROM recipes r
       JOIN menu_group_recipes m ON m.recipeId = r.id
       WHERE m.menuGroupId = ?
       ORDER BY LOWER(r.title) ASC`,
      [menuGroupId],
    );
  },
  async countRecipes(menuGroupId: string): Promise<number> {
    const rows = await query<{ n: unknown }>("SELECT COUNT(*) AS n FROM menu_group_recipes WHERE menuGroupId = ?", [
      menuGroupId,
    ]);
    return toCount(rows[0]?.n);
  },
  /** Replaces the full recipe membership for a menu in one transaction. */
  async setRecipes(menuGroupId: string, recipeIds: string[]): Promise<void> {
    await ready();
    await driver.transaction(async (tx) => {
      await tx.execute("DELETE FROM menu_group_recipes WHERE menuGroupId = ?", [menuGroupId]);
      for (const recipeId of recipeIds) {
        await tx.execute("INSERT INTO menu_group_recipes (menuGroupId, recipeId) VALUES (?, ?)", [
          menuGroupId,
          recipeId,
        ]);
      }
    });
  },
};

/* ---------- plan entries ---------- */

export type PlanEntryWithRecipe = PlanEntryRow & {
  recipe: Pick<RecipeRow, "id" | "title" | "servings" | "ingredients">;
};

export const planEntries = {
  async byId(id: string): Promise<PlanEntryRow | undefined> {
    const rows = await query<PlanEntryRow>("SELECT * FROM plan_entries WHERE id = ?", [id]);
    return rows[0];
  },
  async inRange(householdId: string, start: string, end: string): Promise<PlanEntryWithRecipe[]> {
    const rows = await query<PlanEntryRow & { r_title: string; r_servings: number; r_ingredients: string }>(
      `SELECT p.*, r.title AS r_title, r.servings AS r_servings, r.ingredients AS r_ingredients
       FROM plan_entries p JOIN recipes r ON r.id = p.recipeId
       WHERE p.householdId = ? AND p.date >= ? AND p.date <= ?
       ORDER BY p.date ASC`,
      [householdId, start, end],
    );
    return rows.map(({ r_title, r_servings, r_ingredients, ...p }) => ({
      ...p,
      recipe: { id: p.recipeId, title: r_title, servings: r_servings, ingredients: r_ingredients },
    }));
  },
  async create(data: {
    date: string;
    meal: string;
    servings: number;
    recipeId: string;
    householdId: string;
  }): Promise<PlanEntryRow> {
    const id = randomUUID();
    await execute(
      "INSERT INTO plan_entries (id, date, meal, servings, recipeId, householdId) VALUES (?, ?, ?, ?, ?, ?)",
      [id, data.date, data.meal, data.servings, data.recipeId, data.householdId],
    );
    return (await planEntries.byId(id))!;
  },
  async remove(id: string): Promise<void> {
    await execute("DELETE FROM plan_entries WHERE id = ?", [id]);
  },
};

/* ---------- grocery items ---------- */

export const groceryItems = {
  async byId(id: string): Promise<GroceryItemRow | undefined> {
    const rows = await query<GroceryItemRow>("SELECT * FROM grocery_items WHERE id = ?", [id]);
    return rows[0];
  },
  async forHousehold(householdId: string): Promise<GroceryItemRow[]> {
    return query<GroceryItemRow>("SELECT * FROM grocery_items WHERE householdId = ? ORDER BY checked ASC, LOWER(name) ASC", [
      householdId,
    ]);
  },
  async countUnchecked(householdId: string): Promise<number> {
    const rows = await query<{ n: unknown }>(
      "SELECT COUNT(*) AS n FROM grocery_items WHERE householdId = ? AND checked = ?",
      [householdId, false],
    );
    return toCount(rows[0]?.n);
  },
  async create(data: {
    name: string;
    amount: number | null;
    unit: string | null;
    kind: string;
    note?: string;
    householdId: string;
  }): Promise<void> {
    await execute(
      "INSERT INTO grocery_items (id, name, amount, unit, kind, note, householdId) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [randomUUID(), data.name, data.amount, data.unit, data.kind, data.note ?? "", data.householdId],
    );
  },
  async createMany(
    items: Array<{ name: string; amount: number | null; unit: string | null; kind: string; note: string }>,
    householdId: string,
  ): Promise<void> {
    if (items.length === 0) return;
    await ready();
    await driver.transaction(async (tx) => {
      for (const i of items) {
        await tx.execute(
          "INSERT INTO grocery_items (id, name, amount, unit, kind, note, householdId) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [randomUUID(), i.name, i.amount, i.unit, i.kind, i.note, householdId],
        );
      }
    });
  },
  async setChecked(id: string, checked: boolean): Promise<void> {
    await execute("UPDATE grocery_items SET checked = ? WHERE id = ?", [checked, id]);
  },
  async remove(id: string): Promise<void> {
    await execute("DELETE FROM grocery_items WHERE id = ?", [id]);
  },
  async clear(householdId: string, onlyChecked: boolean): Promise<void> {
    if (onlyChecked) {
      await execute("DELETE FROM grocery_items WHERE householdId = ? AND checked = ?", [
        householdId,
        true,
      ]);
    } else {
      await execute("DELETE FROM grocery_items WHERE householdId = ?", [householdId]);
    }
  },
};

/* ---------- nutrition cache (USDA lookups) ---------- */

type CachedFood = { per100g: [number, number, number, number, number, number, number] };

export const nutritionCache = {
  /** undefined = never looked up; null = looked up, no result. */
  async get(name: string): Promise<CachedFood | null | undefined> {
    const rows = await query<{ data: string | null }>("SELECT data FROM nutrition_cache WHERE name = ?", [
      name.toLowerCase(),
    ]);
    if (rows.length === 0) return undefined;
    const data = rows[0].data;
    if (data == null) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },
  async set(name: string, data: CachedFood | null): Promise<void> {
    const payload = data ? JSON.stringify(data) : null;
    await execute(
      "INSERT INTO nutrition_cache (name, data) VALUES (?, ?) ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data",
      [name.toLowerCase(), payload],
    );
  },
};
