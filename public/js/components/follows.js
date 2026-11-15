// ============================================================================
// PawPrint — Following system (doc §5.9: follow users & businesses)
// Toggle follows persisted in the `follows` store; followed-first ordering
// for community feeds; follower counts for businesses and users.
// ============================================================================

import { escapeHtml } from './sanitize.js';

export const Follows = {
  /** My follow rows. */
  async mine(userId) {
    const { dbGetByIndex } = await import('../db.js');
    if (!userId) return [];
    return dbGetByIndex('follows', 'followerId', userId);
  },

  /** Set of ids I follow (per type) for quick checks. */
  async followingIds(userId, type) {
    const rows = await this.mine(userId);
    return rows.filter((r) => r.followeeType === type).map((r) => r.followeeId);
  },

  /** Counts for a single followee. */
  async count(type, id) {
    const { dbGetAll } = await import('../db.js');
    const all = await dbGetAll('follows');
    return all.filter((f) => f.followeeType === type && f.followeeId === id).length;
  },

  /** Toggle a follow. Returns true when now following. */
  async toggle(userId, type, id) {
    const { dbGetByIndex, dbPut, dbDelete } = await import('../db.js');
    const rows = await dbGetByIndex('follows', 'followerId', userId);
    const existing = rows.find((r) => r.followeeType === type && r.followeeId === id);
    if (existing) {
      await dbDelete('follows', existing.id);
      return false;
    }
    await dbPut('follows', { followerId: userId, followeeType: type, followeeId: id, createdAt: new Date().toISOString() });
    return true;
  },

  /** Sort posts followed-first, then recency. Mutates and returns the array. */
  boostFollowed(posts, followedUserIds) {
    const set = new Set(followedUserIds);
    return posts
      .map((p) => ({ p, boost: set.has(p.authorId) ? 1 : 0 }))
      .sort((a, b) => (b.boost - a.boost) || (new Date(b.p.createdAt) - new Date(a.p.createdAt)))
      .map(({ p }) => p);
  },

  /** Inline "Follow" button HTML for author rows in feeds. */
  buttonHtml(isFollowed, dataAttrs) {
    const attrs = Object.entries(dataAttrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<button class="pp-follow-btn ${isFollowed ? 'is-followed' : ''}" ${attrs}>${isFollowed ? 'Following' : 'Follow'}</button>`;
  },
};
