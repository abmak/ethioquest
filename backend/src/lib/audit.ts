import type { Request } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { logger } from "./logger";

export interface AuditEntry {
  action: string;
  targetType: string;
  targetId?: string | null;
  detail?: Prisma.InputJsonValue;
}

/**
 * Appends a staff action to the audit trail. The actor's name and role are
 * snapshotted so the entry stays meaningful after the account is removed.
 * A logging failure is reported but never fails the action that caused it.
 */
export async function recordAudit(req: Request, entry: AuditEntry): Promise<void> {
  try {
    const actor = req.userId
      ? await prisma.user.findUnique({ where: { id: req.userId }, select: { displayName: true } })
      : null;
    await prisma.auditLog.create({
      data: {
        actorId: req.userId ?? null,
        actorName: actor?.displayName ?? "System",
        actorRole: req.userRole ?? "",
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        detail: entry.detail,
      },
    });
  } catch (error) {
    logger.warn(`Audit entry failed for ${entry.action}: ${(error as Error).message}`);
  }
}
