import { randomUUID } from "crypto";
import { sqlite } from "./db";

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
  checked: number; // sqlite boolean
  note: string;
  householdId: string;
  createdAt: string;
}

export type MemberSummary = Pick<UserRow, "id" | "name" | "email">;
export type UserWithHousehold = UserRow & {
  household: HouseholdRow & { members: MemberSummary[] };
};

/* ---------- users ---------- */

export const users = {
  byId(id: string): UserRow | undefined {
    return sqlite.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  },
  byEmail(email: string): UserRow | undefined {
    return sqlite.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
  },
  withHousehold(id: string): UserWithHousehold | null {
    const user = users.byId(id);
    if (!user) return null;
    const household = households.byId(user.householdId);
    if (!household) return null;
    const members = sqlite
      .prepare("SELECT id, name, email FROM users WHERE householdId = ? ORDER BY name")
      .all(user.householdId) as MemberSummary[];
    return { ...user, household: { ...household, members } };
  },
  create(data: { name: string; email: string; passwordHash: string; householdId: string }): UserRow {
    const id = randomUUID();
    sqlite
      .prepare("INSERT INTO users (id, name, email, passwordHash, householdId) VALUES (?, ?, ?, ?, ?)")
      .run(id, data.name, data.email, data.passwordHash, data.householdId);
    return users.byId(id)!;
  },
  update(id: string, data: Partial<Pick<UserRow, "name" | "wetUnits" | "dryUnits" | "householdId">>) {
    const fields = Object.keys(data);
    if (fields.length === 0) return;
    const sets = fields.map((f) => `${f} = ?`).join(", ");
    sqlite.prepare(`UPDATE users SET ${sets} WHERE id = ?`).run(...fields.map((f) => (data as Record<string, unknown>)[f]), id);
  },
  countInHousehold(householdId: string): number {
    const row = sqlite.prepare("SELECT COUNT(*) AS n FROM users WHERE householdId = ?").get(householdId) as { n: number };
    return row.n;
  },
};

/* ---------- households ---------- */

export const households = {
  byId(id: string): HouseholdRow | undefined {
    return sqlite.prepare("SELECT * FROM households WHERE id = ?").get(id) as HouseholdRow | undefined;
  },
  byInviteCode(code: string): HouseholdRow | undefined {
    return sqlite.prepare("SELECT * FROM households WHERE inviteCode = ?").get(code) as HouseholdRow | undefined;
  },
  create(data: { name: string; inviteCode: string }): HouseholdRow {
    const id = randomUUID();
    sqlite.prepare("INSERT INTO households (id, name, inviteCode) VALUES (?, ?, ?)").run(id, data.name, data.inviteCode);
    return households.byId(id)!;
  },
  update(id: string, data: Partial<Pick<HouseholdRow, "name" | "inviteCode">>) {
    const fields = Object.keys(data);
    if (fields.length === 0) return;
    const sets = fields.map((f) => `${f} = ?`).join(", ");
    sqlite.prepare(`UPDATE households SET ${sets} WHERE id = ?`).run(...fields.map((f) => (data as Record<string, unknown>)[f]), id);
  },
  deleteIfEmpty(id: string) {
    if (users.countInHousehold(id) === 0) {
      sqlite.prepare("DELETE FROM households WHERE id = ?").run(id);
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
}

export const recipes = {
  byId(id: string): RecipeRow | undefined {
    return sqlite.prepare("SELECT * FROM recipes WHERE id = ?").get(id) as RecipeRow | undefined;
  },
  forHousehold(householdId: string, opts?: { query?: string; limit?: number; orderBy?: "updated" | "title" }): RecipeRow[] {
    const order = opts?.orderBy === "title" ? "title COLLATE NOCASE ASC" : "updatedAt DESC";
    if (opts?.query) {
      const like = `%${opts.query}%`;
      return sqlite
        .prepare(
          `SELECT * FROM recipes WHERE householdId = ?
           AND (title LIKE ? OR tags LIKE ? OR ingredients LIKE ?)
           ORDER BY ${order}${opts?.limit ? ` LIMIT ${opts.limit}` : ""}`,
        )
        .all(householdId, like, like, like) as RecipeRow[];
    }
    return sqlite
      .prepare(`SELECT * FROM recipes WHERE householdId = ? ORDER BY ${order}${opts?.limit ? ` LIMIT ${opts.limit}` : ""}`)
      .all(householdId) as RecipeRow[];
  },
  create(data: RecipeInput & { householdId: string; createdById: string | null }): RecipeRow {
    const id = randomUUID();
    sqlite
      .prepare(
        `INSERT INTO recipes
         (id, title, description, imageUrl, sourceUrl, sourceName, servings, prepMinutes, cookMinutes, ingredients, steps, tags, householdId, createdById)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id, data.title, data.description, data.imageUrl, data.sourceUrl, data.sourceName,
        data.servings, data.prepMinutes, data.cookMinutes, data.ingredients, data.steps, data.tags,
        data.householdId, data.createdById,
      );
    return recipes.byId(id)!;
  },
  update(id: string, data: RecipeInput) {
    sqlite
      .prepare(
        `UPDATE recipes SET
         title = ?, description = ?, imageUrl = ?, sourceUrl = ?, sourceName = ?,
         servings = ?, prepMinutes = ?, cookMinutes = ?, ingredients = ?, steps = ?, tags = ?,
         updatedAt = datetime('now')
         WHERE id = ?`,
      )
      .run(
        data.title, data.description, data.imageUrl, data.sourceUrl, data.sourceName,
        data.servings, data.prepMinutes, data.cookMinutes, data.ingredients, data.steps, data.tags,
        id,
      );
  },
  remove(id: string) {
    sqlite.prepare("DELETE FROM recipes WHERE id = ?").run(id);
  },
  creatorName(recipe: RecipeRow): string | null {
    if (!recipe.createdById) return null;
    const row = sqlite.prepare("SELECT name FROM users WHERE id = ?").get(recipe.createdById) as { name: string } | undefined;
    return row?.name ?? null;
  },
};

/* ---------- plan entries ---------- */

export type PlanEntryWithRecipe = PlanEntryRow & {
  recipe: Pick<RecipeRow, "id" | "title" | "servings" | "ingredients">;
};

export const planEntries = {
  byId(id: string): PlanEntryRow | undefined {
    return sqlite.prepare("SELECT * FROM plan_entries WHERE id = ?").get(id) as PlanEntryRow | undefined;
  },
  inRange(householdId: string, start: string, end: string): PlanEntryWithRecipe[] {
    const rows = sqlite
      .prepare(
        `SELECT p.*, r.title AS r_title, r.servings AS r_servings, r.ingredients AS r_ingredients
         FROM plan_entries p JOIN recipes r ON r.id = p.recipeId
         WHERE p.householdId = ? AND p.date >= ? AND p.date <= ?
         ORDER BY p.date ASC`,
      )
      .all(householdId, start, end) as Array<PlanEntryRow & { r_title: string; r_servings: number; r_ingredients: string }>;
    return rows.map(({ r_title, r_servings, r_ingredients, ...p }) => ({
      ...p,
      recipe: { id: p.recipeId, title: r_title, servings: r_servings, ingredients: r_ingredients },
    }));
  },
  create(data: { date: string; meal: string; servings: number; recipeId: string; householdId: string }): PlanEntryRow {
    const id = randomUUID();
    sqlite
      .prepare("INSERT INTO plan_entries (id, date, meal, servings, recipeId, householdId) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, data.date, data.meal, data.servings, data.recipeId, data.householdId);
    return planEntries.byId(id)!;
  },
  remove(id: string) {
    sqlite.prepare("DELETE FROM plan_entries WHERE id = ?").run(id);
  },
};

/* ---------- grocery items ---------- */

export const groceryItems = {
  byId(id: string): GroceryItemRow | undefined {
    return sqlite.prepare("SELECT * FROM grocery_items WHERE id = ?").get(id) as GroceryItemRow | undefined;
  },
  forHousehold(householdId: string): GroceryItemRow[] {
    return sqlite
      .prepare("SELECT * FROM grocery_items WHERE householdId = ? ORDER BY checked ASC, name COLLATE NOCASE ASC")
      .all(householdId) as GroceryItemRow[];
  },
  countUnchecked(householdId: string): number {
    const row = sqlite
      .prepare("SELECT COUNT(*) AS n FROM grocery_items WHERE householdId = ? AND checked = 0")
      .get(householdId) as { n: number };
    return row.n;
  },
  create(data: { name: string; amount: number | null; unit: string | null; kind: string; note?: string; householdId: string }) {
    sqlite
      .prepare("INSERT INTO grocery_items (id, name, amount, unit, kind, note, householdId) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(randomUUID(), data.name, data.amount, data.unit, data.kind, data.note ?? "", data.householdId);
  },
  createMany(items: Array<{ name: string; amount: number | null; unit: string | null; kind: string; note: string }>, householdId: string) {
    const stmt = sqlite.prepare(
      "INSERT INTO grocery_items (id, name, amount, unit, kind, note, householdId) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    const insertAll = sqlite.transaction((rows: typeof items) => {
      for (const i of rows) stmt.run(randomUUID(), i.name, i.amount, i.unit, i.kind, i.note, householdId);
    });
    insertAll(items);
  },
  setChecked(id: string, checked: boolean) {
    sqlite.prepare("UPDATE grocery_items SET checked = ? WHERE id = ?").run(checked ? 1 : 0, id);
  },
  remove(id: string) {
    sqlite.prepare("DELETE FROM grocery_items WHERE id = ?").run(id);
  },
  clear(householdId: string, onlyChecked: boolean) {
    if (onlyChecked) {
      sqlite.prepare("DELETE FROM grocery_items WHERE householdId = ? AND checked = 1").run(householdId);
    } else {
      sqlite.prepare("DELETE FROM grocery_items WHERE householdId = ?").run(householdId);
    }
  },
};
