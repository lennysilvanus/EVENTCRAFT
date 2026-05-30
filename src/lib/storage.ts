import { writeFile, mkdir } from "fs/promises";
import { createHash, createHmac, randomBytes } from "crypto";
import path from "path";

export interface UploadResult {
  url: string;
}

// Warn once at startup when running in production without S3.
// Local-disk uploads are lost if the container is recreated without a volume.
if (process.env.NODE_ENV === "production" && !isS3Configured()) {
  console.warn(
    "[storage] WARNING: S3 is not configured. Uploads are stored on the local " +
    "container disk and will be LOST on container restart unless a persistent " +
    "volume is mounted at /app/public/uploads. " +
    "Set STORAGE_S3_BUCKET, STORAGE_S3_ACCESS_KEY_ID, STORAGE_S3_SECRET_ACCESS_KEY " +
    "to enable durable object storage."
  );
}

// ─── Filename generation ─────────────────────────────────────────────────────

/**
 * Returns a cryptographically random filename with the given extension.
 * Using random bytes prevents filename enumeration even when the upload
 * directory is publicly accessible.
 */
export function randomFilename(ext: string): string {
  return `${randomBytes(16).toString("hex")}${ext.startsWith(".") ? ext : "." + ext}`;
}

// ─── Local disk (fallback) ───────────────────────────────────────────────────

async function uploadLocal(
  buffer: Buffer,
  filename: string,
  subfolder: string
): Promise<UploadResult> {
  const uploadDir = path.join(process.cwd(), "public", "uploads", subfolder);
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);
  return { url: `/uploads/${subfolder}/${filename}` };
}

// ─── S3-compatible (AWS S3, Cloudflare R2, MinIO) ───────────────────────────
// No SDK dependency — uses Fetch API with AWS Signature V4.
// Set these env vars to enable:
//   STORAGE_S3_BUCKET, STORAGE_S3_REGION, STORAGE_S3_ENDPOINT (optional for R2),
//   STORAGE_S3_ACCESS_KEY_ID, STORAGE_S3_SECRET_ACCESS_KEY, STORAGE_S3_PUBLIC_URL

function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

async function uploadS3(
  buffer: Buffer,
  filename: string,
  subfolder: string,
  contentType: string
): Promise<UploadResult> {
  const bucket    = process.env.STORAGE_S3_BUCKET!;
  const region    = process.env.STORAGE_S3_REGION ?? "auto";
  const accessKey = process.env.STORAGE_S3_ACCESS_KEY_ID!;
  const secretKey = process.env.STORAGE_S3_SECRET_ACCESS_KEY!;
  const publicUrl = process.env.STORAGE_S3_PUBLIC_URL;

  const baseEndpoint = process.env.STORAGE_S3_ENDPOINT
    ?? `https://s3.${region}.amazonaws.com`;
  const host = new URL(baseEndpoint).host;

  const key = `${subfolder}/${filename}`;
  const url = `${baseEndpoint}/${bucket}/${key}`;

  const now     = new Date();
  const dateStr = now.toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
  const short   = dateStr.slice(0, 8);
  const payHash = sha256Hex(buffer);

  const headers: Record<string, string> = {
    host,
    "content-type":         contentType,
    "x-amz-content-sha256": payHash,
    "x-amz-date":           dateStr,
  };

  const sorted        = Object.entries(headers).sort(([a], [b]) => a.localeCompare(b));
  const signedHeaders = sorted.map(([k]) => k).join(";");
  const canonicalHdrs = sorted.map(([k, v]) => `${k}:${v}\n`).join("");

  const canonical = ["PUT", `/${bucket}/${key}`, "", canonicalHdrs, signedHeaders, payHash].join("\n");
  const scope     = `${short}/${region}/s3/aws4_request`;
  const toSign    = ["AWS4-HMAC-SHA256", dateStr, scope, sha256Hex(Buffer.from(canonical))].join("\n");

  const sigKey = hmac256(hmac256(hmac256(hmac256(`AWS4${secretKey}`, short), region), "s3"), "aws4_request");
  const sig    = hmac256(sigKey, toSign).toString("hex");

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${sig}`,
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`S3 upload failed (${res.status}): ${msg}`);
  }

  return { url: publicUrl ? `${publicUrl}/${key}` : url };
}

// ─── Auto-selecting entry point ──────────────────────────────────────────────

function isS3Configured(): boolean {
  return !!(
    process.env.STORAGE_S3_BUCKET &&
    process.env.STORAGE_S3_ACCESS_KEY_ID &&
    process.env.STORAGE_S3_SECRET_ACCESS_KEY
  );
}

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  subfolder: string,
  contentType: string
): Promise<UploadResult> {
  if (isS3Configured()) {
    return uploadS3(buffer, filename, subfolder, contentType);
  }
  return uploadLocal(buffer, filename, subfolder);
}
