import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === "changeme-generate-a-real-secret" || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "\n[devtodo] FATAL: JWT_SECRET is missing or too weak.\n" +
          "Generate a secure secret with: openssl rand -hex 32\n" +
          "Set it in your .env file or environment.\n",
      );
      process.exit(1);
    }
    // Development: warn but generate a random one for this session
    const random = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, "0"),
    ).join("");
    console.warn(
      "[devtodo] WARNING: JWT_SECRET not set. Using ephemeral random secret (sessions won't survive restart).\n" +
        "         Set JWT_SECRET in .env for persistent auth.",
    );
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
