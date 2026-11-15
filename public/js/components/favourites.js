// ============================================================================
// PawPrint — Favourites (saved businesses), persisted in IndexedDB
// ============================================================================

export const Favourites = {
  /** All business ids saved by this user. */
  async list(userId) {
    const { dbGetByIndex } = await import('../db.js');
    if (!userId) return [];
    const rows = await dbGetByIndex('favourites', 'userId', userId);
    return rows.map((r) => r.businessId);
  },

  async isSaved(userId, businessId) {
    const saved = await this.list(userId);
    return saved.includes(businessId);
  },

  /** Toggle. Returns true when the business is now saved. */
  async toggle(userId, businessId) {
    const { dbGetByIndex, dbPut, dbDelete } = await import('../db.js');
    const rows = await dbGetByIndex('favourites', 'userId', userId);
    const existing = rows.find((r) => r.businessId === businessId);
    if (existing) {
      await dbDelete('favourites', existing.id);
      return false;
    }
    await dbPut('favourites', { userId, businessId, createdAt: new Date().toISOString() });
    return true;
  },
};
