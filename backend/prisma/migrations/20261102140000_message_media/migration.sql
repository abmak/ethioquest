-- Attachments for direct messages: a photo (with its thumbnail) or a voice
-- note with its length. Both live in /uploads like post photos, and a message
-- may carry text, one photo, one voice note, or a combination.
ALTER TABLE "DirectMessage"
    ADD COLUMN "imageUrl" TEXT,
    ADD COLUMN "imageThumbnailUrl" TEXT,
    ADD COLUMN "audioUrl" TEXT,
    ADD COLUMN "audioDurationMs" INTEGER;
