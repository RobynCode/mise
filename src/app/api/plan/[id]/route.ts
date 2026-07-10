import { NextResponse } from "next/server";
import { planEntries } from "@/lib/repo";
import { requireUser } from "@/lib/auth";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const entry = planEntries.byId(id);
    if (!entry || entry.householdId !== user.householdId) {
      return NextResponse.json({ error: "Plan entry not found." }, { status: 404 });
    }
    planEntries.remove(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
}
