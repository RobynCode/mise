import { NextResponse } from "next/server";
import { driver, ready } from "@/lib/db";

/**
 * Liveness + database connectivity check.
 *
 * Useful as a deployment health check and for confirming, at a glance, which
 * backend a running instance actually picked up — the single most common
 * deploy mistake is a missing DATABASE_URL, which silently falls back to
 * ephemeral SQLite.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    await ready();
    await driver.query("SELECT 1");
    return NextResponse.json({
      ok: true,
      database: driver.kind,
      persistent: driver.kind === "postgres",
      latencyMs: Date.now() - started,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        database: driver.kind,
        error: e instanceof Error ? e.message : "Database unreachable",
      },
      { status: 503 },
    );
  }
}
