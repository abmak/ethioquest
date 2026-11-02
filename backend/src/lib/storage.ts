import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { env } from "../config/env";
import { logger } from "./logger";

export const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);

export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(uploadDir, { recursive: true });
}

/** URLs are stored relative so the app can move between hosts unchanged. */
export function mediaUrl(filename: string): string {
  return `/uploads/${filename}`;
}

/**
 * Writes a resized, compressed copy and returns its URL. The original upload
 * is kept as the full-size photo; the copy keeps feeds fast on mobile data.
 */
export async function processImage(
  file: Express.Multer.File,
): Promise<{ thumbnailUrl: string | null; width: number | null; height: number | null }> {
  try {
    const metadata = await sharp(file.path).metadata();
    const name = `${path.parse(file.filename).name}-thumb.webp`;
    await sharp(file.path)
      .rotate()
      .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(uploadDir, name));
    return { thumbnailUrl: mediaUrl(name), width: metadata.width ?? null, height: metadata.height ?? null };
  } catch (error) {
    logger.warn({ err: error, file: file.filename }, "Image processing failed; serving original");
    return { thumbnailUrl: null, width: null, height: null };
  }
}

export async function removeUpload(url: string): Promise<void> {
  const filename = path.basename(url);
  if (!filename) return;
  try {
    await fs.unlink(path.join(uploadDir, filename));
  } catch {
    // A missing file is not an error we need to report.
  }
}
