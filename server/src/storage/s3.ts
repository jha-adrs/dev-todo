import type { StorageProvider } from "./index.js";

// S3/R2 compatible storage provider
// Requires @aws-sdk/client-s3 to be installed:
//   npm install @aws-sdk/client-s3
export class S3Storage implements StorageProvider {
  private bucket: string;
  private client: any;

  constructor() {
    this.bucket = process.env.S3_BUCKET || "";
    if (!this.bucket) {
      throw new Error("S3_BUCKET environment variable is required for S3 storage");
    }

    // Dynamic import to avoid bundling aws-sdk when not needed
    const { S3Client } = require("@aws-sdk/client-s3");
    this.client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      },
    });
  }

  async upload(file: Buffer, filename: string, mimeType: string): Promise<string> {
    const { PutObjectCommand } = require("@aws-sdk/client-s3");
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: filename,
        Body: file,
        ContentType: mimeType,
      }),
    );

    // If custom endpoint (R2), construct URL
    if (process.env.S3_ENDPOINT) {
      return `${process.env.S3_ENDPOINT}/${this.bucket}/${filename}`;
    }
    return `https://${this.bucket}.s3.${process.env.S3_REGION}.amazonaws.com/${filename}`;
  }
}
