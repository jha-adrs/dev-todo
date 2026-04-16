import { Router, Response } from "express";
import { db } from "../db/index.js";
import { notes } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { requireSpace, SpaceRequest } from "../middleware/space.js";

const router = Router();
router.use(requireAuth);
router.use(requireSpace);

// List notes for current space
router.get("/", (req: SpaceRequest, res: Response) => {
  const showArchived = req.query.archived === "1";

  const rows = db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.spaceId, req.spaceId!),
        showArchived ? undefined : eq(notes.archived, 0),
      ),
    )
    .orderBy(desc(notes.pinned), desc(notes.updatedAt))
    .all();

  res.json(rows);
});

// Create note
router.post("/", (req: SpaceRequest, res: Response) => {
  const { title, content } = req.body || {};

  const note = db
    .insert(notes)
    .values({
      spaceId: req.spaceId!,
      title: title || "",
      content: content || null,
    })
    .returning()
    .get();

  res.json(note);
});

// Update note
router.patch("/:id", (req: SpaceRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const { title, content, pinned, archived } = req.body || {};

  const existing = db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.spaceId, req.spaceId!)))
    .get();

  if (!existing) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  const fields: Record<string, unknown> = { updatedAt: new Date().toISOString().replace("T", " ").split(".")[0] };
  if (title !== undefined) fields.title = title;
  if (content !== undefined) fields.content = content;
  if (pinned !== undefined) fields.pinned = pinned;
  if (archived !== undefined) fields.archived = archived;

  const updated = db
    .update(notes)
    .set(fields)
    .where(eq(notes.id, id))
    .returning()
    .get();

  res.json(updated);
});

// Delete note
router.delete("/:id", (req: SpaceRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);

  const existing = db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.spaceId, req.spaceId!)))
    .get();

  if (!existing) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  db.delete(notes).where(eq(notes.id, id)).run();
  res.json({ ok: true });
});

export default router;
