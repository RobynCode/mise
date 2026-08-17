import { NextResponse } from "next/server";
import { recipes } from "@/lib/repo";
import { requireUser } from "@/lib/auth";
import { sanitizeRecipeInput } from "@/lib/validate";
import { computeRecipeNutrition } from "@/lib/nutrition";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = sanitizeRecipeInput(body);
    const nutrition = await computeRecipeNutrition(JSON.parse(data.ingredients), data.servings);
    const recipe = await recipes.create({
      ...data,
      nutrition: nutrition ? JSON.stringify(nutrition) : null,
      caloriesPerServing: nutrition?.perServing.calories ?? null,
      householdId: user.householdId,
      createdById: user.id,
    });
    return NextResponse.json({ ok: true, id: recipe.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Something went wrong.";
    const status = msg === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: msg === "UNAUTHORIZED" ? "Not signed in" : msg }, { status });
  }
}
