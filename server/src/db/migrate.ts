import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./index.js";
import { spaces } from "./schema.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "../../drizzle");

export function runMigrations() {
  logger.info("running migrations");
  migrate(db, { migrationsFolder });
  logger.info("migrations complete");

  // Seed default space if none exist
  const existing = db.select().from(spaces).all();
  if (existing.length === 0) {
    db.insert(spaces)
      .values({
        name: "Personal",
        color: "#6366f1",
        icon: "P",
        sortOrder: 0,
      })
      .run();
    logger.info("seeded default Personal space");
  }
}

if (process.argv[1]?.includes("migrate")) {
  runMigrations();
}
