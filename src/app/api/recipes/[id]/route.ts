import { NextResponse } from "next/server";
import { recipes } from "@/lib/repo";
import { requireUser } from "@/lib/auth";
import { sanitizeRecipeInput } from "@/lib/validate";
import { computeRecipeNutrition } from "@/lib/nutrition";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const recipe = await recipes.byId(id);
    if (!recipe || recipe.householdId !== user.householdId) {
      return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
    }
    const data = sanitizeRecipeInput(await req.json());
    const nutrition = await computeRecipeNutrition(JSON.parse(data.ingredients), data.servings);
    await recipes.update(id, {
      ...data,
      nutrition: nutrition ? JSON.stringify(nutrition) : null,
      caloriesPerServing: nutrition?.perServing.calories ?? null,
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Something went wrong.";
    const status = msg === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: msg === "UNAUTHORIZED" ? "Not signed in" : msg }, { status });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const recipe = await recipes.byId(id);
    if (!recipe || recipe.householdId !== user.householdId) {
      return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
    }
    await recipes.remove(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
}
