export interface StorageProvider {
  upload(file: Buffer, filename: string, mimeType: string): Promise<string>;
}

export async function createStorageProvider(): Promise<StorageProvider> {
  const provider = process.env.STORAGE_PROVIDER || "local";

  if (provider === "s3") {
    const { S3Storage } = await import("./s3.js");
    return new S3Storage();
  }

  const { LocalStorage } = await import("./local.js");
  return new LocalStorage();
}
