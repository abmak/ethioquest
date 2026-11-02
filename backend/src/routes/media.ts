import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { env } from "../config/env";
import { asyncHandler } from "../lib/async-handler";
import { ApiError } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { uploadLimiter } from "../lib/rate-limit";
import { mediaUrl, processImage, uploadDir } from "../lib/storage";

export const mediaRouter = Router();

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

// The directory must exist before multer writes the first file.
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const extension = IMAGE_TYPES[file.mimetype] ?? path.extname(file.originalname);
      cb(null, `${randomUUID()}${extension.slice(0, 10)}`);
    },
  }),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_TYPES[file.mimetype]) {
      cb(null, true);
      return;
    }
    cb(ApiError.badRequest("Choose a JPEG, PNG, WebP, GIF or AVIF photo."));
  },
});

/**
 * Photo upload for travel stories. Accepts up to six images in one request so
 * a story can be published with its gallery attached.
 */
mediaRouter.post(
  "/",
  requireAuth,
  uploadLimiter,
  upload.array("files", 6),
  asyncHandler(async (req, res) => {
    const files = (req.files ?? []) as Express.Multer.File[];
    if (files.length === 0) throw ApiError.badRequest("Choose at least one photo to upload.");

    const photos = await Promise.all(
      files.map(async (file) => {
        const image = await processImage(file);
        return {
          url: mediaUrl(file.filename),
          thumbnailUrl: image.thumbnailUrl ?? mediaUrl(file.filename),
          width: image.width ?? 0,
          height: image.height ?? 0,
        };
      }),
    );

    res.status(201).json({ photos });
  }),
);
