import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger.js";

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === "changeme-generate-a-real-secret" || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      logger.error("FATAL: JWT_SECRET is missing or too weak. Generate with: openssl rand -hex 32");
      process.exit(1);
    }
    // Development: warn but generate a random one for this session
    const random = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, "0"),
    ).join("");
    logger.warn("JWT_SECRET not set, using ephemeral random secret (sessions won't survive restart)");
    return random;
  }
  return secret;
})();

export interface AuthRequest extends Request {
  userId?: number;
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

export { JWT_SECRET };
