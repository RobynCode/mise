import { NextResponse } from "next/server";
import { driver, ready } from "@/lib/db";

/**
 * Liveness + database connectivity check.
 *
 * Useful as a deployment health check — a 503 here almost always means
 * DATABASE_URL is missing or unreachable from this environment.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    await ready();
    await driver.query("SELECT 1");
    return NextResponse.json({ ok: true, database: "postgres", latencyMs: Date.now() - started });
  } catch (e) {
    return NextResponse.json(
      { ok: false, database: "postgres", error: e instanceof Error ? e.message : "Database unreachable" },
      { status: 503 },
    );
  }
}
