import { NextResponse } from "next/server";
import { menuGroups } from "@/lib/repo";
import { requireUser } from "@/lib/auth";
import { sanitizeMenuGroupInput } from "@/lib/validate";

export async function GET() {
  try {
    const user = await requireUser();
    const groups = await menuGroups.forHousehold(user.householdId);
    const withCounts = await Promise.all(
      groups.map(async (g) => ({ ...g, recipeCount: await menuGroups.countRecipes(g.id) })),
    );
    return NextResponse.json({ menus: withCounts });
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const data = sanitizeMenuGroupInput(await req.json());
    const group = await menuGroups.create({ ...data, householdId: user.householdId });
    return NextResponse.json({ ok: true, id: group.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Something went wrong.";
    const status = msg === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: msg === "UNAUTHORIZED" ? "Not signed in" : msg }, { status });
  }
}
