import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";

/** Append an audit-log entry. Never throws (auditing must not break requests). */
export async function audit(entry: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write entry", entry.action, error);
  }
}
