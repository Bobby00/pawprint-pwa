// ============================================================================
// PawPrint — Audit log (doc §10.7: critical operations must be recorded)
// Admin actions on users, businesses, content, competitions and rewards are
// written here with actor, target and timestamp.
// ============================================================================

/**
 * Record an administrative action.
 * @param {object} actor — the admin user performing the action
 * @param {string} action — short verb, e.g. 'verify_business'
 * @param {string} target — human-readable target, e.g. 'PawCare Veterinary Clinic'
 */
export async function audit(actor, action, target) {
  try {
    const { dbPut } = await import('../db.js');
    await dbPut('auditLogs', {
      actorId: actor?.id || null,
      actorName: actor?.name || 'System',
      action,
      target,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    // Auditing must never break the operation it records
    console.warn('[audit] failed to record:', e);
  }
}
