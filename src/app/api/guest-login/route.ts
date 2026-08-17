import { NextResponse } from "next/server";
import { users } from "@/lib/repo";
import { createSession } from "@/lib/auth";

export async function POST() {
  const guestUser = await users.byEmail("guest@mise.local");
  if (!guestUser) {
    return NextResponse.json(
      { error: "Guest account not set up. Run npm run db:seed first." },
      { status: 503 },
    );
  }

  await createSession(guestUser.id);
  return NextResponse.json({ ok: true });
}
