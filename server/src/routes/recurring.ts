import { Router, Response } from "express";
import { db } from "../db/index.js";
import { recurringTemplates } from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { requireSpace, SpaceRequest } from "../middleware/space.js";
import { generateRecurringTodos } from "../lib/recurring.js";

const router = Router();
router.use(requireAuth);
router.use(requireSpace);

router.get("/", (req: SpaceRequest, res: Response) => {
  const templates = db
    .select()
    .from(recurringTemplates)
    .where(eq(recurringTemplates.spaceId, req.spaceId!))
    .orderBy(recurringTemplates.createdAt)
    .all();
  res.json(templates);
});

router.post("/", (req: SpaceRequest, res: Response) => {
  const { title, description, priority, tagIds, schedule, scheduleLabel, enabled } =
    req.body;

  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "Title required" });
    return;
  }
  if (!schedule || typeof schedule !== "string") {
    res.status(400).json({ error: "Schedule (cron) required" });
    return;
  }

  const template = db
    .insert(recurringTemplates)
    .values({
      spaceId: req.spaceId!,
      title: title.trim(),
      description: description || null,
      priority: priority || "medium",
      tagIds: JSON.stringify(tagIds || []),
      schedule,
      scheduleLabel: scheduleLabel || schedule,
      enabled: enabled !== undefined ? (enabled ? 1 : 0) : 1,
    })
    .returning()
    .get();

  res.status(201).json(template);
});

router.patch("/:id", (req: SpaceRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const existing = db
    .select()
    .from(recurringTemplates)
    .where(and(eq(recurringTemplates.id, id), eq(recurringTemplates.spaceId, req.spaceId!)))
    .get();
  if (!existing) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  const { title, description, priority, tagIds, schedule, scheduleLabel, enabled } =
    req.body;

  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description;
  if (priority !== undefined) updates.priority = priority;
  if (tagIds !== undefined) updates.tagIds = JSON.stringify(tagIds);
  if (schedule !== undefined) updates.schedule = schedule;
  if (scheduleLabel !== undefined) updates.scheduleLabel = scheduleLabel;
  if (enabled !== undefined) updates.enabled = enabled ? 1 : 0;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const updated = db
    .update(recurringTemplates)
    .set(updates)
    .where(eq(recurringTemplates.id, id))
    .returning()
    .get();
  res.json(updated);
});

router.delete("/:id", (req: SpaceRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const existing = db
    .select()
    .from(recurringTemplates)
    .where(and(eq(recurringTemplates.id, id), eq(recurringTemplates.spaceId, req.spaceId!)))
    .get();
  if (!existing) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  db.delete(recurringTemplates).where(eq(recurringTemplates.id, id)).run();
  res.status(204).send();
});

router.post("/:id/generate", (_req: SpaceRequest, res: Response) => {
  generateRecurringTodos();
  res.json({ ok: true });
});

export default router;
