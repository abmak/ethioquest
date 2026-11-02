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

// MediaRecorder writes webm/opus in Chrome and Firefox and mp4 in Safari; the
// rest are here so an uploaded file recorded elsewhere still lands.
const AUDIO_TYPES: Record<string, string> = {
  "audio/webm": ".webm",
  "audio/ogg": ".ogg",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".aac",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
};

// A five-minute voice note is well under this even before compression.
const MAX_AUDIO_MB = 12;

// The directory must exist before multer writes the first file.
fs.mkdirSync(uploadDir, { recursive: true });

function storedName(types: Record<string, string>, file: Express.Multer.File): string {
  const extension = types[file.mimetype] ?? path.extname(file.originalname);
  return `${randomUUID()}${extension.slice(0, 10)}`;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, storedName(IMAGE_TYPES, file)),
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

const uploadAudio = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, storedName(AUDIO_TYPES, file)),
  }),
  limits: { fileSize: MAX_AUDIO_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (AUDIO_TYPES[file.mimetype]) {
      cb(null, true);
      return;
    }
    cb(ApiError.badRequest("Record the voice note in the app, or upload a WebM, Ogg, MP3, M4A or WAV file."));
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

/**
 * Voice note upload for direct messages. The browser hands over whatever
 * MediaRecorder produced; there is nothing to resize, so the file is stored as
 * it arrived and the sender attaches the URL to the message.
 */
mediaRouter.post(
  "/audio",
  requireAuth,
  uploadLimiter,
  uploadAudio.single("file"),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) throw ApiError.badRequest("Choose a voice note to upload.");

    res.status(201).json({ audio: { url: mediaUrl(file.filename), size: file.size } });
  }),
);
