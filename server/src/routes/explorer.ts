import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const DB_PATH = path.isAbsolute(process.env.DB_PATH || "")
  ? process.env.DB_PATH!
  : path.resolve(PROJECT_ROOT, process.env.DB_PATH || "./data/devtodo.db");

const router = Router();
router.use(requireAuth);

// Get all tables
router.get("/tables", (_req: AuthRequest, res: Response) => {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%' ORDER BY name",
      )
      .all() as Array<{ name: string }>;

    const result = tables.map((t) => {
      const count = db.prepare(`SELECT COUNT(*) as count FROM "${t.name}"`).get() as { count: number };
      const info = db.prepare(`PRAGMA table_info("${t.name}")`).all() as Array<{
        name: string;
        type: string;
        notnull: number;
        pk: number;
      }>;
      return {
        name: t.name,
        rowCount: count.count,
        columns: info.map((c) => ({
          name: c.name,
          type: c.type,
          notNull: c.notnull === 1,
          primaryKey: c.pk === 1,
        })),
      };
    });

    res.json(result);
  } finally {
    db.close();
  }
});

// Get rows from a table
router.get("/tables/:name", (req: AuthRequest, res: Response) => {
  const tableName = req.params.name as string;
  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 200);
  const offset = (page - 1) * limit;

  const db = new Database(DB_PATH, { readonly: true });
  try {
    // Verify table exists
    const exists = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
      )
      .get(tableName);
    if (!exists) {
      res.status(404).json({ error: "Table not found" });
      return;
    }

    const countRow = db.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`).get() as { count: number };
    const rows = db.prepare(`SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`).all(limit, offset);

    res.json({
      table: tableName,
      totalRows: countRow.count,
      page,
      limit,
      totalPages: Math.ceil(countRow.count / limit),
      rows,
    });
  } finally {
    db.close();
  }
});

// Run a read-only SQL query
router.post("/query", (req: AuthRequest, res: Response) => {
  const { sql } = req.body;
  if (!sql || typeof sql !== "string") {
    res.status(400).json({ error: "SQL query required" });
    return;
  }

  // Block write operations
  const normalized = sql.trim().toUpperCase();
  const writeOps = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "REPLACE", "ATTACH", "DETACH"];
  if (writeOps.some((op) => normalized.startsWith(op))) {
    res.status(403).json({ error: "Only read-only queries are allowed" });
    return;
  }

  const db = new Database(DB_PATH, { readonly: true });
  try {
    const stmt = db.prepare(sql);
    const rows = stmt.all();
    const columns = stmt.columns().map((c) => c.name);
    res.json({ columns, rows, rowCount: rows.length });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  } finally {
    db.close();
  }
});

export default router;
