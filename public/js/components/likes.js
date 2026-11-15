// ============================================================================
// PawPrint — Likes (doc §5.9: react to posts, §5.17: helpful reviews)
// Persisted per user per target (a post or a review). toggle updates the
// ledger row AND the target's counter; callers patch the DOM live.
// ============================================================================

export const Likes = {
  /** Ids of target rows this user has liked within a table. */
  async likedIds(userId, table, idField) {
    const { dbGetByIndex } = await import('../db.js');
    if (!userId) return new Set();
    const rows = await dbGetByIndex('likes', 'userId', userId);
    return new Set(rows.map((r) => r[idField || 'targetId']));
  },

  async likedIdsFor(userId, targets) {
    const { dbGetByIndex } = await import('../db.js');
    if (!userId) return new Set();
    const rows = await dbGetByIndex('likes', 'userId', userId);
    const ids = new Set(rows.map((r) => r.targetId));
    return new Set((targets || []).map((t) => t.id).filter((id) => ids.has(id)));
  },

  /** Likes stored against a single target id. */
  async forTarget(userId, targetId) {
    const { dbGetByIndex } = await import('../db.js');
    if (!userId) return false;
    const rows = await dbGetByIndex('likes', 'targetId', targetId);
    return rows.some((r) => r.userId === userId);
  },

  /**
   * Toggle the like for any target with a numeric id.
   * table: 'posts' (or any table with `reactions` and `id`)
   * Returns { liked, count }
   */
  async toggle(userId, target, table = 'posts') {
    const { dbGetByIndex, dbPut, dbDelete, dbGet } = await import('../db.js');
    const rows = await dbGetByIndex('likes', 'targetId', target.id);
    const existing = rows.find((r) => r.userId === userId);

    if (existing) {
      await dbDelete('likes', existing.id);
      target.reactions = Math.max(0, (target.reactions || 0) - 1);
    } else {
      await dbPut('likes', { targetId: target.id, table, userId, createdAt: new Date().toISOString() });
      target.reactions = (target.reactions || 0) + 1;
    }

    if (table === 'posts') await dbPut('posts', target);
    else if (table === 'reviews') await dbPut('reviews', target);

    return { liked: !existing, count: target.reactions };
  },
};

