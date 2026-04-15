import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { todos, images, users, spaces, tags, recurringTemplates } from "../db/schema.js";
import { and, eq, sql } from "drizzle-orm";

const router = Router();
router.use(requireAuth);

// Export ALL data across all spaces
router.get("/backup", (_req: AuthRequest, res: Response) => {
  const backup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      spaces: db.select().from(spaces).all(),
      todos: db.select().from(todos).all(),
      tags: db.select().from(tags).all(),
      recurring: db.select().from(recurringTemplates).all(),
      images: db.select().from(images).all(),
    },
  };

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=devtodo-backup-${new Date().toISOString().split("T")[0]}.json`,
  );
  res.setHeader("Content-Type", "application/json");
  res.json(backup);
});

// Reset all todos in all spaces
router.post("/reset/todos", (_req: AuthRequest, res: Response) => {
  db.delete(todos).run();
  db.delete(images).run();
  res.json({ ok: true, message: "All todos and images deleted" });
});

// Full factory reset
router.post("/reset/all", (_req: AuthRequest, res: Response) => {
  db.delete(todos).run();
  db.delete(images).run();
  db.delete(tags).run();
  db.delete(recurringTemplates).run();
  db.delete(spaces).run();
  db.delete(users).run();
  res.clearCookie("token", { path: "/" });
  res.json({ ok: true, message: "All data deleted. You will be logged out." });
});

// Stats — optionally filtered by space query param
router.get("/stats", (req: AuthRequest, res: Response) => {
  const spaceParam = req.query.space as string | undefined;
  const spaceId = spaceParam ? parseInt(spaceParam, 10) : null;

  const where = spaceId ? eq(todos.spaceId, spaceId) : sql`1=1`;

  const todoCount = db.select({ count: sql<number>`count(*)` }).from(todos).where(where).get();
  const completedCount = db
    .select({ count: sql<number>`count(*)` })
    .from(todos)
    .where(and(where, sql`${todos.status} = 'completed'`))
    .get();
  const imageCount = db.select({ count: sql<number>`count(*)` }).from(images).get();
  const spaceCount = db.select({ count: sql<number>`count(*)` }).from(spaces).get();

  res.json({
    totalTodos: todoCount?.count || 0,
    completedTodos: completedCount?.count || 0,
    totalImages: imageCount?.count || 0,
    totalSpaces: spaceCount?.count || 0,
  });
});

export default router;
