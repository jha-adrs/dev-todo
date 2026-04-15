import { Response, NextFunction } from "express";
import { db } from "../db/index.js";
import { spaces } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { AuthRequest } from "./auth.js";

export interface SpaceRequest extends AuthRequest {
  spaceId?: number;
}

export function requireSpace(
  req: SpaceRequest,
  res: Response,
  next: NextFunction,
): void {
  const headerVal = req.headers["x-space-id"];
  const queryVal = req.query.space as string | undefined;
  const raw = Array.isArray(headerVal) ? headerVal[0] : headerVal || queryVal;

  if (!raw) {
    res.status(400).json({ error: "Missing X-Space-Id header" });
    return;
  }

  const spaceId = parseInt(raw, 10);
  if (isNaN(spaceId)) {
    res.status(400).json({ error: "Invalid space ID" });
    return;
  }

  const space = db.select().from(spaces).where(eq(spaces.id, spaceId)).get();
  if (!space) {
    res.status(400).json({ error: "Space not found" });
    return;
  }

  req.spaceId = spaceId;
  next();
}
