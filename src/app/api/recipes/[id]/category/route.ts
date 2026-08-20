import { NextResponse } from "next/server";
import { recipes } from "@/lib/repo";
import { requireUser } from "@/lib/auth";
import { sanitizeMenuCategory } from "@/lib/validate";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const recipe = await recipes.byId(id);
    if (!recipe || recipe.householdId !== user.householdId) {
      return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
    }
    const body = await req.json();
    const menuCategory = sanitizeMenuCategory(body.menuCategory);
    await recipes.updateMenuCategory(id, menuCategory);
    return NextResponse.json({ ok: true, menuCategory });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Something went wrong.";
    const status = msg === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: msg === "UNAUTHORIZED" ? "Not signed in" : msg }, { status });
  }
}
