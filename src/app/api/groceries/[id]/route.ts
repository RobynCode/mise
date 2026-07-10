import { NextResponse } from "next/server";
import { groceryItems } from "@/lib/repo";
import { requireUser } from "@/lib/auth";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const item = groceryItems.byId(id);
    if (!item || item.householdId !== user.householdId) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }
    const body = await req.json().catch(() => ({}));
    const checked = typeof body?.checked === "boolean" ? body.checked : !item.checked;
    groceryItems.setChecked(id, checked);
    return NextResponse.json({ ok: true, checked });
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const item = groceryItems.byId(id);
    if (!item || item.householdId !== user.householdId) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }
    groceryItems.remove(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
}
