import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "./lib/logger.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { authLimiter } from "./middleware/rateLimiter.js";
import { runMigrations } from "./db/migrate.js";
import { generateRecurringTodos } from "./lib/recurring.js";
import authRouter from "./routes/auth.js";
import todosRouter from "./routes/todos.js";
import uploadRouter from "./routes/upload.js";
import explorerRouter from "./routes/explorer.js";
import settingsRouter from "./routes/settings.js";
import tagsRouter from "./routes/tags.js";
import recurringRouter from "./routes/recurring.js";
import spacesRouter from "./routes/spaces.js";
import notesRouter from "./routes/notes.js";

dotenv.config();

// Run migrations on startup
runMigrations();

// Generate recurring todos
generateRecurringTodos();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

// ─── Middleware (order matters) ──────────────────────────────────────

// 1. Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// 2. CORS with configurable origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.trim();
app.use(cors({
  origin: (!allowedOrigins || allowedOrigins === "*")
    ? true
    : allowedOrigins.split(",").map((s) => s.trim()),
  credentials: true,
}));

// 3. Body parsing + cookies
app.use(express.json());
app.use(cookieParser());

// 4. Request logging (skips /api/health)
app.use(requestLogger);

// ─── Routes ─────────────────────────────────────────────────────────

// Health check (no auth, not rate-limited)
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Static file serving for uploads
app.use("/uploads", express.static(path.resolve(PROJECT_ROOT, "uploads")));

// Auth routes (rate-limited)
app.use("/api/auth", authLimiter, authRouter);

// Protected routes
app.use("/api/todos", todosRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/explorer", explorerRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/tags", tagsRouter);
app.use("/api/recurring", recurringRouter);
app.use("/api/spaces", spacesRouter);
app.use("/api/notes", notesRouter);

// Serve client build in production
const clientDist = path.resolve(PROJECT_ROOT, "client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ─── Start server ───────────────────────────────────────────────────

const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info("server running", { port: PORT, host: "0.0.0.0" });
});

// ─── Graceful shutdown ──────────────────────────────────────────────

function shutdown(signal: string) {
  logger.info("shutting down", { signal });
  server.close(() => {
    logger.info("server closed");
    process.exit(0);
  });
  setTimeout(() => {
    logger.error("forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
