import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/async-handler";
import { ApiError } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { writeLimiter } from "../lib/rate-limit";

export const socialRouter = Router();

const memberSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  region: true,
  bio: true,
} as const;

/** Public member shape with the follow flags the viewer needs. */
async function decorateMembers(
  viewerId: string | undefined,
  members: { id: string }[],
): Promise<Map<string, { followedByMe: boolean }>> {
  if (!viewerId || members.length === 0) return new Map();
  const rows = await prisma.follow.findMany({
    where: { followerId: viewerId, followingId: { in: members.map((m) => m.id) } },
    select: { followingId: true },
  });
  const following = new Set(rows.map((r) => r.followingId));
  return new Map(members.map((m) => [m.id, { followedByMe: following.has(m.id) }]));
}

async function followCounts(userId: string) {
  const [followers, following] = await Promise.all([
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
  ]);
  return { followers, following };
}

/** Member directory and search, used by the follow and message screens. */
socialRouter.get(
  "/people",
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const members = await prisma.user.findMany({
      where: {
        banned: false,
        id: { not: req.userId! },
        ...(q
          ? {
              OR: [
                { username: { contains: q, mode: "insensitive" } },
                { displayName: { contains: q, mode: "insensitive" } },
                { region: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: { ...memberSelect, _count: { select: { followers: true, experiences: true } } },
      orderBy: [{ followers: { _count: "desc" } }, { createdAt: "desc" }],
      take: 30,
    });
    const flags = await decorateMembers(req.userId, members);
    res.json({
      people: members.map(({ _count, ...m }) => ({
        ...m,
        followers: _count.followers,
        stories: _count.experiences,
        followedByMe: flags.get(m.id)?.followedByMe ?? false,
      })),
    });
  }),
);

/** A member's public profile: bio, counters, follow state and latest stories. */
socialRouter.get(
  "/profile/:username",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username.toLowerCase() },
      select: memberSelect,
    });
    if (!user) throw ApiError.notFound("Member not found");

    const [counts, stories, followedByMe] = await Promise.all([
      followCounts(user.id),
      prisma.experiencePost.findMany({
        where: { authorId: user.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, title: true, imageUrls: true, createdAt: true, likeCount: true, commentCount: true },
      }),
      req.userId
        ? prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: req.userId!, followingId: user.id } },
          })
        : null,
    ]);

    res.json({
      profile: {
        ...user,
        ...counts,
        followedByMe: Boolean(followedByMe),
        isMe: user.id === req.userId,
        stories,
      },
    });
  }),
);

socialRouter.post(
  "/follow/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const followingId = req.params.userId;
    if (followingId === req.userId) throw ApiError.badRequest("You cannot follow yourself");
    const target = await prisma.user.findUnique({ where: { id: followingId }, select: { id: true } });
    if (!target) throw ApiError.notFound("Member not found");

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: req.userId!, followingId } },
      create: { followerId: req.userId!, followingId },
      update: {},
    });
    const counts = await followCounts(followingId);
    res.json({ followedByMe: true, ...counts });
  }),
);

socialRouter.delete(
  "/follow/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const followingId = req.params.userId;
    await prisma.follow.deleteMany({ where: { followerId: req.userId!, followingId } });
    const counts = await followCounts(followingId);
    res.json({ followedByMe: false, ...counts });
  }),
);

/** Everyone the viewer follows, for the "Following" filter. */
socialRouter.get(
  "/following",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await prisma.follow.findMany({
      where: { followerId: req.userId! },
      select: { following: { select: memberSelect } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ people: rows.map((row) => ({ ...row.following, followedByMe: true })) });
  }),
);

// ---------------------------------------------------------------------------
// Direct messages
// ---------------------------------------------------------------------------

/** One row per conversation partner, newest thread first. */
socialRouter.get(
  "/messages",
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = req.userId!;
    const recent = await prisma.directMessage.findMany({
      where: { OR: [{ senderId: me }, { recipientId: me }] },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        sender: { select: memberSelect },
        recipient: { select: memberSelect },
      },
    });

    const unread = await prisma.directMessage.groupBy({
      by: ["senderId"],
      where: { recipientId: me, readAt: null },
      _count: { _all: true },
    });
    const unreadBy = new Map(unread.map((row) => [row.senderId, row._count._all]));

    const seen = new Set<string>();
    const conversations = [] as {
      member: (typeof recent)[number]["sender"];
      lastMessage: {
        body: string;
        createdAt: Date;
        mine: boolean;
        hasPhoto: boolean;
        hasVoice: boolean;
      };
      unread: number;
    }[];

    for (const message of recent) {
      const mine = message.senderId === me;
      const partner = mine ? message.recipient : message.sender;
      if (seen.has(partner.id)) continue;
      seen.add(partner.id);
      conversations.push({
        member: partner,
        lastMessage: {
          body: message.body,
          createdAt: message.createdAt,
          mine,
          hasPhoto: Boolean(message.imageUrl),
          hasVoice: Boolean(message.audioUrl),
        },
        unread: unreadBy.get(partner.id) ?? 0,
      });
    }

    res.json({ conversations });
  }),
);

socialRouter.get(
  "/messages/unread",
  requireAuth,
  asyncHandler(async (req, res) => {
    const count = await prisma.directMessage.count({
      where: { recipientId: req.userId!, readAt: null },
    });
    res.json({ count });
  }),
);

/** The whole thread with one member, oldest first. Opening it marks replies read. */
socialRouter.get(
  "/messages/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = req.userId!;
    const partnerId = req.params.userId;
    if (partnerId === me) throw ApiError.badRequest("You cannot message yourself");

    const partner = await prisma.user.findUnique({ where: { id: partnerId }, select: memberSelect });
    if (!partner) throw ApiError.notFound("Member not found");

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: me, recipientId: partnerId },
          { senderId: partnerId, recipientId: me },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    });

    await prisma.directMessage.updateMany({
      where: { senderId: partnerId, recipientId: me, readAt: null },
      data: { readAt: new Date() },
    });

    res.json({
      member: { ...partner, followedByMe: Boolean(await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: me, followingId: partnerId } },
      })) },
      messages: messages.reverse().map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt,
        mine: m.senderId === me,
        imageUrl: m.imageUrl,
        imageThumbnailUrl: m.imageThumbnailUrl,
        audioUrl: m.audioUrl,
        audioDurationMs: m.audioDurationMs,
      })),
    });
  }),
);

// Attachments must be files this API stored, so a member cannot point a
// message at someone else's server.
const UPLOAD_PATH = /^\/uploads\/[A-Za-z0-9._-]+$/;

const sendSchema = z
  .object({
    body: z.string().trim().max(2000).optional(),
    imageUrl: z.string().regex(UPLOAD_PATH, "Upload the photo first").optional(),
    imageThumbnailUrl: z.string().regex(UPLOAD_PATH, "Upload the photo first").optional(),
    audioUrl: z.string().regex(UPLOAD_PATH, "Upload the voice note first").optional(),
    audioDurationMs: z.coerce.number().int().min(0).max(600_000).optional(),
  })
  .refine((value) => Boolean(value.body || value.imageUrl || value.audioUrl), {
    message: "Write a message or attach a photo or voice note.",
    path: ["body"],
  });

socialRouter.post(
  "/messages/:userId",
  requireAuth,
  writeLimiter,
  validate(sendSchema),
  asyncHandler(async (req, res) => {
    const me = req.userId!;
    const partnerId = req.params.userId;
    if (partnerId === me) throw ApiError.badRequest("You cannot message yourself");

    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      select: { id: true, banned: true },
    });
    if (!partner || partner.banned) throw ApiError.notFound("Member not found");

    const input = req.body as z.infer<typeof sendSchema>;
    const message = await prisma.directMessage.create({
      data: {
        senderId: me,
        recipientId: partnerId,
        body: input.body ?? "",
        imageUrl: input.imageUrl ?? null,
        imageThumbnailUrl: input.imageUrl
          ? input.imageThumbnailUrl ?? input.imageUrl
          : null,
        audioUrl: input.audioUrl ?? null,
        audioDurationMs: input.audioUrl ? input.audioDurationMs ?? null : null,
      },
    });
    res.status(201).json({
      message: {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
        mine: true,
        imageUrl: message.imageUrl,
        imageThumbnailUrl: message.imageThumbnailUrl,
        audioUrl: message.audioUrl,
        audioDurationMs: message.audioDurationMs,
      },
    });
  }),
);
