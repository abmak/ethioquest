import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/async-handler";
import { ApiError } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { PRIZE_PERIODS, periodRange, prizePeriodOf } from "../lib/prizes";
import { validate } from "../middleware/validate";

export const quizRouter = Router();

const QUESTIONS_PER_DAY = 10;
const MAX_SCORE = 100;
const TIME_LIMIT_MS = 150_000;

/** One free play every day, then up to nine retries at 3 ETB each. */
export const MAX_PLAYS_PER_DAY = 10;
export const RETRY_PRICE_ETB = 3;
const RETRY_METHODS = ["TELEBIRR", "CBE_BIRR", "CASH"] as const;

const ADDIS = "Africa/Addis_Ababa";

/** Calendar keys in Addis Ababa time (UTC+3, no DST). */
export function periodKeys(now = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: ADDIS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // ISO week: Thursday decides the year.
  const dow = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dow + 3);
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 + Math.round(((date.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return {
    day,
    weekKey: `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`,
    monthKey: day.slice(0, 7),
  };
}

const QUESTION_FIELDS = {
  id: true,
  type: true,
  prompt: true,
  options: true,
  matchPairs: true,
  matchOptions: true,
  imageUrl: true,
  category: true,
} as const;

type QuestionRow = Prisma.QuizQuestionGetPayload<{ select: typeof QUESTION_FIELDS }>;

/**
 * Deterministic set for one day and play. The pool is shuffled with the day as
 * the seed, then each play takes its own slice, so retries get fresh questions
 * instead of the same ten again.
 *
 * Only ids are read for the shuffle — the bank holds tens of thousands of rows —
 * and a few spare candidates are fetched so a play never asks the same prompt
 * twice, which matters because one fact appears with several distractor sets.
 */
async function dailyQuestions(day: string, playIndex: number): Promise<QuestionRow[]> {
  const pool = await prisma.quizQuestion.findMany({
    where: { active: true },
    select: { id: true },
    orderBy: { key: "asc" },
  });
  if (pool.length === 0) return [];

  let seed = 0;
  for (const ch of day) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0;
  const order = pool.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }

  const size = Math.min(QUESTIONS_PER_DAY, pool.length);
  // Plays take consecutive slices of the shuffled pool and wrap for short pools.
  const start = pool.length > size ? (playIndex * size) % pool.length : 0;
  const wanted = Math.min(pool.length, size * 4);
  const candidates: string[] = [];
  for (let step = 0; step < order.length && candidates.length < wanted; step += 1) {
    candidates.push(pool[order[(start + step) % order.length]].id);
  }

  const rows = await questionsFor(candidates);
  const prompts = new Set<string>();
  const picked: QuestionRow[] = [];
  for (const row of rows) {
    if (prompts.has(row.prompt)) continue;
    prompts.add(row.prompt);
    picked.push(row);
    if (picked.length === size) break;
  }
  return picked;
}

/** The exact questions an existing attempt was created with, in order. */
async function questionsFor(ids: string[]): Promise<QuestionRow[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.quizQuestion.findMany({ where: { id: { in: ids } }, select: QUESTION_FIELDS });
  const byId = new Map(rows.map((q) => [q.id, q]));
  return ids.map((id) => byId.get(id)).filter((q): q is QuestionRow => Boolean(q));
}

function publicQuestion(q: QuestionRow) {
  const pairs = Array.isArray(q.matchPairs) ? (q.matchPairs as Array<{ left: string }>) : [];
  return {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    category: q.category,
    options: q.options,
    imageUrl: q.imageUrl,
    // Matching sends the left-hand names and the shuffled right-hand choices, never the answer key.
    matchLefts: pairs.map((p) => p.left),
    matchOptions: q.matchOptions,
  };
}

function playSummary(
  attempt: {
    playIndex: number;
    paid: boolean;
    score: number;
    correctCount: number;
    totalQuestions: number;
    durationMs: number | null;
    completedAt: Date | null;
  },
) {
  return {
    playIndex: attempt.playIndex,
    paid: attempt.paid,
    score: attempt.score,
    correctCount: attempt.correctCount,
    totalQuestions: attempt.totalQuestions,
    durationMs: attempt.durationMs,
    completedAt: attempt.completedAt,
  };
}

/** Ranking rule: higher score first, then shorter time. */
function betterPlay(
  a: { score: number; durationMs: number | null; completedAt: Date | null },
  b: { score: number; durationMs: number | null; completedAt: Date | null },
) {
  if (b.score !== a.score) return b.score - a.score;
  const ad = a.durationMs ?? Number.MAX_SAFE_INTEGER;
  const bd = b.durationMs ?? Number.MAX_SAFE_INTEGER;
  if (bd !== ad) return bd - ad;
  return (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0);
}

async function playsToday(userId: string, day: string) {
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId, day },
    orderBy: { playIndex: "asc" },
    select: {
      playIndex: true,
      paid: true,
      questionIds: true,
      score: true,
      correctCount: true,
      totalQuestions: true,
      durationMs: true,
      completedAt: true,
      startedAt: true,
    },
  });
  const active = attempts.find((a) => !a.completedAt) ?? null;
  const completed = attempts.filter((a) => a.completedAt);
  const best = [...completed].sort(betterPlay)[0] ?? null;
  return { attempts, active, used: attempts.length, best };
}

quizRouter.get(
  "/daily",
  requireAuth,
  asyncHandler(async (req, res) => {
    const keys = periodKeys();
    const state = await playsToday(req.userId!, keys.day);
    const nextPlayIndex = Math.min(state.used, MAX_PLAYS_PER_DAY - 1);

    const [questions, payments] = await Promise.all([
      state.active ? questionsFor(state.active.questionIds) : dailyQuestions(keys.day, nextPlayIndex),
      prisma.quizPayment.findMany({
        where: { userId: req.userId!, day: keys.day },
        select: { playIndex: true, amountEtb: true, method: true, reference: true, status: true, createdAt: true },
        orderBy: { playIndex: "asc" },
      }),
    ]);

    res.json({
      day: keys.day,
      timeLimitSeconds: TIME_LIMIT_MS / 1000,
      questions: questions.map(publicQuestion),
      quota: {
        maxPlays: MAX_PLAYS_PER_DAY,
        playsUsed: state.used,
        playsRemaining: Math.max(0, MAX_PLAYS_PER_DAY - state.used),
        freeAvailable: state.used === 0,
        retryPriceEtb: RETRY_PRICE_ETB,
        exhausted: state.used >= MAX_PLAYS_PER_DAY,
      },
      // Only an unfinished play is returned here; finished ones are in `plays`.
      attempt: state.active
        ? { startedAt: state.active.startedAt, playIndex: state.active.playIndex, paid: state.active.paid }
        : null,
      plays: state.attempts.filter((a) => a.completedAt).map(playSummary),
      best: state.best ? playSummary(state.best) : null,
      payments: payments.map((p) => ({
        playIndex: p.playIndex,
        amountEtb: p.amountEtb,
        method: p.method,
        reference: p.reference,
        status: p.status,
        createdAt: p.createdAt,
      })),
    });
  }),
);

quizRouter.post(
  "/daily/start",
  requireAuth,
  asyncHandler(async (req, res) => {
    const keys = periodKeys();
    const state = await playsToday(req.userId!, keys.day);

    if (state.active) {
      res.json({ startedAt: state.active.startedAt, playIndex: state.active.playIndex, paid: state.active.paid });
      return;
    }
    if (state.used >= MAX_PLAYS_PER_DAY) {
      throw new ApiError(
        429,
        `You have used all ${MAX_PLAYS_PER_DAY} plays for today. Retries reopen after midnight (East Africa Time).`,
        "DAILY_LIMIT_REACHED",
        { maxPlays: MAX_PLAYS_PER_DAY, playsUsed: state.used },
      );
    }
    if (state.used > 0) {
      throw new ApiError(
        402,
        `Your free play is done. A retry costs ${RETRY_PRICE_ETB} ETB.`,
        "PAYMENT_REQUIRED",
        { priceEtb: RETRY_PRICE_ETB, playsUsed: state.used, maxPlays: MAX_PLAYS_PER_DAY },
      );
    }

    const questions = await dailyQuestions(keys.day, 0);
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: req.userId!,
        day: keys.day,
        playIndex: 0,
        paid: false,
        weekKey: keys.weekKey,
        monthKey: keys.monthKey,
        questionIds: questions.map((q) => q.id),
        totalQuestions: questions.length,
        maxScore: MAX_SCORE,
      },
    });
    res.status(201).json({ startedAt: attempt.startedAt, playIndex: attempt.playIndex, paid: attempt.paid });
  }),
);

const retrySchema = z.object({
  method: z.enum(RETRY_METHODS),
  reference: z.string().trim().max(80).optional(),
});

/**
 * Starts a paid retry. The member pays the 3 ETB outside the app (Telebirr, CBE
 * Birr or cash) and confirms it here; the confirmation is stored with the play
 * so staff can review every retry.
 */
quizRouter.post(
  "/daily/retry",
  requireAuth,
  validate(retrySchema),
  asyncHandler(async (req, res) => {
    const keys = periodKeys();
    const state = await playsToday(req.userId!, keys.day);
    const { method, reference } = req.body as z.infer<typeof retrySchema>;

    if (state.active) throw ApiError.conflict("Finish the play you already started before paying for another one");
    if (state.used >= MAX_PLAYS_PER_DAY) {
      throw new ApiError(
        429,
        `You have used all ${MAX_PLAYS_PER_DAY} plays for today. Retries reopen after midnight (East Africa Time).`,
        "DAILY_LIMIT_REACHED",
        { maxPlays: MAX_PLAYS_PER_DAY, playsUsed: state.used },
      );
    }

    const questions = await dailyQuestions(keys.day, state.used);
    const { attempt, payment } = await prisma.$transaction(async (tx) => {
      const created = await tx.quizAttempt.create({
        data: {
          userId: req.userId!,
          day: keys.day,
          playIndex: state.used,
          paid: true,
          weekKey: keys.weekKey,
          monthKey: keys.monthKey,
          questionIds: questions.map((q) => q.id),
          totalQuestions: questions.length,
          maxScore: MAX_SCORE,
        },
      });
      const receipt = await tx.quizPayment.create({
        data: {
          userId: req.userId!,
          attemptId: created.id,
          day: keys.day,
          playIndex: created.playIndex,
          amountEtb: RETRY_PRICE_ETB,
          method,
          reference: reference ? reference : null,
        },
      });
      return { attempt: created, payment: receipt };
    });

    res.status(201).json({
      startedAt: attempt.startedAt,
      playIndex: attempt.playIndex,
      payment: {
        amountEtb: payment.amountEtb,
        method: payment.method,
        status: payment.status,
        createdAt: payment.createdAt,
      },
    });
  }),
);

const submitSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        // Index for CHOICE/TRUE_FALSE/IMAGE; array of option indexes for MATCHING.
        answer: z.union([z.number().int().min(0), z.array(z.number().int().min(0))]),
      }),
    )
    .max(QUESTIONS_PER_DAY),
});

quizRouter.post(
  "/daily/submit",
  requireAuth,
  validate(submitSchema),
  asyncHandler(async (req, res) => {
    const keys = periodKeys();
    const { answers } = req.body as z.infer<typeof submitSchema>;
    const attempt = await prisma.quizAttempt.findFirst({
      where: { userId: req.userId!, day: keys.day, completedAt: null },
      orderBy: { playIndex: "desc" },
    });
    if (!attempt) throw ApiError.badRequest("Start today's challenge before submitting");

    const durationMs = Date.now() - attempt.startedAt.getTime();
    const timedOut = durationMs > TIME_LIMIT_MS + 5000;

    const questions = await prisma.quizQuestion.findMany({
      where: { id: { in: attempt.questionIds } },
      select: { id: true, type: true, correctIndex: true, matchPairs: true, matchOptions: true },
    });
    const byId = new Map(questions.map((q) => [q.id, q]));

    let correct = 0;
    const graded = attempt.questionIds.map((id) => {
      const q = byId.get(id);
      const given = answers.find((a) => a.questionId === id)?.answer;
      let ok = false;
      if (q && given !== undefined && !timedOut) {
        if (q.type === "MATCHING") {
          // given[i] is the index (into matchOptions) chosen for left item i.
          const pairs = (Array.isArray(q.matchPairs) ? q.matchPairs : []) as Array<{ right: string }>;
          ok =
            Array.isArray(given) &&
            given.length === pairs.length &&
            given.every((v, i) => v === q.matchOptions.indexOf(pairs[i].right));
        } else {
          ok = typeof given === "number" && given === q.correctIndex;
        }
      }
      if (ok) correct++;
      // The chosen answer is kept too, so staff can review every scored answer.
      return { questionId: id, given: given ?? null, correct: ok };
    });

    const score = Math.round((correct / Math.max(1, attempt.questionIds.length)) * MAX_SCORE);
    const updated = await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        answers: graded,
        score,
        correctCount: correct,
        durationMs,
        completedAt: new Date(),
      },
    });

    res.json({
      score: updated.score,
      correctCount: updated.correctCount,
      totalQuestions: updated.totalQuestions,
      durationMs: updated.durationMs,
      timedOut,
      results: graded,
    });
  }),
);

type Period = "daily" | "weekly" | "monthly";

/**
 * Totals for one member across every finished play of the period. The points
 * are the per-question points those plays earned, so a member's whole period
 * counts, and the time is the time spent answering those questions. Shared
 * with the prize snapshot so awards follow the same ranking.
 */
export async function memberTotalsForPeriod(period: Period, key: string, take: number) {
  const filter =
    period === "daily"
      ? Prisma.sql`a."day" = ${key}`
      : period === "weekly"
        ? Prisma.sql`a."weekKey" = ${key}`
        : Prisma.sql`a."monthKey" = ${key}`;

  return prisma.$queryRaw<
    Array<{
      userId: string;
      username: string;
      displayName: string;
      points: number;
      correctCount: number;
      questions: number;
      plays: number;
      totalTimeMs: number;
      lastCompletedAt: Date;
    }>
  >(Prisma.sql`
    SELECT
      a."userId",
      u.username,
      u."displayName",
      SUM(a.score)::int AS points,
      SUM(a."correctCount")::int AS "correctCount",
      SUM(a."totalQuestions")::int AS questions,
      COUNT(*)::int AS plays,
      SUM(COALESCE(a."durationMs", 0))::int AS "totalTimeMs",
      MAX(a."completedAt") AS "lastCompletedAt"
    FROM "QuizAttempt" a
    JOIN "User" u ON u.id = a."userId"
    WHERE a."completedAt" IS NOT NULL AND ${filter}
    GROUP BY a."userId", u.username, u."displayName"
    ORDER BY points DESC, "totalTimeMs" ASC, "lastCompletedAt" ASC
    LIMIT ${take}
  `);
}

/**
 * Ranking: total points earned from answered questions over the period, with
 * total answering time as the tie-break so a slow accumulation never outranks
 * the same points earned faster.
 */
quizRouter.get(
  "/leaderboard",
  asyncHandler(async (req, res) => {
    const period = (["daily", "weekly", "monthly"] as const).includes(req.query.period as Period)
      ? (req.query.period as Period)
      : "daily";
    const keys = periodKeys();
    const key = period === "daily" ? keys.day : period === "weekly" ? keys.weekKey : keys.monthKey;
    const rows = await memberTotalsForPeriod(period, key, 100);

    res.json({
      period,
      key,
      range: periodRange(prizePeriodOf(period), key),
      entries: rows.map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        username: r.username,
        displayName: r.displayName,
        points: r.points,
        correctCount: r.correctCount,
        questions: r.questions,
        plays: r.plays,
        totalTimeMs: r.totalTimeMs,
        lastCompletedAt: r.lastCompletedAt,
      })),
    });
  }),
);

/**
 * The prize types members are playing for: every configured winning place per
 * period, plus the dates of the period running right now. Public, because the
 * leaderboard shows it as its own tab so a member knows what is at stake.
 */
quizRouter.get(
  "/prizes",
  asyncHandler(async (_req, res) => {
    const keys = periodKeys();
    const currentKeys = { DAILY: keys.day, WEEKLY: keys.weekKey, MONTHLY: keys.monthKey } as const;
    const tiers = await prisma.prizeTier.findMany({ orderBy: [{ period: "asc" }, { rank: "asc" }] });

    res.json({
      periods: PRIZE_PERIODS,
      currentKeys,
      ranges: {
        DAILY: periodRange("DAILY", currentKeys.DAILY),
        WEEKLY: periodRange("WEEKLY", currentKeys.WEEKLY),
        MONTHLY: periodRange("MONTHLY", currentKeys.MONTHLY),
      },
      tiers,
    });
  }),
);
