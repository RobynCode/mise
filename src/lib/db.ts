/**
 * Database layer with two interchangeable backends.
 *
 *   DATABASE_URL set  → PostgreSQL (persistent; use in production)
 *   DATABASE_URL unset → SQLite file at ./data/mise.db (zero-config local dev)
 *
 * Both expose the same async interface, so the repository layer and every
 * call site are written once. Queries are authored with `?` placeholders and
 * SQLite-flavoured SQL; the Postgres driver rewrites placeholders to $1, $2…
 * and the `dialect` helpers below paper over the remaining differences.
 *
 * Why this shape: local development, the seed script, and the /guest demo all
 * work after a bare `npm install`, while a deployed instance keeps its data
 * across redeploys by pointing DATABASE_URL at a managed Postgres.
 */

import path from "path";
import fs from "fs";

export type Dialect = "sqlite" | "postgres";

export const DIALECT: Dialect = process.env.DATABASE_URL ? "postgres" : "sqlite";
export const isPostgres = DIALECT === "postgres";

/* ------------------------------------------------------------------ *
 * Dialect helpers — used by repo.ts to build portable SQL
 * ------------------------------------------------------------------ */

export const dialect = {
  /** Current timestamp expression. */
  now: isPostgres ? "NOW()" : "datetime('now')",
  /** Case-insensitive LIKE. */
  like: isPostgres ? "ILIKE" : "LIKE",
  /** Case-insensitive ordering for a column. */
  caseInsensitive: (col: string) => (isPostgres ? `LOWER(${col})` : `${col} COLLATE NOCASE`),
  /** Boolean literal. */
  bool: (v: boolean) => (isPostgres ? v : v ? 1 : 0),
  /** Coerce a stored boolean back to JS (SQLite stores 0/1). */
  toBool: (v: unknown) => v === true || v === 1 || v === "1" || v === "t",
};

/* ------------------------------------------------------------------ *
 * Schema
 * ------------------------------------------------------------------ */

const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  inviteCode TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  passwordHash TEXT NOT NULL,
  wetUnits TEXT NOT NULL DEFAULT 'imperial',
  dryUnits TEXT NOT NULL DEFAULT 'metric',
  householdId TEXT NOT NULL REFERENCES households(id),
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  imageUrl TEXT,
  sourceUrl TEXT,
  sourceName TEXT,
  servings INTEGER NOT NULL DEFAULT 4,
  prepMinutes INTEGER,
  cookMinutes INTEGER,
  ingredients TEXT NOT NULL DEFAULT '[]',
  steps TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '',
  nutrition TEXT,
  caloriesPerServing REAL,
  menuCategory TEXT NOT NULL DEFAULT '',
  householdId TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  createdById TEXT REFERENCES users(id) ON DELETE SET NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_recipes_household ON recipes(householdId);
CREATE INDEX IF NOT EXISTS idx_recipes_calories ON recipes(householdId, caloriesPerServing);

CREATE TABLE IF NOT EXISTS plan_entries (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  meal TEXT NOT NULL,
  servings INTEGER NOT NULL DEFAULT 4,
  recipeId TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  householdId TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_plan_household_date ON plan_entries(householdId, date);

CREATE TABLE IF NOT EXISTS grocery_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount REAL,
  unit TEXT,
  kind TEXT NOT NULL DEFAULT 'count',
  checked INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  householdId TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_grocery_household ON grocery_items(householdId);

CREATE TABLE IF NOT EXISTS nutrition_cache (
  name TEXT PRIMARY KEY,
  data TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS menu_group (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT 'classic',
  primaryColor TEXT NOT NULL DEFAULT '#000000',
  secondaryColor TEXT NOT NULL DEFAULT '#FFFFFF',
  householdId TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_menu_group_household ON menu_group(householdId);

CREATE TABLE IF NOT EXISTS menu_group_recipes (
  menuGroupId TEXT NOT NULL REFERENCES menu_group(id) ON DELETE CASCADE,
  recipeId TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  PRIMARY KEY (menuGroupId, recipeId)
);
`;

const POSTGRES_SCHEMA = `
CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "invitecode" TEXT NOT NULL UNIQUE,
  "createdat" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  "passwordhash" TEXT NOT NULL,
  "wetunits" TEXT NOT NULL DEFAULT 'imperial',
  "dryunits" TEXT NOT NULL DEFAULT 'metric',
  "householdid" TEXT NOT NULL REFERENCES households(id),
  "createdat" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  "imageurl" TEXT,
  "sourceurl" TEXT,
  "sourcename" TEXT,
  servings INTEGER NOT NULL DEFAULT 4,
  "prepminutes" INTEGER,
  "cookminutes" INTEGER,
  ingredients TEXT NOT NULL DEFAULT '[]',
  steps TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '',
  nutrition TEXT,
  "caloriesperserving" DOUBLE PRECISION,
  "menucategory" TEXT NOT NULL DEFAULT '',
  "householdid" TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  "createdbyid" TEXT REFERENCES users(id) ON DELETE SET NULL,
  "createdat" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedat" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recipes_household ON recipes("householdid");
CREATE INDEX IF NOT EXISTS idx_recipes_calories ON recipes("householdid", "caloriesperserving");

CREATE TABLE IF NOT EXISTS plan_entries (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  meal TEXT NOT NULL,
  servings INTEGER NOT NULL DEFAULT 4,
  "recipeid" TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  "householdid" TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  "createdat" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plan_household_date ON plan_entries("householdid", date);

CREATE TABLE IF NOT EXISTS grocery_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount DOUBLE PRECISION,
  unit TEXT,
  kind TEXT NOT NULL DEFAULT 'count',
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT NOT NULL DEFAULT '',
  "householdid" TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  "createdat" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grocery_household ON grocery_items("householdid");

CREATE TABLE IF NOT EXISTS nutrition_cache (
  name TEXT PRIMARY KEY,
  data TEXT,
  "createdat" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_group (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "householdid" TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  "createdat" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  theme TEXT NOT NULL DEFAULT 'classic',
  primarycolor TEXT NOT NULL DEFAULT '#000000',
  secondarycolor TEXT NOT NULL DEFAULT '#FFFFFF'
);

CREATE TABLE IF NOT EXISTS menu_group_recipes (
  "menugroupid" TEXT NOT NULL REFERENCES menu_group(id) ON DELETE CASCADE,
  "recipeid" TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  PRIMARY KEY ("menugroupid", "recipeid")
);
`;

/* ------------------------------------------------------------------ *
 * Row normalisation
 *
 * Postgres folds unquoted identifiers to lower case, so `SELECT *` returns
 * `householdid` where SQLite returns `householdId`. Rather than leak that
 * difference into every call site, rows coming back from Postgres are mapped
 * to the canonical camelCase names below, and TIMESTAMPTZ values are
 * converted to ISO strings to match SQLite's text timestamps.
 * ------------------------------------------------------------------ */

const CAMEL_FIELDS = [
  "inviteCode", "createdAt", "updatedAt", "passwordHash", "wetUnits", "dryUnits",
  "householdId", "createdById", "recipeId", "imageUrl", "sourceUrl", "sourceName",
  "prepMinutes", "cookMinutes", "caloriesPerServing", "menuCategory", "menuGroupId",
  "primaryColor", "secondaryColor",
];

const LOWER_TO_CAMEL = new Map(CAMEL_FIELDS.map((f) => [f.toLowerCase(), f]));

function normalizeRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const name = LOWER_TO_CAMEL.get(key) ?? key;
    out[name] = value instanceof Date ? value.toISOString() : value;
  }
  return out as T;
}

/* ------------------------------------------------------------------ *
 * Driver interface
 * ------------------------------------------------------------------ */

export interface DbDriver {
  kind: Dialect;
  /** Run a SELECT and return rows. */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Run a mutation. */
  execute(sql: string, params?: unknown[]): Promise<void>;
  /** Run a batch of mutations atomically. */
  transaction(fn: (tx: DbDriver) => Promise<void>): Promise<void>;
  /** Create tables if they don't exist and apply additive migrations. */
  init(): Promise<void>;
  close(): Promise<void>;
}

/* ---------- SQLite driver ---------- */

function createSqliteDriver(): DbDriver {
  // Required lazily so `pg`-only deployments never load the native module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3") as typeof import("better-sqlite3");

  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "mise.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const driver: DbDriver = {
    kind: "sqlite",
    async query<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...(params as never[])) as T[];
    },
    async execute(sql: string, params: unknown[] = []) {
      db.prepare(sql).run(...(params as never[]));
    },
    async transaction(fn) {
      db.exec("BEGIN");
      try {
        await fn(driver);
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    async init() {
      db.exec(SQLITE_SCHEMA);
      // Additive migrations for databases created by earlier versions.
      const cols = (db.prepare("PRAGMA table_info(recipes)").all() as Array<{ name: string }>).map((c) => c.name);
      if (!cols.includes("nutrition")) db.exec("ALTER TABLE recipes ADD COLUMN nutrition TEXT");
      if (!cols.includes("caloriesPerServing")) db.exec("ALTER TABLE recipes ADD COLUMN caloriesPerServing REAL");
      if (!cols.includes("menuCategory")) db.exec("ALTER TABLE recipes ADD COLUMN menuCategory TEXT NOT NULL DEFAULT ''");
    },
    async close() {
      db.close();
    },
  };
  return driver;
}

/* ---------- Postgres driver ---------- */

/** Rewrite `?` placeholders to Postgres `$1, $2, …`. */
function toPgPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export type SslConfig = false | { rejectUnauthorized: boolean };

/**
 * Hosts reachable only over a provider's private network, or on this machine.
 * Traffic to these never crosses the public internet — Railway's private
 * network is WireGuard-encrypted already — and such servers frequently have
 * no TLS certificate configured, so TLS is off by default for them.
 */
function isPrivateHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".railway.internal") ||
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

/**
 * Decide whether to negotiate TLS.
 *
 * Precedence: an explicit `sslmode` in the connection string, then the
 * PGSSLMODE environment variable, then an inference from the hostname.
 * Managed providers reached over the public internet (Neon, Supabase, RDS,
 * Railway's TCP proxy) require TLS; private and local hosts usually don't
 * offer it. `connect()` below recovers automatically if this guess is wrong.
 */
export function resolveSsl(url: string): SslConfig {
  let host = "";
  let mode: string | null = null;
  try {
    const parsed = new URL(url);
    host = parsed.hostname;
    mode = parsed.searchParams.get("sslmode");
  } catch {
    /* fall through to env/default handling */
  }
  mode = mode ?? process.env.PGSSLMODE ?? null;

  if (mode === "disable") return false;
  if (mode === "verify-ca" || mode === "verify-full") return { rejectUnauthorized: true };
  if (mode === "require" || mode === "prefer" || mode === "allow") return { rejectUnauthorized: false };

  return isPrivateHost(host) ? false : { rejectUnauthorized: false };
}

/** Remove `sslmode` from a connection string, preserving everything else. */
export function stripSslMode(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("sslmode")) return url;
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    return url;
  }
}

function createPostgresDriver(): DbDriver {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg") as typeof import("pg");
  const url = process.env.DATABASE_URL!;

  // `pg` parses `sslmode` out of the connection string and applies it on top
  // of the `ssl` option, which would undo a fallback decision made below.
  // Strip it so our explicit `ssl` value is authoritative.
  const baseUrl = stripSslMode(url);

  const poolOptions = (ssl: SslConfig) => ({
    connectionString: baseUrl,
    ssl,
    // Long-lived container hosts (Railway, Render, Fly) reuse one pool, so a
    // handful of connections is plenty. On serverless platforms, prefer your
    // provider's pooled connection string over raising this.
    max: Number(process.env.PGPOOL_MAX ?? 5),
    idleTimeoutMillis: 15_000,
    connectionTimeoutMillis: 10_000,
  });

  let pool = new Pool(poolOptions(resolveSsl(url)));

  /**
   * Verify connectivity once at startup, and self-correct the two TLS
   * mismatches that are awkward to diagnose from a deploy log:
   * a server that does not speak TLS when we offered it, and a server that
   * demands TLS when we did not.
   */
  async function verifyConnection(): Promise<void> {
    try {
      const client = await pool.connect();
      client.release();
      return;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const sslNotSupported = /does not support SSL/i.test(message);
      const sslRequired = /SSL.*required|no pg_hba\.conf entry.*SSL/i.test(message);
      if (!sslNotSupported && !sslRequired) throw e;

      const retryWith: SslConfig = sslNotSupported ? false : { rejectUnauthorized: false };
      console.warn(
        `[db] Postgres ${sslNotSupported ? "does not support TLS" : "requires TLS"}; retrying with SSL ${
          sslNotSupported ? "disabled" : "enabled"
        }.`,
      );
      await pool.end().catch(() => {});
      pool = new Pool(poolOptions(retryWith));
      const client = await pool.connect();
      client.release();
    }
  }

  const makeDriver = (exec: (sql: string, params: unknown[]) => Promise<{ rows: unknown[] }>): DbDriver => ({
    kind: "postgres",
    async query<T>(sql: string, params: unknown[] = []) {
      const res = await exec(toPgPlaceholders(sql), params);
      return (res.rows as Record<string, unknown>[]).map((r) => normalizeRow<T>(r));
    },
    async execute(sql: string, params: unknown[] = []) {
      await exec(toPgPlaceholders(sql), params);
    },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const txDriver = makeDriver((s, p) => client.query(s, p as never[]));
        await fn(txDriver);
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    },
    async init() {
      await verifyConnection();
      await exec(POSTGRES_SCHEMA, []);
      // Additive migrations for databases created by earlier versions.
      const { rows } = await exec(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'recipes'`,
        [],
      );
      const cols = (rows as Array<{ column_name: string }>).map((r) => r.column_name.toLowerCase());
      if (!cols.includes("nutrition")) {
        await exec(`ALTER TABLE recipes ADD COLUMN nutrition TEXT`, []);
      }
      if (!cols.includes("caloriesperserving")) {
        await exec(`ALTER TABLE recipes ADD COLUMN "caloriesperserving" DOUBLE PRECISION`, []);
      }
      if (!cols.includes("menucategory")) {
        await exec(`ALTER TABLE recipes ADD COLUMN "menucategory" TEXT NOT NULL DEFAULT ''`, []);
      }
      const { rows: menuGroupCols } = await exec(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'menu_group'`,
        [],
      );
      const mgCols = (menuGroupCols as Array<{ column_name: string }>).map((r) => r.column_name.toLowerCase());
      if (!mgCols.includes("theme")) {
        await exec(`ALTER TABLE menu_group ADD COLUMN theme TEXT NOT NULL DEFAULT 'classic'`, []);
      }
    },
    async close() {
      await pool.end();
    },
  });

  // Reads `pool` at call time, so a swap inside verifyConnection is picked up.
  return makeDriver((sql, params) => pool.query(sql, params as never[]));
}

/* ------------------------------------------------------------------ *
 * Singleton
 * ------------------------------------------------------------------ */

const globalForDb = globalThis as unknown as { __miseDriver?: DbDriver; __miseInit?: Promise<void> };

export const driver: DbDriver = globalForDb.__miseDriver ?? (isPostgres ? createPostgresDriver() : createSqliteDriver());
if (process.env.NODE_ENV !== "production") globalForDb.__miseDriver = driver;

/**
 * Ensures the schema exists. Every repository call awaits this, and the
 * promise is memoised so initialisation runs exactly once per process.
 */
export function ready(): Promise<void> {
  if (!globalForDb.__miseInit) {
    globalForDb.__miseInit = driver.init();
  }
  return globalForDb.__miseInit;
}

/** Convenience wrappers that guarantee the schema is ready first. */
export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  await ready();
  return driver.query<T>(sql, params);
}

export async function execute(sql: string, params: unknown[] = []): Promise<void> {
  await ready();
  return driver.execute(sql, params);
}
