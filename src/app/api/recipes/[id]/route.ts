import { NextResponse } from "next/server";
import { recipes } from "@/lib/repo";
import { requireUser } from "@/lib/auth";
import { sanitizeRecipeInput } from "@/lib/validate";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const recipe = recipes.byId(id);
    if (!recipe || recipe.householdId !== user.householdId) {
      return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
    }
    const data = sanitizeRecipeInput(await req.json());
    recipes.update(id, data);
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
    const recipe = recipes.byId(id);
    if (!recipe || recipe.householdId !== user.householdId) {
      return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
    }
    recipes.remove(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
}
