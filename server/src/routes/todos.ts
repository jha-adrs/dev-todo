import { Router, Response } from "express";
import { db } from "../db/index.js";
import { todos } from "../db/schema.js";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { requireSpace, SpaceRequest } from "../middleware/space.js";
import { getTodosForDate, todayDateStr } from "../lib/backlog.js";

const router = Router();
router.use(requireAuth);
router.use(requireSpace);

// Get todos for a date (defaults to today)
router.get("/", (req: SpaceRequest, res: Response) => {
  const date = (req.query.date as string) || undefined;
  const result = getTodosForDate(req.spaceId!, date);
  res.json(result);
});

// Calendar heat map: get completion stats per day for a month
router.get("/calendar", (req: SpaceRequest, res: Response) => {
  const month = req.query.month as string;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "month param required in YYYY-MM format" });
    return;
  }

  const startDate = `${month}-01`;
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

  const rows = db
    .select({
      dueDate: todos.dueDate,
      total: sql<number>`count(*)`,
      completed: sql<number>`sum(case when ${todos.status} = 'completed' then 1 else 0 end)`,
    })
    .from(todos)
    .where(
      and(
        eq(todos.spaceId, req.spaceId!),
        gte(todos.dueDate, startDate),
        lte(todos.dueDate, endDate),
      ),
    )
    .groupBy(todos.dueDate)
    .all();

  const calendar: Record<string, { total: number; completed: number }> = {};
  for (const row of rows) {
    calendar[row.dueDate] = { total: row.total, completed: row.completed };
  }

  res.json(calendar);
});

// Create todo
router.post("/", (req: SpaceRequest, res: Response) => {
  const { title, description, status, priority, dueDate } = req.body;

  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  if (title.length > 200) {
    res.status(400).json({ error: "Title must be 200 characters or less" });
    return;
  }

  const validStatuses = ["pending", "in_progress", "completed"];
  const todoStatus = status && validStatuses.includes(status) ? status : "pending";
  const validPriorities = ["highest", "high", "medium", "low", "lowest"];
  const todoPriority =
    priority && validPriorities.includes(priority) ? priority : "medium";

  const todo = db
    .insert(todos)
    .values({
      spaceId: req.spaceId!,
      title: title.trim(),
      description: description || null,
      status: todoStatus,
      priority: todoPriority,
      dueDate: dueDate || todayDateStr(),
    })
    .returning()
    .get();

  res.status(201).json(todo);
});

// Update todo
router.patch("/:id", (req: SpaceRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const existing = db
    .select()
    .from(todos)
    .where(and(eq(todos.id, id), eq(todos.spaceId, req.spaceId!)))
    .get();
  if (!existing) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  const { title, description, status, priority, dueDate, pinned, snoozedUntil } =
    req.body;

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      res.status(400).json({ error: "Title cannot be empty" });
      return;
    }
    if (title.length > 200) {
      res.status(400).json({ error: "Title must be 200 characters or less" });
      return;
    }
    updates.title = title.trim();
  }
  if (description !== undefined) updates.description = description;

  if (status !== undefined) {
    const validStatuses = ["pending", "in_progress", "completed"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    updates.status = status;
    if (status === "completed" && existing.status !== "completed") {
      updates.completedAt = new Date().toISOString();
    } else if (status !== "completed" && existing.status === "completed") {
      updates.completedAt = null;
    }
  }

  if (priority !== undefined) {
    const validPriorities = ["highest", "high", "medium", "low", "lowest"];
    if (!validPriorities.includes(priority)) {
      res.status(400).json({ error: "Invalid priority" });
      return;
    }
    updates.priority = priority;
  }

  if (dueDate !== undefined) updates.dueDate = dueDate;
  if (pinned !== undefined) updates.pinned = pinned ? 1 : 0;
  if (snoozedUntil !== undefined) updates.snoozedUntil = snoozedUntil;

  if (Object.keys(updates).length === 0) {
    res.json(existing);
    return;
  }

  const updated = db
    .update(todos)
    .set(updates)
    .where(eq(todos.id, id))
    .returning()
    .get();

  res.json(updated);
});

// Delete todo
router.delete("/:id", (req: SpaceRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const existing = db
    .select()
    .from(todos)
    .where(and(eq(todos.id, id), eq(todos.spaceId, req.spaceId!)))
    .get();
  if (!existing) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }
  db.delete(todos).where(eq(todos.id, id)).run();
  res.status(204).send();
});

// Batch reorder
router.post("/reorder", (req: SpaceRequest, res: Response) => {
  const { items } = req.body as { items: Array<{ id: number; sortOrder: number }> };
  if (!Array.isArray(items)) {
    res.status(400).json({ error: "items array required" });
    return;
  }
  for (const item of items) {
    db.update(todos)
      .set({ sortOrder: item.sortOrder })
      .where(and(eq(todos.id, item.id), eq(todos.spaceId, req.spaceId!)))
      .run();
  }
  res.json({ ok: true });
});

export default router;
