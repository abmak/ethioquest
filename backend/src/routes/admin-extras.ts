import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/async-handler";
import { ApiError } from "../lib/errors";
import { requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { PERMISSIONS, PERMISSION_KEYS, roleExists } from "../lib/permissions";
import { recordAudit } from "../lib/audit";

/**
 * Staff surfaces added on top of the original admin router: member creation,
 * role and permission management, the audit trail and the per-question quiz
 * answer report. Mounted inside adminRouter so requireAuth already ran.
 */
export const adminExtrasRouter = Router();

// ---------------------------------------------------------------------------
// Member creation
// ---------------------------------------------------------------------------

const createMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_]+$/, "Use letters, numbers and underscores"),
  displayName: z.string().trim().min(1).max(60),
  password: z.string().min(8).max(128),
  role: z.string().trim().min(1).max(40).default("USER"),
});

/** Creates an account from the admin workspace with any existing role. */
adminExtrasRouter.post(
  "/users",
  requirePermission("members.manage"),
  validate(createMemberSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof createMemberSchema>;
    if (!(await roleExists(input.role))) throw ApiError.badRequest("That role does not exist");

    const clash = await prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { username: input.username }] },
      select: { email: true },
    });
    if (clash) {
      throw ApiError.conflict(
        clash.email === input.email ? "An account with this email already exists" : "That username is taken",
      );
    }

    const user = await prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        displayName: input.displayName,
        passwordHash: await bcrypt.hash(input.password, 12),
        role: input.role,
      },
      select: { id: true, email: true, username: true, displayName: true, role: true, createdAt: true },
    });
    await recordAudit(req, {
      action: "member.create",
      targetType: "user",
      targetId: user.id,
      detail: { email: user.email, username: user.username, role: user.role },
    });
    res.status(201).json({ user });
  }),
);

// ---------------------------------------------------------------------------
// Roles and permissions
// ---------------------------------------------------------------------------

const roleInputSchema = z.object({
  name: z
    .string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(30)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Use capital letters, numbers and underscores"),
  label: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional().nullable(),
  permissions: z.array(z.string()).default([]),
});

const roleUpdateSchema = roleInputSchema.omit({ name: true }).partial();

/** Rejects unknown capability keys and removes duplicates. */
function cleanPermissions(list: string[]): string[] {
  const unknown = list.filter((key) => !PERMISSION_KEYS.includes(key));
  if (unknown.length > 0) throw ApiError.badRequest(`Unknown permission: ${unknown.join(", ")}`);
  return [...new Set(list)];
}

/** Every role with its capability list and member count, plus the catalogue. */
adminExtrasRouter.get(
  "/roles",
  requirePermission("members.view"),
  asyncHandler(async (_req, res) => {
    const [roles, counts] = await Promise.all([
      prisma.role.findMany({ orderBy: [{ builtIn: "desc" }, { name: "asc" }] }),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    ]);
    const countBy = new Map(counts.map((row) => [row.role, row._count._all]));
    res.json({
      permissions: PERMISSIONS,
      roles: roles.map((role) => ({ ...role, members: countBy.get(role.name) ?? 0 })),
    });
  }),
);

adminExtrasRouter.post(
  "/roles",
  requirePermission("roles.manage"),
  validate(roleInputSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof roleInputSchema>;
    if (await roleExists(input.name)) throw ApiError.conflict("A role with that name already exists");
    const role = await prisma.role.create({
      data: {
        name: input.name,
        label: input.label,
        description: input.description ?? null,
        permissions: cleanPermissions(input.permissions),
        builtIn: false,
      },
    });
    await recordAudit(req, {
      action: "role.create",
      targetType: "role",
      targetId: role.id,
      detail: { name: role.name, permissions: role.permissions },
    });
    res.status(201).json({ role });
  }),
);

adminExtrasRouter.patch(
  "/roles/:name",
  requirePermission("roles.manage"),
  validate(roleUpdateSchema),
  asyncHandler(async (req, res) => {
    const role = await prisma.role.findUnique({ where: { name: req.params.name } });
    if (!role) throw ApiError.notFound("Role not found");
    const input = req.body as z.infer<typeof roleUpdateSchema>;
    if (role.name === "ADMIN" && input.permissions && input.permissions.length !== PERMISSION_KEYS.length) {
      throw ApiError.badRequest("The administrator role always keeps every permission");
    }

    const updated = await prisma.role.update({
      where: { id: role.id },
      data: {
        label: input.label ?? role.label,
        description: input.description === undefined ? role.description : input.description,
        permissions: input.permissions ? cleanPermissions(input.permissions) : role.permissions,
      },
    });
    await recordAudit(req, {
      action: "role.update",
      targetType: "role",
      targetId: role.id,
      detail: { name: role.name, permissions: updated.permissions },
    });
    res.json({ role: updated });
  }),
);

adminExtrasRouter.delete(
  "/roles/:name",
  requirePermission("roles.manage"),
  asyncHandler(async (req, res) => {
    const role = await prisma.role.findUnique({ where: { name: req.params.name } });
    if (!role) throw ApiError.notFound("Role not found");
    if (role.builtIn) throw ApiError.badRequest("Built-in roles cannot be deleted");
    const members = await prisma.user.count({ where: { role: role.name } });
    if (members > 0) throw ApiError.conflict("Move those members to another role before deleting it");

    await prisma.role.delete({ where: { id: role.id } });
    await recordAudit(req, {
      action: "role.delete",
      targetType: "role",
      targetId: role.id,
      detail: { name: role.name },
    });
    res.status(204).end();
  }),
);

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

/** Newest staff actions first, searchable by actor, action or target. */
adminExtrasRouter.get(
  "/audit",
  requirePermission("audit.view"),
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const action = typeof req.query.action === "string" ? req.query.action.trim() : "";

    const where: Prisma.AuditLogWhereInput = {
      ...(action ? { action } : {}),
      ...(q
        ? {
            OR: [
              { actorName: { contains: q, mode: "insensitive" } },
              { actorRole: { contains: q, mode: "insensitive" } },
              { action: { contains: q, mode: "insensitive" } },
              { targetType: { contains: q, mode: "insensitive" } },
              { targetId: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [entries, total, actions] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    ]);

    res.json({ entries, total, actions: actions.map((row) => row.action) });
  }),
);

// ---------------------------------------------------------------------------
// Per-question answer report
// ---------------------------------------------------------------------------

type StoredAnswer = { questionId: string; given?: number | number[] | null; correct?: boolean };

function choiceText(options: string[] | null | undefined, index: number | undefined): string {
  if (typeof index !== "number" || !options) return "—";
  return options[index] ?? "—";
}

function matchingGiven(pairs: Array<{ left: string; right: string }>, choices: string[], given: unknown): string {
  if (!Array.isArray(given)) return "No answer";
  return pairs
    .map((pair, index) => `${pair.left} → ${choices[Number(given[index])] ?? "—"}`)
    .join("; ");
}

function matchingCorrect(pairs: Array<{ left: string; right: string }>): string {
  return pairs.map((pair) => `${pair.left} → ${pair.right}`).join("; ");
}

/**
 * Every completed play in the selected slice with each question's prompt, the
 * answer the member gave, the right answer and whether it scored. Also returns
 * the questions missed most often so staff can spot a bad or unfair question.
 */
adminExtrasRouter.get(
  "/quiz-answers",
  requirePermission("quiz.report"),
  asyncHandler(async (req, res) => {
    const day =
      typeof req.query.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.day) ? req.query.day : "";
    const userId = typeof req.query.userId === "string" ? req.query.userId : "";
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    const where: Prisma.QuizAttemptWhereInput = {
      completedAt: { not: null },
      ...(day ? { day } : {}),
      ...(userId ? { userId } : {}),
      ...(q
        ? {
            user: {
              is: {
                OR: [
                  { displayName: { contains: q, mode: "insensitive" } },
                  { username: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                ],
              },
            },
          }
        : {}),
    };

    const attempts = await prisma.quizAttempt.findMany({
      where,
      orderBy: { completedAt: "desc" },
      take: 50,
      select: {
        id: true,
        userId: true,
        day: true,
        playIndex: true,
        score: true,
        correctCount: true,
        totalQuestions: true,
        durationMs: true,
        completedAt: true,
        answers: true,
        questionIds: true,
        user: { select: { username: true, displayName: true, email: true, role: true } },
      },
    });

    const ids = [...new Set(attempts.flatMap((attempt) => attempt.questionIds))];
    const questions = await prisma.quizQuestion.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        prompt: true,
        category: true,
        type: true,
        options: true,
        correctIndex: true,
        matchPairs: true,
        matchOptions: true,
      },
    });
    const byId = new Map(questions.map((question) => [question.id, question]));

    const missed = new Map<string, { prompt: string; category: string; wrong: number; total: number }>();

    const entries = attempts.map((attempt) => {
      const stored = Array.isArray(attempt.answers) ? (attempt.answers as StoredAnswer[]) : [];
      const rows = attempt.questionIds.map((questionId) => {
        const question = byId.get(questionId);
        const answer = stored.find((row) => row.questionId === questionId);
        const given = answer?.given;
        const correct = Boolean(answer?.correct);
        const pairs = Array.isArray(question?.matchPairs)
          ? (question.matchPairs as Array<{ left: string; right: string }>)
          : [];

        const givenText =
          question?.type === "MATCHING"
            ? matchingGiven(pairs, question.matchOptions, given)
            : choiceText(question?.options, typeof given === "number" ? given : undefined);
        const correctText =
          question?.type === "MATCHING"
            ? matchingCorrect(pairs)
            : choiceText(question?.options, question?.correctIndex ?? undefined);

        if (question) {
          const bucket = missed.get(question.id) ?? {
            prompt: question.prompt,
            category: question.category,
            wrong: 0,
            total: 0,
          };
          bucket.total += 1;
          if (!correct) bucket.wrong += 1;
          missed.set(question.id, bucket);
        }

        return {
          questionId,
          prompt: question?.prompt ?? "Question no longer in the pool",
          category: question?.category ?? "—",
          type: question?.type ?? "CHOICE",
          givenText,
          correctText,
          correct,
        };
      });

      return {
        id: attempt.id,
        userId: attempt.userId,
        user: attempt.user,
        day: attempt.day,
        playIndex: attempt.playIndex,
        score: attempt.score,
        correctCount: attempt.correctCount,
        totalQuestions: attempt.totalQuestions,
        durationMs: attempt.durationMs,
        completedAt: attempt.completedAt,
        answers: rows,
      };
    });

    const totalAnswers = entries.reduce((sum, entry) => sum + entry.answers.length, 0);
    const correctAnswers = entries.reduce(
      (sum, entry) => sum + entry.answers.filter((answer) => answer.correct).length,
      0,
    );

    res.json({
      day,
      filters: { userId, q },
      summary: {
        plays: entries.length,
        questions: totalAnswers,
        correct: correctAnswers,
        accuracy: totalAnswers === 0 ? 0 : Math.round((correctAnswers / totalAnswers) * 100),
      },
      hardest: [...missed.entries()]
        .map(([questionId, stat]) => ({
          questionId,
          ...stat,
          accuracy: stat.total === 0 ? 0 : Math.round(((stat.total - stat.wrong) / stat.total) * 100),
        }))
        .filter((row) => row.total >= 1)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 8),
      entries,
    });
  }),
);
