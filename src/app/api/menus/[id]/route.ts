import { NextResponse } from "next/server";
import { menuGroups, recipes } from "@/lib/repo";
import { requireUser } from "@/lib/auth";
import { sanitizeMenuGroupInput } from "@/lib/validate";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const group = await menuGroups.byId(id);
    if (!group || group.householdId !== user.householdId) {
      return NextResponse.json({ error: "Menu not found." }, { status: 404 });
    }
    const groupRecipes = await menuGroups.recipesForGroup(id);
    return NextResponse.json({ menu: group, recipes: groupRecipes });
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const group = await menuGroups.byId(id);
    if (!group || group.householdId !== user.householdId) {
      return NextResponse.json({ error: "Menu not found." }, { status: 404 });
    }
    const body = await req.json();

    if (Array.isArray(body.recipeIds)) {
      const ids = body.recipeIds.map((v: unknown) => String(v));
      // Only allow recipes that actually belong to this household.
      const owned = await Promise.all(ids.map((rid: string) => recipes.byId(rid)));
      const validIds = owned
        .filter((r): r is NonNullable<typeof r> => Boolean(r) && r!.householdId === user.householdId)
        .map((r) => r!.id);
      await menuGroups.setRecipes(id, validIds);
    }

    if (body.name != null || body.theme != null) {
      const data = sanitizeMenuGroupInput({ name: body.name ?? group.name, theme: body.theme ?? group.theme });
      await menuGroups.update(id, data);
    }

    return NextResponse.json({ ok: true });
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
    const group = await menuGroups.byId(id);
    if (!group || group.householdId !== user.householdId) {
      return NextResponse.json({ error: "Menu not found." }, { status: 404 });
    }
    await menuGroups.remove(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
}
