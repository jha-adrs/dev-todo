import { Router, Response } from "express";
import { db } from "../db/index.js";
import { tags, todoTags, todos } from "../db/schema.js";
import { and, eq, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { requireSpace, SpaceRequest } from "../middleware/space.js";

const router = Router();
router.use(requireAuth);
router.use(requireSpace);

const TAG_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#d946ef", "#6b7280", "#78716c",
];

// List all tags in current space with usage count
router.get("/", (req: SpaceRequest, res: Response) => {
  const allTags = db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      createdAt: tags.createdAt,
      usageCount: sql<number>`(SELECT COUNT(*) FROM todo_tags WHERE tag_id = ${tags.id})`,
    })
    .from(tags)
    .where(eq(tags.spaceId, req.spaceId!))
    .orderBy(tags.name)
    .all();

  res.json(allTags);
});

// Create tag in current space
router.post("/", (req: SpaceRequest, res: Response) => {
  const { name, color } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Tag name required" });
    return;
  }
  if (name.length > 30) {
    res.status(400).json({ error: "Tag name must be 30 chars or less" });
    return;
  }

  // Check name unique within space
  const exists = db
    .select()
    .from(tags)
    .where(and(eq(tags.spaceId, req.spaceId!), eq(tags.name, name.trim())))
    .get();
  if (exists) {
    res.status(409).json({ error: "Tag already exists in this space" });
    return;
  }

  const tagColor =
    color || TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];

  const tag = db
    .insert(tags)
    .values({
      spaceId: req.spaceId!,
      name: name.trim(),
      color: tagColor,
    })
    .returning()
    .get();
  res.status(201).json(tag);
});

// Update tag
router.patch("/:id", (req: SpaceRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const { name, color } = req.body;

  const existing = db
    .select()
    .from(tags)
    .where(and(eq(tags.id, id), eq(tags.spaceId, req.spaceId!)))
    .get();
  if (!existing) {
    res.status(404).json({ error: "Tag not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (color !== undefined) updates.color = color;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const updated = db.update(tags).set(updates).where(eq(tags.id, id)).returning().get();
  res.json(updated);
});

// Delete tag
router.delete("/:id", (req: SpaceRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const existing = db
    .select()
    .from(tags)
    .where(and(eq(tags.id, id), eq(tags.spaceId, req.spaceId!)))
    .get();
  if (!existing) {
    res.status(404).json({ error: "Tag not found" });
    return;
  }
  db.delete(tags).where(eq(tags.id, id)).run();
  res.status(204).send();
});

// Set tags for a todo
router.post("/todo/:todoId", (req: SpaceRequest, res: Response) => {
  const todoId = parseInt(req.params.todoId as string, 10);
  const { tagIds } = req.body as { tagIds: number[] };

  if (!Array.isArray(tagIds)) {
    res.status(400).json({ error: "tagIds must be an array" });
    return;
  }

  // Verify todo belongs to current space
  const todo = db
    .select()
    .from(todos)
    .where(and(eq(todos.id, todoId), eq(todos.spaceId, req.spaceId!)))
    .get();
  if (!todo) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }

  db.delete(todoTags).where(eq(todoTags.todoId, todoId)).run();

  for (const tagId of tagIds) {
    // Verify tag belongs to current space
    const tag = db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.spaceId, req.spaceId!)))
      .get();
    if (tag) {
      db.insert(todoTags).values({ todoId, tagId }).run();
    }
  }

  const result = db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(todoTags)
    .innerJoin(tags, eq(todoTags.tagId, tags.id))
    .where(eq(todoTags.todoId, todoId))
    .all();

  res.json(result);
});

export default router;
