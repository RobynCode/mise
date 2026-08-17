/**
 * Copies everything from the local SQLite database into Postgres.
 *
 *   DATABASE_URL="postgres://…" npm run db:migrate
 *
 * Options:
 *   --sqlite=<path>   source file (default ./data/mise.db)
 *   --fresh           DROP the destination tables first (destructive)
 *   --dry-run         report what would be copied, write nothing
 *
 * The copy is idempotent: rows are inserted with ON CONFLICT (id) DO NOTHING,
 * so re-running after a partial failure resumes safely rather than
 * duplicating. Tables are copied parent-first so foreign keys always resolve,
 * and the whole thing runs in one transaction — if any table fails, nothing
 * is committed.
 */

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { Pool } from "pg";
import { resolveSsl, stripSslMode, type SslConfig } from "../src/lib/db";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string, fallback: string) =>
  args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? fallback;

const SQLITE_PATH = path.resolve(opt("sqlite", path.join(process.cwd(), "data", "mise.db")));
const DRY_RUN = flag("dry-run");
const FRESH = flag("fresh");

/**
 * Copy order matters: households before users (users reference households),
 * recipes before plan_entries, and so on.
 *
 * `columns` lists the SQLite column names; the Postgres equivalents are the
 * same names lower-cased, which is what the Postgres schema declares.
 */
const TABLES: Array<{ name: string; columns: string[]; conflictKey: string; booleans?: string[] }> = [
  {
    name: "households",
    columns: ["id", "name", "inviteCode", "createdAt"],
    conflictKey: "id",
  },
  {
    name: "users",
    columns: ["id", "email", "name", "passwordHash", "wetUnits", "dryUnits", "householdId", "createdAt"],
    conflictKey: "id",
  },
  {
    name: "recipes",
    columns: [
      "id", "title", "description", "imageUrl", "sourceUrl", "sourceName", "servings",
      "prepMinutes", "cookMinutes", "ingredients", "steps", "tags", "nutrition",
      "caloriesPerServing", "householdId", "createdById", "createdAt", "updatedAt",
    ],
    conflictKey: "id",
  },
  {
    name: "plan_entries",
    columns: ["id", "date", "meal", "servings", "recipeId", "householdId", "createdAt"],
    conflictKey: "id",
  },
  {
    name: "grocery_items",
    columns: ["id", "name", "amount", "unit", "kind", "checked", "note", "householdId", "createdAt"],
    conflictKey: "id",
    booleans: ["checked"],
  },
  {
    name: "nutrition_cache",
    columns: ["name", "data", "createdAt"],
    conflictKey: "name",
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Point it at your Postgres instance, e.g.\n");
    console.error('  DATABASE_URL="postgres://user:pass@host:5432/mise" npm run db:migrate\n');
    process.exit(1);
  }
  if (!fs.existsSync(SQLITE_PATH)) {
    console.error(`No SQLite database found at ${SQLITE_PATH}`);
    console.error("Pass --sqlite=<path> if your file lives somewhere else.");
    process.exit(1);
  }

  console.log(`Source:      ${SQLITE_PATH}`);
  console.log(`Destination: ${url.replace(/:[^:@/]*@/, ":****@")}`);
  if (DRY_RUN) console.log("Mode:        DRY RUN (nothing will be written)\n");
  else console.log("");

  const sqlite = new Database(SQLITE_PATH, { readonly: true });

  // Same TLS negotiation the app uses, including the fallback, so a
  // connection that works for the running app also works here.
  const makePool = (ssl: SslConfig) => new Pool({ connectionString: stripSslMode(url), ssl });
  let pool = makePool(resolveSsl(url));
  try {
    (await pool.connect()).release();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/does not support SSL|SSL.*required/i.test(msg)) throw e;
    const retry: SslConfig = /does not support SSL/i.test(msg) ? false : { rejectUnauthorized: false };
    console.log(`Adjusting TLS (${retry === false ? "disabled" : "enabled"}) and retrying…`);
    await pool.end().catch(() => {});
    pool = makePool(retry);
  }

  // A file with none of our tables is almost always the wrong path (or a
  // database the app has never initialised). Fail loudly rather than
  // reporting a cheerful "0 rows copied" that looks like success.
  const sourceTables = (
    sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>
  ).map((t) => t.name);
  const known = TABLES.filter((t) => sourceTables.includes(t.name));
  if (known.length === 0) {
    console.error(`\nNo Mise tables found in ${SQLITE_PATH}.`);
    console.error(`Tables present: ${sourceTables.length ? sourceTables.join(", ") : "(none)"}`);
    console.error("Check the path, or pass --sqlite=<path> to point at the right file.");
    sqlite.close();
    await pool.end();
    process.exit(1);
  }

  const client = await pool.connect();
  const counts: Record<string, number> = {};
  let skipped = 0;

  try {
    // Build the destination schema using the app's own definition, so the
    // migration can never drift from what the running app expects.
    if (!DRY_RUN) {
      if (FRESH) {
        console.log("Dropping existing destination tables (--fresh)…");
        await client.query(
          `DROP TABLE IF EXISTS grocery_items, plan_entries, recipes, users, households, nutrition_cache CASCADE`,
        );
      }
      process.env.DATABASE_URL = url;
      const { driver } = await import("../src/lib/db");
      await driver.init();
      console.log("Destination schema ready.\n");
    }

    if (!DRY_RUN) await client.query("BEGIN");

    for (const table of TABLES) {
      // Only copy columns that actually exist in the source, so databases
      // created before newer features (nutrition, etc.) still migrate.
      const present = new Set(
        (sqlite.prepare(`PRAGMA table_info(${table.name})`).all() as Array<{ name: string }>).map((c) => c.name),
      );
      if (present.size === 0) {
        console.log(`${table.name.padEnd(16)} — not present in source, skipping`);
        continue;
      }
      const columns = table.columns.filter((c) => present.has(c));
      const rows = sqlite.prepare(`SELECT ${columns.map((c) => `"${c}"`).join(", ")} FROM ${table.name}`).all() as Array<
        Record<string, unknown>
      >;

      if (rows.length === 0) {
        console.log(`${table.name.padEnd(16)} 0 rows`);
        counts[table.name] = 0;
        continue;
      }

      if (DRY_RUN) {
        console.log(`${table.name.padEnd(16)} ${rows.length} rows would be copied`);
        counts[table.name] = rows.length;
        continue;
      }

      const targetCols = columns.map((c) => `"${c.toLowerCase()}"`).join(", ");
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
      const sql = `INSERT INTO ${table.name} (${targetCols}) VALUES (${placeholders}) ON CONFLICT (${table.conflictKey}) DO NOTHING`;

      let inserted = 0;
      for (const row of rows) {
        const values = columns.map((c) => {
          const v = row[c];
          // SQLite stores booleans as 0/1; Postgres wants real booleans.
          if (table.booleans?.includes(c)) return v === 1 || v === true;
          return v;
        });
        const res = await client.query(sql, values);
        if (res.rowCount === 0) skipped += 1;
        else inserted += 1;
      }
      counts[table.name] = inserted;
      console.log(`${table.name.padEnd(16)} ${inserted} rows copied${rows.length - inserted > 0 ? ` (${rows.length - inserted} already present)` : ""}`);
    }

    if (!DRY_RUN) {
      await client.query("COMMIT");
      console.log("\nCommitted.");
    }
  } catch (e) {
    if (!DRY_RUN) await client.query("ROLLBACK").catch(() => {});
    console.error("\nMigration failed — no changes were committed.");
    throw e;
  } finally {
    client.release();
    sqlite.close();
    await pool.end();
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(
    DRY_RUN
      ? `\nDry run complete: ${total} rows would be copied.`
      : `\nDone: ${total} rows copied${skipped > 0 ? `, ${skipped} already existed` : ""}.`,
  );
  if (!DRY_RUN) {
    console.log("\nNext steps:");
    console.log("  1. Set DATABASE_URL in your deployment environment.");
    console.log("  2. Redeploy. The app will use Postgres automatically.");
    console.log("  3. Verify, then archive data/mise.db (it is no longer read).");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
