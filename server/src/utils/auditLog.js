import { AuditLog } from '../models/AuditLog.js';

// Fire-and-forget, same pattern as createNotification — an audit log write
// failing should never block the admin action that triggered it.
export async function logAdminAction({ actor, action, targetType, targetId, details }) {
  try {
    await AuditLog.create({
      actor,
      action,
      targetType: targetType ?? null,
      targetId: targetId ?? null,
      details: details ?? null,
    });
  } catch {
    // best-effort
  }
}
