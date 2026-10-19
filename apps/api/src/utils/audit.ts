import { prisma } from '../config/prisma';

/** Catat aktivitas penting untuk audit (PRD §9 Auditability). */
export async function logActivity(
  userId: number | null,
  action: string,
  entityType: string,
  entityId?: number | null
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { userId: userId ?? undefined, action, entityType, entityId: entityId ?? undefined },
    });
  } catch {
    // audit log tidak boleh menggagalkan request utama
  }
}
