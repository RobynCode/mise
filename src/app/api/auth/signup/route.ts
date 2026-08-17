import { NextResponse } from "next/server";
import { users, households } from "@/lib/repo";
import { createSession, hashPassword } from "@/lib/auth";
import { newInviteCode } from "@/lib/validate";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (await users.byEmail(email)) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const household = await households.create({ name: `${name}'s kitchen`, inviteCode: newInviteCode() });
  const user = await users.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    householdId: household.id,
  });

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
