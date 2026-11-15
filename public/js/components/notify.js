// ============================================================================
// PawPrint — Notification engine (per doc §6.1)
// One entry point for all platform events. Writes an in-app notification and
// refreshes the bell badge immediately so the UI reacts without a reload.
// ============================================================================

// Notification preferences (doc §6.1) — stored per user in localStorage
const PREF_MAP = {
  competition: 'competition',
  community: 'community',
  business: 'business',
  booking: 'business',
  reward: 'rewards',
  moderation: null,   // moderation notifications are essential
  system: null,
};

function shouldNotify(type, userId) {
  const category = PREF_MAP[type] || null;
  if (!category) return true;
  try {
    const raw = localStorage.getItem(`pawprint_notif_prefs_${userId}`);
    const prefs = raw ? JSON.parse(raw) : {};
    // Default: everything enabled
    return prefs[category] !== false;
  } catch (e) {
    return true;
  }
}

export async function pushNotification({ userId, title, body, type = 'system', link = null }) {
  if (!userId) return;
  if (!shouldNotify(type, userId)) return;
  const { dbPut } = await import('../db.js');
  await dbPut('notifications', {
    userId,
    title,
    body,
    type,
    link,
    read: false,
    createdAt: new Date().toISOString(),
  });
  // Live badge refresh if the bell is initialised
  try {
    const { NotificationUI } = await import('./notification.js');
    const Auth = (await import('../auth.js')).Auth;
    if (Auth.user && Auth.user.id === userId) await NotificationUI.refreshBadge();
  } catch (e) { /* badge is best-effort */ }
}

/** Notify every user with the given role (e.g. all pet owners). */
export async function notifyRole(role, payload) {
  const { dbGetAll } = await import('../db.js');
  const users = await dbGetAll('users');
  const targets = users.filter((u) => u.role === role && !u.suspended);
  await Promise.all(targets.map((u) => pushNotification({ ...payload, userId: u.id })));
  return targets.length;
}

/** Notify everyone who follows this account about a new post (doc §6.1). */
export async function notifyFollowers(userId, payload) {
  if (!userId) return 0;
  const { dbGetByIndex } = await import('../db.js');
  const follows = await dbGetByIndex('follows', 'followeeId', userId);
  const followers = follows.filter((f) => f.followeeType === 'user');
  await Promise.all(followers.map((f) => pushNotification({ ...payload, userId: f.followerId, type: 'community' })));
  return followers.length;
}
