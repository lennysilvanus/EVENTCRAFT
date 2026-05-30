import { prisma } from "./prisma";

export type AuditAction =
  | "USER_SUSPENDED"
  | "USER_BANNED"
  | "USER_ACTIVATED"
  | "USER_SESSION_REVOKED"
  | "USER_ROLE_CHANGED"
  | "USER_DATA_ERASED"
  | "EVENT_UNPUBLISHED"
  | "EVENT_CANCELLED"
  | "EVENT_DELETED"
  | "GUEST_STATUS_CHANGED"
  | "GUEST_REMOVED"
  | "ACCOUNT_DELETED"
  | "PLAN_CHANGED"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "ADMIN_ACTION";

export async function logAudit({
  action,
  actorId,
  actorEmail,
  targetId,
  targetType,
  targetLabel,
  metadata,
  ip,
}: {
  action: AuditAction;
  actorId: string;
  actorEmail: string;
  targetId?: string;
  targetType?: string;
  targetLabel?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        actorId,
        actorEmail,
        targetId,
        targetType,
        targetLabel,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ip,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}
