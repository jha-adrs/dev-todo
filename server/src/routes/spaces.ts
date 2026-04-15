import { Router, Response } from "express";
import { db } from "../db/index.js";
import { spaces, todos } from "../db/schema.js";
import { asc, eq, sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// List all spaces with todo counts
router.get("/", (_req: AuthRequest, res: Response) => {
  const rows = db
    .select({
      id: spaces.id,
      name: spaces.name,
      color: spaces.color,
      icon: spaces.icon,
      sortOrder: spaces.sortOrder,
      createdAt: spaces.createdAt,
      todoCount: sql<number>`(SELECT COUNT(*) FROM todos WHERE todos.space_id = ${spaces.id})`,
    })
    .from(spaces)
    .orderBy(asc(spaces.sortOrder), asc(spaces.createdAt))
    .all();
  res.json(rows);
});

// Create space
router.post("/", (req: AuthRequest, res: Response) => {
  const { name, color, icon } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Name required" });
    return;
  }
  if (name.length > 50) {
    res.status(400).json({ error: "Name must be 50 chars or less" });
    return;
  }
  if (!color || typeof color !== "string") {
    res.status(400).json({ error: "Color required" });
    return;
  }

  // Next sort order
  const maxRow = db
    .select({ max: sql<number>`COALESCE(MAX(${spaces.sortOrder}), -1)` })
    .from(spaces)
    .get();
  const sortOrder = (maxRow?.max ?? -1) + 1;

  try {
    const space = db
      .insert(spaces)
      .values({
        name: name.trim(),
        color,
        icon: icon || null,
        sortOrder,
      })
      .returning()
      .get();
    res.status(201).json(space);
  } catch {
    res.status(409).json({ error: "Space name already exists" });
  }
});

// Update space
router.patch("/:id", (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const { name, color, icon, sortOrder } = req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (color !== undefined) updates.color = color;
  if (icon !== undefined) updates.icon = icon;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  try {
    const updated = db
      .update(spaces)
      .set(updates)
      .where(eq(spaces.id, id))
      .returning()
      .get();
    if (!updated) {
      res.status(404).json({ error: "Space not found" });
      return;
    }
    res.json(updated);
  } catch {
    res.status(409).json({ error: "Space name already exists" });
  }
});

// Delete space
router.delete("/:id", (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);

  // Prevent deleting last space
  const count = db.select({ c: sql<number>`count(*)` }).from(spaces).get();
  if ((count?.c ?? 0) <= 1) {
    res.status(400).json({ error: "Cannot delete the last remaining space" });
    return;
  }

  const deleted = db.delete(spaces).where(eq(spaces.id, id)).returning().get();
  if (!deleted) {
    res.status(404).json({ error: "Space not found" });
    return;
  }
  res.status(204).send();
});

// Batch reorder
router.post("/reorder", (req: AuthRequest, res: Response) => {
  const { items } = req.body as { items: Array<{ id: number; sortOrder: number }> };
  if (!Array.isArray(items)) {
    res.status(400).json({ error: "items array required" });
    return;
  }
  for (const item of items) {
    db.update(spaces)
      .set({ sortOrder: item.sortOrder })
      .where(eq(spaces.id, item.id))
      .run();
  }
  res.json({ ok: true });
});

export default router;
