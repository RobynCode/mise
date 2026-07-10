import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const SCHEMA = `
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
  householdId TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  createdById TEXT REFERENCES users(id) ON DELETE SET NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

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
`;

function open(): Database.Database {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "mise.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

const globalForDb = globalThis as unknown as { __miseDb?: Database.Database };

export const sqlite: Database.Database = globalForDb.__miseDb ?? open();
if (process.env.NODE_ENV !== "production") globalForDb.__miseDb = sqlite;
