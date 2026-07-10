import { NextResponse } from "next/server";
import { planEntries, recipes } from "@/lib/repo";
import { requireUser } from "@/lib/auth";

const MEALS = ["breakfast", "lunch", "dinner", "snack"];

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const date = String(body?.date ?? "");
    const meal = String(body?.meal ?? "dinner");
    const recipeId = String(body?.recipeId ?? "");
    const servings = Math.min(64, Math.max(1, Math.round(Number(body?.servings)) || 0));

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Pick a date." }, { status: 400 });
    }
    if (!MEALS.includes(meal)) {
      return NextResponse.json({ error: "Pick a meal." }, { status: 400 });
    }
    const recipe = recipes.byId(recipeId);
    if (!recipe || recipe.householdId !== user.householdId) {
      return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
    }

    const entry = planEntries.create({
      date,
      meal,
      servings: servings || recipe.servings,
      recipeId,
      householdId: user.householdId,
    });
    return NextResponse.json({ ok: true, id: entry.id });
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
}
