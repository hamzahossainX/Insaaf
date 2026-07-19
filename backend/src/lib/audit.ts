import { Prisma } from "@prisma/client";

/**
 * Every Create/Update/Delete is written to AuditLog(user_id, action, entity,
 * entity_id, timestamp, diff). Call this inside the same $transaction as the
 * mutation it records.
 */
export async function writeAuditLog(
  tx: Prisma.TransactionClient,
  params: {
    user_id: string;
    action: "CREATE" | "UPDATE" | "DELETE";
    entity: string;
    entity_id: string;
    diff?: any;
  }
) {
  await tx.auditLog.create({
    data: {
      user_id: params.user_id,
      action: params.action,
      entity: params.entity,
      entity_id: params.entity_id,
      diff: params.diff as any,
    },
  });
}
