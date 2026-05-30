import { NextResponse } from "next/server";
import { getAuthUserFromCookies } from "@/lib/auth";
import { isRateLimited } from "@/lib/rate-limit";
import { uploadFile, randomFilename } from "@/lib/storage";

// ─── Allowed MIME types ──────────────────────────────────────────────────────
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"] as const;
const IMAGE_MAX   = 5 * 1024 * 1024;    // 5 MB
const VIDEO_MAX   = 200 * 1024 * 1024;  // 200 MB

export const maxDuration = 60;

// ─── Magic byte signatures ───────────────────────────────────────────────────
const SIGNATURES: Record<string, { match: (b: Buffer) => boolean; ext: string }> = {
  "image/jpeg": {
    ext: "jpg",
    match: (b) => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF,
  },
  "image/png": {
    ext: "png",
    match: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 &&
      b[4] === 0x0D && b[5] === 0x0A && b[6] === 0x1A && b[7] === 0x0A,
  },
  "image/webp": {
    ext: "webp",
    match: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  "image/gif": {
    ext: "gif",
    match: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
  },
  "video/mp4": {
    ext: "mp4",
    match: (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70,
  },
  "video/quicktime": {
    ext: "mov",
    match: (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70,
  },
  "video/webm": {
    ext: "webm",
    match: (b) => b[0] === 0x1A && b[1] === 0x45 && b[2] === 0xDF && b[3] === 0xA3,
  },
  "video/x-msvideo": {
    ext: "avi",
    match: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x41 && b[9] === 0x56 && b[10] === 0x49 && b[11] === 0x20,
  },
};

const MIN_BYTES = 12;

export async function POST(request: Request) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limit: 30 uploads per hour per user
    if (await isRateLimited(`upload:${user.userId}`, 30, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Upload limit reached. Try again later." }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const isImage = (IMAGE_TYPES as readonly string[]).includes(file.type);
    const isVideo = (VIDEO_TYPES as readonly string[]).includes(file.type);
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Allowed types: JPEG, PNG, WebP, GIF (images) or MP4, WebM, MOV (videos)" },
        { status: 400 }
      );
    }

    const maxSize = isVideo ? VIDEO_MAX : IMAGE_MAX;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: isVideo ? "Video must be under 200 MB" : "Image must be under 5 MB" },
        { status: 400 }
      );
    }

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.length < MIN_BYTES) {
      return NextResponse.json({ error: "File is too small to be valid" }, { status: 400 });
    }

    // Magic byte validation — prevents content-type spoofing
    const sig = SIGNATURES[file.type];
    if (!sig || !sig.match(buffer)) {
      return NextResponse.json(
        { error: "File content does not match the declared type. Upload rejected." },
        { status: 400 }
      );
    }

    const ext      = sig.ext;
    const filename = randomFilename(ext);
    const subfolder = isVideo ? "videos" : "images";

    // Storage abstraction — uses S3 when configured, local disk otherwise
    const { url } = await uploadFile(buffer, filename, subfolder, file.type);

    return NextResponse.json(
      { data: { url, type: isVideo ? "video" : "image" } },
      { headers: { "X-Content-Type-Options": "nosniff" } }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
