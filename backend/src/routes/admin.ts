import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/async-handler";
import { ApiError } from "../lib/errors";
import { requireAuth, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { roleExists } from "../lib/permissions";
import { recordAudit } from "../lib/audit";
import {
  PERIOD_KEY_PATTERNS,
  PRIZE_PERIODS,
  periodRange,
  prizePeriodOf,
  rankPeriodOf,
  type PrizePeriod,
} from "../lib/prizes";
import { adminExtrasRouter } from "./admin-extras";
import { memberTotalsForPeriod, periodKeys } from "./quiz";

export const adminRouter = Router();

// Every admin route names the capability it needs, so a custom role or an
// edited built-in role changes access immediately without a restart.
adminRouter.use(requireAuth);
adminRouter.use(adminExtrasRouter);

const prizePeriodSchema = z.enum(["DAILY", "WEEKLY", "MONTHLY"]);

function prizePeriodParam(value: string): PrizePeriod {
  const period = prizePeriodSchema.parse(value);
  return period;
}

function prizeKeyParam(period: PrizePeriod, value: string): string {
  return z.string().regex(PERIOD_KEY_PATTERNS[period], "Invalid period key").parse(value);
}

const prizeTierSchema = z.object({
  rank: z.number().int().min(1).max(20),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  amountEtb: z.number().int().min(0).max(10_000_000).optional().nullable(),
  imageUrl: z.string().trim().max(600).optional().nullable(),
});

const prizeTiersSchema = z.object({ tiers: z.array(prizeTierSchema).min(1).max(20) });

const periodSchema = z.enum(["daily", "weekly", "monthly"]);

function periodWhere(period: z.infer<typeof periodSchema>, key: string) {
  if (period === "daily") return { day: key };
  if (period === "weekly") return { weekKey: key };
  return { monthKey: key };
}

/**
 * Detailed leaderboard report for one period. Each member appears once with
 * the points and time their answered questions earned in that period — the
 * same totals that rank the public leaderboard — plus staff-only context.
 */
adminRouter.get(
  "/leaderboard-report",
  requirePermission("quiz.leaderboard"),
  asyncHandler(async (req, res) => {
    const period = periodSchema.catch("monthly").parse(req.query.period);
    const keys = periodKeys();
    const key =
      typeof req.query.key === "string" && req.query.key
        ? req.query.key
        : period === "daily"
          ? keys.day
          : period === "weekly"
            ? keys.weekKey
            : keys.monthKey;

    const grouped = await prisma.quizAttempt.groupBy({
      by: ["userId"],
      where: { ...periodWhere(period, key), completedAt: { not: null } },
      _sum: { score: true, correctCount: true, totalQuestions: true, durationMs: true },
      _count: { _all: true },
      _max: { completedAt: true },
    });

    // Points first, then the faster total answering time, then whoever got there first.
    const ranked = grouped
      .map((row) => ({
        userId: row.userId,
        points: row._sum.score ?? 0,
        correctCount: row._sum.correctCount ?? 0,
        questions: row._sum.totalQuestions ?? 0,
        plays: row._count._all,
        totalTimeMs: row._sum.durationMs ?? 0,
        lastCompletedAt: row._max.completedAt,
      }))
      .sort(
        (a, b) =>
          b.points - a.points ||
          a.totalTimeMs - b.totalTimeMs ||
          (a.lastCompletedAt?.getTime() ?? 0) - (b.lastCompletedAt?.getTime() ?? 0),
      )
      .slice(0, 100);

    const userIds = ranked.map((row) => row.userId);
    const [users, totals] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, displayName: true, email: true, region: true, banned: true },
      }),
      prisma.quizAttempt.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, completedAt: { not: null } },
        _count: { _all: true },
        _avg: { score: true },
      }),
    ]);
    const usersById = new Map(users.map((u) => [u.id, u]));
    const totalsById = new Map(totals.map((t) => [t.userId, t]));

    const entries = ranked.flatMap((row, i) => {
      const user = usersById.get(row.userId);
      if (!user) return [];
      const t = totalsById.get(row.userId);
      return [
        {
          rank: i + 1,
          ...row,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          region: user.region,
          banned: user.banned,
          attemptsAllTime: t?._count._all ?? 0,
          averageScore: Math.round(t?._avg.score ?? 0),
        },
      ];
    });

    const completed = entries.length;
    const averageScore = completed ? Math.round(entries.reduce((s, e) => s + e.points, 0) / completed) : 0;
    res.json({
      period,
      key,
      range: periodRange(prizePeriodOf(period), key),
      summary: { completed, averageScore, topScore: entries[0]?.points ?? 0 },
      entries,
    });
  }),
);

/** The prize configuration for every period, plus the key of the current one. */
adminRouter.get(
  "/prizes/config",
  requirePermission("quiz.prizes"),
  asyncHandler(async (_req, res) => {
    const keys = periodKeys();
    const tiers = await prisma.prizeTier.findMany({ orderBy: [{ period: "asc" }, { rank: "asc" }] });
    res.json({
      periods: PRIZE_PERIODS,
      currentKeys: { DAILY: keys.day, WEEKLY: keys.weekKey, MONTHLY: keys.monthKey },
      tiers,
    });
  }),
);

/**
 * Replaces one period's winner list. Each row is one winning rank, so the
 * number of rows is the number of winners.
 */
adminRouter.put(
  "/prizes/config/:period",
  requirePermission("quiz.prizes"),
  validate(prizeTiersSchema),
  asyncHandler(async (req, res) => {
    const period = prizePeriodParam(req.params.period);
    const { tiers } = req.body as z.infer<typeof prizeTiersSchema>;

    const ranks = new Set(tiers.map((tier) => tier.rank));
    if (ranks.size !== tiers.length) throw ApiError.badRequest("Each winning rank can appear only once");

    await prisma.$transaction([
      prisma.prizeTier.deleteMany({ where: { period } }),
      prisma.prizeTier.createMany({
        data: tiers.map((tier) => ({
          period,
          rank: tier.rank,
          name: tier.name,
          description: tier.description?.trim() || null,
          amountEtb: tier.amountEtb ?? null,
          imageUrl: tier.imageUrl?.trim() || null,
        })),
      }),
    ]);

    const saved = await prisma.prizeTier.findMany({ where: { period }, orderBy: { rank: "asc" } });
    await recordAudit(req, {
      action: "prize.config.update",
      targetType: "period",
      targetId: period,
      detail: { winners: saved.length, ranks: saved.map((tier) => tier.rank) },
    });
    res.json({ tiers: saved });
  }),
);

/** One period's configured winners and the awards already granted for it. */
adminRouter.get(
  "/prizes/:period/:key",
  requirePermission("quiz.prizes"),
  asyncHandler(async (req, res) => {
    const period = prizePeriodParam(req.params.period);
    const key = prizeKeyParam(period, req.params.key);
    const [tiers, awards] = await Promise.all([
      prisma.prizeTier.findMany({ where: { period }, orderBy: { rank: "asc" } }),
      prisma.prizeAward.findMany({
        where: { period, periodKey: key },
        orderBy: { rank: "asc" },
        include: { user: { select: { username: true, displayName: true, email: true } } },
      }),
    ]);
    res.json({ period, key, range: periodRange(period, key), winners: tiers.length, tiers, awards });
  }),
);

/**
 * Snapshots the period's winners using the same ranking rule as the public
 * leaderboard (points, then total answering time). Running it again keeps
 * existing rows — including paid or void ones — untouched.
 */
adminRouter.post(
  "/prizes/:period/:key/finalise",
  requirePermission("quiz.prizes"),
  asyncHandler(async (req, res) => {
    const period = prizePeriodParam(req.params.period);
    const key = prizeKeyParam(period, req.params.key);
    const tiers = await prisma.prizeTier.findMany({ where: { period }, orderBy: { rank: "asc" } });
    if (tiers.length === 0) throw ApiError.badRequest("Configure the winners for this period first");

    const ranked = await memberTotalsForPeriod(rankPeriodOf(period), key, tiers.length);
    if (ranked.length === 0) throw ApiError.badRequest("No completed attempts exist for that period");

    await prisma.$transaction(
      ranked.map((row, i) => {
        const tier = tiers[i];
        return prisma.prizeAward.upsert({
          where: { period_periodKey_rank: { period, periodKey: key, rank: tier.rank } },
          create: {
            period,
            periodKey: key,
            rank: tier.rank,
            userId: row.userId,
            name: tier.name,
            description: tier.description,
            amountEtb: tier.amountEtb,
            imageUrl: tier.imageUrl,
          },
          update: {},
        });
      }),
    );
    const awards = await prisma.prizeAward.findMany({
      where: { period, periodKey: key },
      orderBy: { rank: "asc" },
      include: { user: { select: { username: true, displayName: true, email: true } } },
    });
    await recordAudit(req, {
      action: "prize.finalise",
      targetType: "period",
      targetId: `${period}:${key}`,
      detail: { awards: awards.length, winners: tiers.length },
    });
    res.json({ period, key, range: periodRange(period, key), winners: tiers.length, tiers, awards });
  }),
);

const prizeUpdateSchema = z.object({
  status: z.enum(["PENDING", "PAID", "VOID"]),
  note: z.string().trim().max(500).optional().nullable(),
});

adminRouter.patch(
  "/prizes/award/:id",
  requirePermission("quiz.prizes"),
  validate(prizeUpdateSchema),
  asyncHandler(async (req, res) => {
    const award = await prisma.prizeAward.findUnique({ where: { id: req.params.id } });
    if (!award) throw ApiError.notFound("Prize award not found");
    const { status, note } = req.body as z.infer<typeof prizeUpdateSchema>;
    const updated = await prisma.prizeAward.update({
      where: { id: award.id },
      data: { status, note: note ?? null },
    });
    await recordAudit(req, {
      action: "prize.update",
      targetType: "prize",
      targetId: award.id,
      detail: { period: award.period, periodKey: award.periodKey, rank: award.rank, status },
    });
    res.json({ award: updated });
  }),
);

/**
 * The 3 ETB retry ledger for one day, newest first, for staff review. Payments
 * are confirmed by the member when they pay in cash or by mobile money.
 */
adminRouter.get(
  "/retry-payments",
  requirePermission("quiz.payments"),
  asyncHandler(async (req, res) => {
    const day =
      typeof req.query.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.day)
        ? req.query.day
        : periodKeys().day;

    const [payments, totals] = await Promise.all([
      prisma.quizPayment.findMany({
        where: { day },
        include: {
          user: { select: { username: true, displayName: true, email: true, region: true } },
          attempt: { select: { score: true, correctCount: true, completedAt: true, playIndex: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.quizPayment.groupBy({ by: ["status"], where: { day }, _sum: { amountEtb: true }, _count: { _all: true } }),
    ]);

    const confirmed = totals.find((t) => t.status === "CONFIRMED");
    res.json({
      day,
      priceEtb: 3,
      count: payments.length,
      totalEtb: confirmed?._sum.amountEtb ?? 0,
      confirmedCount: confirmed?._count._all ?? 0,
      payments,
    });
  }),
);

// ---------------------------------------------------------------------------
// Dashboard overview and member management
// ---------------------------------------------------------------------------

/** Counters and recent activity for the admin home screen. */
adminRouter.get(
  "/overview",
  requirePermission("overview.view"),
  asyncHandler(async (_req, res) => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [users, banned, posts, comments, likes, follows, messages, destinations, attempts, recentPosts] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { banned: true } }),
        prisma.experiencePost.count({ where: { deletedAt: null } }),
        prisma.experienceComment.count({ where: { deletedAt: null } }),
        prisma.experienceLike.count(),
        prisma.follow.count(),
        prisma.directMessage.count(),
        prisma.destination.count(),
        prisma.quizAttempt.count({ where: { completedAt: { not: null } } }),
        prisma.user.count({ where: { createdAt: { gte: since } } }),
      ]);

    res.json({
      totals: { users, banned, posts, comments, likes, follows, messages, destinations, attempts, newUsers30d: recentPosts },
    });
  }),
);

/** Member list with activity counters, searchable by name, username or email. */
adminRouter.get(
  "/users",
  requirePermission("members.view"),
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const filter = typeof req.query.filter === "string" ? req.query.filter : "all";
    // Staff are the roles that carry at least one capability, custom roles included.
    const staffRoleNames = (await prisma.role.findMany({ select: { name: true, permissions: true } }))
      .filter((role) => role.permissions.length > 0)
      .map((role) => role.name);

    const users = await prisma.user.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { username: { contains: q, mode: "insensitive" } },
                { displayName: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(filter === "banned" ? { banned: true } : {}),
        ...(filter === "staff" ? { role: { in: staffRoleNames } } : {}),
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        region: true,
        banned: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: { experiences: true, attempts: true, followers: true, following: true, messagesSent: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json({
      users: users.map(({ _count, ...u }) => ({
        ...u,
        stories: _count.experiences,
        attempts: _count.attempts,
        followers: _count.followers,
        following: _count.following,
        messagesSent: _count.messagesSent,
      })),
    });
  }),
);

/** Promote or demote a member, including into a custom role. */
adminRouter.patch(
  "/users/:id/role",
  requirePermission("roles.manage"),
  validate(z.object({ role: z.string().trim().min(1).max(40) })),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw ApiError.notFound("User not found");
    if (user.id === req.userId) throw ApiError.badRequest("You cannot change your own role");
    const role = (req.body as { role: string }).role;
    if (!(await roleExists(role))) throw ApiError.badRequest("That role does not exist");
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role },
      select: { id: true, username: true, role: true },
    });
    await recordAudit(req, {
      action: "member.role",
      targetType: "user",
      targetId: user.id,
      detail: { from: user.role, to: role, username: user.username },
    });
    res.json({ user: updated });
  }),
);

/** Interaction report: engagement totals and the busiest places and stories. */
adminRouter.get(
  "/interactions",
  requirePermission("overview.view"),
  asyncHandler(async (_req, res) => {
    const [topPlaces, topStories, dailyPosts] = await Promise.all([
      prisma.destination.findMany({
        select: {
          id: true,
          name: true,
          region: true,
          _count: { select: { experiences: true } },
        },
        orderBy: { experiences: { _count: "desc" } },
        take: 6,
      }),
      prisma.experiencePost.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          title: true,
          likeCount: true,
          commentCount: true,
          createdAt: true,
          author: { select: { displayName: true, username: true } },
        },
        orderBy: [{ likeCount: "desc" }, { commentCount: "desc" }],
        take: 6,
      }),
      prisma.experiencePost.findMany({
        where: { deletedAt: null, createdAt: { gte: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000) } },
        select: { createdAt: true },
      }),
    ]);

    const byDay = new Map<string, number>();
    for (let i = 13; i >= 0; i -= 1) {
      const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      byDay.set(day, 0);
    }
    for (const post of dailyPosts) {
      const day = post.createdAt.toISOString().slice(0, 10);
      if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }

    res.json({
      topPlaces: topPlaces.map((p) => ({ id: p.id, name: p.name, region: p.region, stories: p._count.experiences })),
      topStories,
      dailyStories: [...byDay.entries()].map(([day, count]) => ({ day, count })),
    });
  }),
);

// ---------------------------------------------------------------------------
// Places to visit
// ---------------------------------------------------------------------------

const destinationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  region: z.string().trim().min(2).max(60),
  city: z.string().trim().max(80).optional().nullable(),
  category: z.enum(["HISTORY", "HERITAGE", "NATURE", "WILDLIFE", "ADVENTURE", "CULTURE", "CITY", "FOOD"]),
  tagline: z.string().trim().min(5).max(160),
  summary: z.string().trim().min(20).max(1000),
  description: z.string().trim().min(40).max(4000),
  highlights: z.array(z.string().trim().min(2).max(160)).max(12).default([]),
  activities: z.array(z.string().trim().min(2).max(160)).max(12).default([]),
  bestTime: z.string().trim().min(3).max(160),
  gettingThere: z.string().trim().min(5).max(2000),
  entryFee: z.string().trim().max(160).optional().nullable(),
  durationDays: z.coerce.number().int().min(1).max(30).default(2),
  budgetLevel: z.coerce.number().int().min(1).max(3).default(2),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  imageUrl: z.string().trim().max(2000).default(""),
  featured: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

adminRouter.get(
  "/destinations",
  requirePermission("places.view"),
  asyncHandler(async (_req, res) => {
    const destinations = await prisma.destination.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        region: true,
        category: true,
        imageUrl: true,
        featured: true,
        rating: true,
        createdAt: true,
        _count: { select: { experiences: true } },
      },
    });
    res.json({
      destinations: destinations.map(({ _count, ...d }) => ({ ...d, stories: _count.experiences })),
    });
  }),
);

/** Adds a place to the visitor catalogue. Staff may publish without a photo. */
adminRouter.post(
  "/destinations",
  requirePermission("places.manage"),
  validate(destinationSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof destinationSchema>;
    const base = slugify(input.name) || "place";
    let slug = base;
    for (let i = 2; await prisma.destination.findUnique({ where: { slug } }); i += 1) {
      slug = `${base}-${i}`;
    }

    const destination = await prisma.destination.create({
      data: {
        ...input,
        slug,
        city: input.city ?? null,
        entryFee: input.entryFee ?? null,
        imageUrl: input.imageUrl ?? "",
      },
    });
    await recordAudit(req, {
      action: "place.create",
      targetType: "destination",
      targetId: destination.id,
      detail: { name: destination.name, region: destination.region },
    });
    res.status(201).json({ destination });
  }),
);

adminRouter.patch(
  "/destinations/:id",
  requirePermission("places.manage"),
  validate(destinationSchema.partial()),
  asyncHandler(async (req, res) => {
    const destination = await prisma.destination.findUnique({ where: { id: req.params.id } });
    if (!destination) throw ApiError.notFound("Place not found");
    const updated = await prisma.destination.update({
      where: { id: destination.id },
      data: req.body as Partial<z.infer<typeof destinationSchema>>,
    });
    await recordAudit(req, {
      action: "place.update",
      targetType: "destination",
      targetId: destination.id,
      detail: { name: updated.name, fields: Object.keys(req.body as object) },
    });
    res.json({ destination: updated });
  }),
);

/** Removing a place also hides it from recommendations. */
adminRouter.delete(
  "/destinations/:id",
  requirePermission("places.manage"),
  asyncHandler(async (req, res) => {
    const destination = await prisma.destination.findUnique({ where: { id: req.params.id } });
    if (!destination) throw ApiError.notFound("Place not found");
    await prisma.destination.delete({ where: { id: destination.id } });
    await recordAudit(req, {
      action: "place.delete",
      targetType: "destination",
      targetId: destination.id,
      detail: { name: destination.name },
    });
    res.status(204).end();
  }),
);

const awardSchema = z.object({
  rank: z.number().int().min(1).max(20),
  userId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  amountEtb: z.number().int().min(0).max(10_000_000).optional().nullable(),
  imageUrl: z.string().trim().max(600).optional().nullable(),
});

/** Assigns a prize to a member by hand, e.g. for a special award. */
adminRouter.post(
  "/prizes/:period/:key/award",
  requirePermission("quiz.prizes"),
  validate(awardSchema),
  asyncHandler(async (req, res) => {
    const period = prizePeriodParam(req.params.period);
    const key = prizeKeyParam(period, req.params.key);
    const input = req.body as z.infer<typeof awardSchema>;
    const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { id: true } });
    if (!user) throw ApiError.notFound("User not found");

    const award = await prisma.prizeAward.upsert({
      where: { period_periodKey_rank: { period, periodKey: key, rank: input.rank } },
      create: {
        period,
        periodKey: key,
        rank: input.rank,
        userId: input.userId,
        name: input.name,
        description: input.description?.trim() || null,
        amountEtb: input.amountEtb ?? null,
        imageUrl: input.imageUrl?.trim() || null,
      },
      update: {
        userId: input.userId,
        name: input.name,
        description: input.description?.trim() || null,
        amountEtb: input.amountEtb ?? null,
        imageUrl: input.imageUrl?.trim() || null,
      },
      include: { user: { select: { username: true, displayName: true, email: true } } },
    });
    await recordAudit(req, {
      action: "prize.award",
      targetType: "prize",
      targetId: award.id,
      detail: { period, periodKey: key, rank: input.rank, amountEtb: input.amountEtb ?? null, userId: input.userId },
    });
    res.status(201).json({ award });
  }),
);

/** Moderation: hide a shared experience (soft delete). */
adminRouter.delete(
  "/experiences/:id",
  requirePermission("content.moderate"),
  asyncHandler(async (req, res) => {
    const post = await prisma.experiencePost.findUnique({ where: { id: req.params.id } });
    if (!post || post.deletedAt) throw ApiError.notFound("Experience not found");
    await prisma.experiencePost.update({ where: { id: post.id }, data: { deletedAt: new Date() } });
    await recordAudit(req, {
      action: "story.hide",
      targetType: "experience",
      targetId: post.id,
      detail: { title: post.title, authorId: post.authorId },
    });
    res.status(204).end();
  }),
);

/** Ban or unban a member. Banned accounts are rejected by the auth middleware. */
adminRouter.patch(
  "/users/:id/ban",
  requirePermission("members.manage"),
  validate(z.object({ banned: z.boolean() })),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw ApiError.notFound("User not found");
    if (user.id === req.userId) throw ApiError.badRequest("You cannot ban your own account");
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { banned: (req.body as { banned: boolean }).banned },
      select: { id: true, username: true, banned: true },
    });
    await recordAudit(req, {
      action: updated.banned ? "member.suspend" : "member.restore",
      targetType: "user",
      targetId: user.id,
      detail: { username: user.username },
    });
    res.json({ user: updated });
  }),
);
