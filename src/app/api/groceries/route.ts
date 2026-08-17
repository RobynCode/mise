import { NextResponse } from "next/server";
import { groceryItems, planEntries } from "@/lib/repo";
import { requireUser } from "@/lib/auth";
import { buildGroceryList } from "@/lib/grocery";
import { canonicalUnit, kindOfUnit } from "@/lib/units";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const action = String(body?.action ?? "");

    if (action === "generate") {
      const start = String(body?.start ?? "");
      const end = String(body?.end ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
        return NextResponse.json({ error: "Pick a start and end date." }, { status: 400 });
      }
      const entries = await planEntries.inRange(user.householdId, start, end);
      if (entries.length === 0) {
        return NextResponse.json(
          { error: "No meals are planned in that date range yet. Add some in the meal plan first." },
          { status: 404 },
        );
      }
      const items = buildGroceryList(entries);
      await groceryItems.createMany(items, user.householdId);
      return NextResponse.json({ ok: true, added: items.length });
    }

    if (action === "add") {
      const name = String(body?.name ?? "").trim();
      if (!name) return NextResponse.json({ error: "Type an item name." }, { status: 400 });
      const amountNum = Number(body?.amount);
      const rawUnit = String(body?.unit ?? "").trim();
      const canon = rawUnit ? canonicalUnit(rawUnit) : null;
      const unit = rawUnit ? (canon ?? rawUnit) : null;
      await groceryItems.create({
        name: name.slice(0, 160),
        amount: Number.isFinite(amountNum) && amountNum > 0 ? amountNum : null,
        unit,
        kind: kindOfUnit(canon),
        householdId: user.householdId,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope"); // "checked" | "all"
    await groceryItems.clear(user.householdId, scope === "checked");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
}
