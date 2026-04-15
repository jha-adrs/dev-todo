import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { generateToken, requireAuth, JWT_SECRET, AuthRequest } from "../middleware/auth.js";

const router = Router();
const SALT_ROUNDS = 12;
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

// Check if setup is needed + auth status
router.get("/status", (req: Request, res: Response) => {
  const existingUsers = db.select().from(users).all();
  const needsSetup = existingUsers.length === 0;

  let authenticated = false;
  const token = req.cookies?.token;
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
      authenticated = true;
    } catch {
      // Invalid token
    }
  }

  res.json({ needsSetup, authenticated });
});

// First-run setup — create password
router.post("/setup", async (req: Request, res: Response) => {
  const existingUsers = db.select().from(users).all();
  if (existingUsers.length > 0) {
    res.status(400).json({ error: "Already configured" });
    return;
  }

  const { password } = req.body;
  if (!password || typeof password !== "string" || password.length < 4) {
    res.status(400).json({ error: "Password must be at least 4 characters" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = db.insert(users).values({ passwordHash }).returning().get();

  const token = generateToken(result.id);
  res.cookie("token", token, COOKIE_OPTIONS);
  res.json({ ok: true });
});

// Login
router.post("/login", async (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password || typeof password !== "string") {
    res.status(400).json({ error: "Password required" });
    return;
  }

  const user = db.select().from(users).get();
  if (!user) {
    res.status(400).json({ error: "No account exists. Run setup first." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }

  const token = generateToken(user.id);
  res.cookie("token", token, COOKIE_OPTIONS);
  res.json({ ok: true });
});

// Logout
router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("token", { path: "/" });
  res.json({ ok: true });
});

// Check auth
router.get("/me", requireAuth, (_req: AuthRequest, res: Response) => {
  res.json({ authenticated: true });
});

export default router;
