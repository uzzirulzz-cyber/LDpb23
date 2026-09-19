// S3-compatible object storage helper for Playbeat.digital.
// Uses Neon Storage (S3-compatible). Server-side only — credentials live in env.
//
// Usage:
//   import { uploadFile, getPublicUrl } from "@/lib/storage";
//   const url = await uploadFile(buffer, "image.png", "image/png");

export interface StorageConfig {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
}

export function getStorageConfig(): StorageConfig | null {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION ?? "us-east-2";
  const bucket = process.env.S3_BUCKET ?? "uploads";

  // Honest: if credentials are placeholders or missing, return null.
  if (!endpoint || !accessKeyId || !secretAccessKey ||
      accessKeyId === "<generate-key>" || secretAccessKey === "<generate-key>") {
    return null;
  }
  return { endpoint, accessKeyId, secretAccessKey, region, bucket };
}

export function isStorageConfigured(): boolean {
  return getStorageConfig() !== null;
}

/**
 * Upload a file to S3-compatible storage.
 * Returns the public URL of the uploaded object, or null if storage is not configured.
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType: string,
  keyPrefix = "products"
): Promise<string | null> {
  const config = getStorageConfig();
  if (!config) {
    console.warn("[storage] S3 not configured — skipping upload. Set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in .env");
    return null;
  }

  // S3-compatible PUT request using fetch (no AWS SDK needed for simple uploads).
  const key = `${keyPrefix}/${Date.now()}-${filename}`;
  const url = `${config.endpoint}/${config.bucket}/${key}`;

  // AWS Signature V4 is complex — for Neon Storage with path-style requests,
  // we can use a simpler approach if the storage supports presigned URLs or public access.
  // For now, we return the object URL (Neon Storage supports public bucket access).
  // In production, use @aws-sdk/client-s3 for proper signed requests.
  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        // Note: proper AWS SigV4 signing requires the AWS SDK.
        // This is a placeholder — install @aws-sdk/client-s3 for production use.
      },
      body: buffer,
    });

    if (!response.ok) {
      console.error("[storage] Upload failed:", response.status, await response.text());
      return null;
    }

    return url;
  } catch (err) {
    console.error("[storage] Upload error:", err);
    return null;
  }
}

/**
 * Get the public URL for an object in the bucket.
 */
export function getPublicUrl(key: string): string {
  const config = getStorageConfig();
  if (!config) return "";
  return `${config.endpoint}/${config.bucket}/${key}`;
}
