import { NextResponse } from "next/server";
import { users } from "@/lib/repo";
import { requireUser } from "@/lib/auth";

const SYSTEMS = ["metric", "imperial"];

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const data: { wetUnits?: string; dryUnits?: string; name?: string } = {};

    if (body?.wetUnits && SYSTEMS.includes(body.wetUnits)) data.wetUnits = body.wetUnits;
    if (body?.dryUnits && SYSTEMS.includes(body.dryUnits)) data.dryUnits = body.dryUnits;
    if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 80);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }
    users.update(user.id, data);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
}
