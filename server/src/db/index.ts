import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const DB_PROVIDER = process.env.DB_PROVIDER || "sqlite";
const DB_PATH = process.env.DB_PATH || "./data/devtodo.db";

// Resolve project root (parent of server/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../..");

function createDb() {
  if (DB_PROVIDER === "turso") {
    throw new Error(
      "Turso provider requires @libsql/client. Install it and configure TURSO_DATABASE_URL.",
    );
  }

  // Default: local SQLite via better-sqlite3
  // Resolve relative paths from project root, not CWD
  const dbPath = path.isAbsolute(DB_PATH)
    ? DB_PATH
    : path.resolve(PROJECT_ROOT, DB_PATH);
  // Ensure parent directory exists
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export const db = createDb();
export type DbType = typeof db;
