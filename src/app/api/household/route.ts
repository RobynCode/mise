import { NextResponse } from "next/server";
import { households, users } from "@/lib/repo";
import { requireUser } from "@/lib/auth";
import { newInviteCode } from "@/lib/validate";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const action = String(body?.action ?? "");

    if (action === "join") {
      const code = String(body?.code ?? "").trim().toUpperCase();
      const household = households.byInviteCode(code);
      if (!household) {
        return NextResponse.json({ error: "That invite code doesn't match any household." }, { status: 404 });
      }
      if (household.id === user.householdId) {
        return NextResponse.json({ error: "You're already in this household." }, { status: 400 });
      }
      const oldHouseholdId = user.householdId;
      users.update(user.id, { householdId: household.id });
      households.deleteIfEmpty(oldHouseholdId);
      return NextResponse.json({ ok: true, name: household.name });
    }

    if (action === "rename") {
      const name = String(body?.name ?? "").trim().slice(0, 80);
      if (!name) return NextResponse.json({ error: "Type a household name." }, { status: 400 });
      households.update(user.householdId, { name });
      return NextResponse.json({ ok: true });
    }

    if (action === "regenerate") {
      const code = newInviteCode();
      households.update(user.householdId, { inviteCode: code });
      return NextResponse.json({ ok: true, code });
    }

    if (action === "leave") {
      if (users.countInHousehold(user.householdId) <= 1) {
        return NextResponse.json(
          { error: "You're the only member — this is already your own household." },
          { status: 400 },
        );
      }
      const household = households.create({ name: `${user.name}'s kitchen`, inviteCode: newInviteCode() });
      users.update(user.id, { householdId: household.id });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
}
