import { NextResponse } from "next/server";
import { recipes } from "@/lib/repo";
import { requireUser } from "@/lib/auth";
import { importRecipeFromUrl } from "@/lib/importRecipe";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const url = String(body?.url ?? "").trim();
    if (!url) return NextResponse.json({ error: "Paste a recipe URL first." }, { status: 400 });

    const imported = await importRecipeFromUrl(url);

    const recipe = recipes.create({
      title: imported.title,
      description: imported.description,
      imageUrl: imported.imageUrl,
      sourceUrl: imported.sourceUrl,
      sourceName: imported.sourceName,
      servings: imported.servings,
      prepMinutes: imported.prepMinutes,
      cookMinutes: imported.cookMinutes,
      ingredients: JSON.stringify(imported.ingredients),
      steps: JSON.stringify(imported.steps),
      tags: "",
      householdId: user.householdId,
      createdById: user.id,
    });
    return NextResponse.json({ ok: true, id: recipe.id, title: recipe.title });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Import failed.";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
