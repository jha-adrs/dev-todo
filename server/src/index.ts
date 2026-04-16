import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { runMigrations } from "./db/migrate.js";
import authRouter from "./routes/auth.js";
import todosRouter from "./routes/todos.js";
import uploadRouter from "./routes/upload.js";
import explorerRouter from "./routes/explorer.js";
import settingsRouter from "./routes/settings.js";
import tagsRouter from "./routes/tags.js";
import recurringRouter from "./routes/recurring.js";
import spacesRouter from "./routes/spaces.js";
import notesRouter from "./routes/notes.js";
import { generateRecurringTodos } from "./lib/recurring.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

// Run migrations on startup
runMigrations();

// Generate recurring todos
generateRecurringTodos();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Static file serving for uploads
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");
app.use("/uploads", express.static(path.resolve(PROJECT_ROOT, "uploads")));

app.use("/api/auth", authRouter);
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
import fs from "node:fs";
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA catch-all: serve index.html for non-API routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`[devtodo] server running on http://localhost:${PORT}`);
});
