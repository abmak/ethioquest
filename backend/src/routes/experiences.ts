import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/async-handler";
import { ApiError } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";

export const experiencesRouter = Router();

const authorSelect = { id: true, username: true, displayName: true, avatarUrl: true } as const;

/** Photos may be an uploaded /uploads path or a full external URL. */
const photoUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => value.startsWith("/uploads/") || /^https?:\/\//.test(value), "Enter a valid photo URL");

const postInput = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(20).max(5000),
  destinationId: z.string().min(1).optional().nullable(),
  destinationName: z.string().trim().min(2).max(120),
  region: z.string().trim().min(2).max(60),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  travelDate: z.string().datetime().optional().nullable(),
  imageUrls: z.array(photoUrl).max(6).default([]),
});

const commentInput = z.object({ body: z.string().trim().min(1).max(1000) });

async function loadPost(id: string) {
  const post = await prisma.experiencePost.findFirst({ where: { id, deletedAt: null } });
  if (!post) throw ApiError.notFound("Experience not found");
  return post;
}

/** Newest-first feed with cursor pagination. */
experiencesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const region = typeof req.query.region === "string" && req.query.region ? req.query.region : undefined;

    const rows = await prisma.experiencePost.findMany({
      where: { deletedAt: null, ...(region ? { region } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { author: { select: authorSelect } },
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const viewerId = req.userId;
    const liked = viewerId
      ? new Set(
          (
            await prisma.experienceLike.findMany({
              where: { userId: viewerId, postId: { in: page.map((p) => p.id) } },
              select: { postId: true },
            })
          ).map((l) => l.postId),
        )
      : new Set<string>();

    // The viewer's follow state travels with each story, so every author row
    // can show Follow or Following without another round trip.
    const followed = viewerId
      ? new Set(
          (
            await prisma.follow.findMany({
              where: { followerId: viewerId, followingId: { in: page.map((p) => p.authorId) } },
              select: { followingId: true },
            })
          ).map((f) => f.followingId),
        )
      : new Set<string>();

    res.json({
      posts: page.map((p) => ({
        ...p,
        likedByMe: liked.has(p.id),
        author: { ...p.author, followedByMe: followed.has(p.authorId) },
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    });
  }),
);

experiencesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const post = await prisma.experiencePost.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        author: { select: authorSelect },
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          take: 200,
          include: { author: { select: authorSelect } },
        },
      },
    });
    if (!post) throw ApiError.notFound("Experience not found");
    const [likedByMe, followedByMe] = req.userId
      ? await Promise.all([
          prisma.experienceLike.findUnique({
            where: { postId_userId: { postId: post.id, userId: req.userId } },
          }),
          prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: req.userId, followingId: post.authorId } },
          }),
        ])
      : [null, null];
    res.json({
      post: { ...post, likedByMe: Boolean(likedByMe), author: { ...post.author, followedByMe: Boolean(followedByMe) } },
    });
  }),
);

experiencesRouter.post(
  "/",
  requireAuth,
  validate(postInput),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof postInput>;
    const post = await prisma.experiencePost.create({
      data: {
        authorId: req.userId!,
        title: input.title,
        body: input.body,
        destinationId: input.destinationId ?? null,
        destinationName: input.destinationName,
        region: input.region,
        rating: input.rating ?? null,
        travelDate: input.travelDate ? new Date(input.travelDate) : null,
        imageUrls: input.imageUrls,
      },
      include: { author: { select: authorSelect } },
    });
    res.status(201).json({ post });
  }),
);

experiencesRouter.patch(
  "/:id",
  requireAuth,
  validate(postInput.partial()),
  asyncHandler(async (req, res) => {
    const post = await loadPost(req.params.id);
    if (post.authorId !== req.userId) throw ApiError.forbidden();
    const input = req.body as Partial<z.infer<typeof postInput>>;
    const updated = await prisma.experiencePost.update({
      where: { id: post.id },
      data: {
        ...input,
        travelDate: input.travelDate === undefined ? undefined : input.travelDate ? new Date(input.travelDate) : null,
      },
      include: { author: { select: authorSelect } },
    });
    res.json({ post: updated });
  }),
);

experiencesRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await loadPost(req.params.id);
    if (post.authorId !== req.userId && req.userRole !== "ADMIN" && req.userRole !== "MODERATOR") {
      throw ApiError.forbidden();
    }
    await prisma.experiencePost.update({ where: { id: post.id }, data: { deletedAt: new Date() } });
    res.status(204).end();
  }),
);

// Likes: the composite key makes a repeat like a no-op, and the counter moves
// only when a row is actually created or removed.
experiencesRouter.post(
  "/:id/like",
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await loadPost(req.params.id);
    const created = await prisma.$transaction(async (tx) => {
      const existing = await tx.experienceLike.findUnique({
        where: { postId_userId: { postId: post.id, userId: req.userId! } },
      });
      if (existing) return false;
      await tx.experienceLike.create({ data: { postId: post.id, userId: req.userId! } });
      await tx.experiencePost.update({ where: { id: post.id }, data: { likeCount: { increment: 1 } } });
      return true;
    });
    const fresh = await prisma.experiencePost.findUniqueOrThrow({ where: { id: post.id } });
    res.json({ liked: true, likeCount: fresh.likeCount, changed: created });
  }),
);

experiencesRouter.delete(
  "/:id/like",
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await loadPost(req.params.id);
    await prisma.$transaction(async (tx) => {
      const removed = await tx.experienceLike.deleteMany({
        where: { postId: post.id, userId: req.userId! },
      });
      if (removed.count > 0) {
        await tx.experiencePost.update({ where: { id: post.id }, data: { likeCount: { decrement: 1 } } });
      }
    });
    const fresh = await prisma.experiencePost.findUniqueOrThrow({ where: { id: post.id } });
    res.json({ liked: false, likeCount: fresh.likeCount });
  }),
);

experiencesRouter.post(
  "/:id/comments",
  requireAuth,
  validate(commentInput),
  asyncHandler(async (req, res) => {
    const post = await loadPost(req.params.id);
    const { body } = req.body as z.infer<typeof commentInput>;
    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.experienceComment.create({
        data: { postId: post.id, authorId: req.userId!, body },
        include: { author: { select: authorSelect } },
      });
      await tx.experiencePost.update({ where: { id: post.id }, data: { commentCount: { increment: 1 } } });
      return created;
    });
    res.status(201).json({ comment });
  }),
);

experiencesRouter.delete(
  "/:id/comments/:commentId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await loadPost(req.params.id);
    const comment = await prisma.experienceComment.findFirst({
      where: { id: req.params.commentId, postId: post.id, deletedAt: null },
    });
    if (!comment) throw ApiError.notFound("Comment not found");
    if (comment.authorId !== req.userId && req.userRole !== "ADMIN" && req.userRole !== "MODERATOR") {
      throw ApiError.forbidden();
    }
    await prisma.$transaction(async (tx) => {
      await tx.experienceComment.update({ where: { id: comment.id }, data: { deletedAt: new Date() } });
      await tx.experiencePost.update({ where: { id: post.id }, data: { commentCount: { decrement: 1 } } });
    });
    res.status(204).end();
  }),
);
