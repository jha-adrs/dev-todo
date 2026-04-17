import { Router, Response } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "node:path";
import { db } from "../db/index.js";
import { images } from "../db/schema.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { createStorageProvider } from "../storage/index.js";
import { logger } from "../lib/logger.js";

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  // Accept all file types
});

const storageProviderPromise = createStorageProvider();

router.post("/", upload.single("file"), async (req: AuthRequest, res: Response) => {
  const storageProvider = await storageProviderPromise;
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  const ext = path.extname(file.originalname) || "";
  const filename = `${uuidv4()}${ext}`;
  const isImage = file.mimetype.startsWith("image/");

  try {
    const url = await storageProvider.upload(file.buffer, filename, file.mimetype);

    db.insert(images)
      .values({
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      })
      .run();

    res.json({
      url,
      isImage,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    });
  } catch (err) {
    logger.error("upload failed", { error: (err as Error).message });
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
