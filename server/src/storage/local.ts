import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StorageProvider } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const UPLOADS_DIR = process.env.UPLOADS_PATH
  ? path.resolve(process.env.UPLOADS_PATH)
  : path.resolve(PROJECT_ROOT, "uploads");

export class LocalStorage implements StorageProvider {
  constructor() {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  async upload(file: Buffer, filename: string, _mimeType: string): Promise<string> {
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, file);
    return `/uploads/${filename}`;
  }
}
