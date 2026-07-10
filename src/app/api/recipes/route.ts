import { NextResponse } from "next/server";
import { recipes } from "@/lib/repo";
import { requireUser } from "@/lib/auth";
import { sanitizeRecipeInput } from "@/lib/validate";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = sanitizeRecipeInput(body);
    const recipe = recipes.create({ ...data, householdId: user.householdId, createdById: user.id });
    return NextResponse.json({ ok: true, id: recipe.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Something went wrong.";
    const status = msg === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: msg === "UNAUTHORIZED" ? "Not signed in" : msg }, { status });
  }
}
