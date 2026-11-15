// ============================================================================
// PawPrint — PawPoints engine (ledger-based, per doc §5.22)
// Every award/spend writes a transaction record. Duplicate awards are
// prevented by matching (userId, source, referenceId). Balances are always
// computed from the ledger, never stored as a mutable total.
// ============================================================================

export const POINT_SCHEDULE = {
  completePetProfile: { amount: 50, source: 'Complete pet profile' },
  verifyPetInfo: { amount: 30, source: 'Verify pet information' },
  completeChallenge: { amount: 100, source: 'Complete a community challenge' },
  attendEvent: { amount: 75, source: 'Attend a verified event' },
  verifiedBooking: { amount: 50, source: 'Complete a verified booking' },
  verifiedReview: { amount: 30, source: 'Submit a helpful verified review' },
  referActivatedOwner: { amount: 100, source: 'Refer a new activated pet owner' },
};

/** Floating "+N PawPoints" chip whenever the signed-in user earns points. */
export function showPointsAnimation(amount) {
  if (typeof document === 'undefined') return;
  const chip = document.createElement('div');
  chip.className = 'pp-points-fx';
  chip.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 0-5 5v3.27a1 1 0 0 0 .69.96l5.25 1.7a1 1 0 0 0 .62-.04l4.72-1.53a1 1 0 0 1 .63.04l5.05 1.63a1 1 0 0 0 .69-.96V15a5 5 0 0 0-5-5z"/></svg> +${amount} PawPoints`;
  document.body.appendChild(chip);
  setTimeout(() => chip.remove(), 2400);
}

/**
 * Award points if this exact award hasn't been given before.
 * Returns { awarded: boolean, balance: number }
 */
export async function awardPoints({ userId, amount, source, referenceId }) {
  const { dbGetByIndex, dbPut } = await import('../db.js');
  const ledger = await dbGetByIndex('pointsLedger', 'userId', userId);
  const duplicate = ledger.some(
    (t) => t.source === source && t.referenceId === referenceId && t.type === 'earn'
  );
  if (duplicate) return { awarded: false, balance: await getPointsBalance(userId) };

  await dbPut('pointsLedger', {
    userId,
    type: 'earn',
    amount,
    source,
    referenceId,
    createdAt: new Date().toISOString(),
    // Loyalty points expire 12 months after they are earned (doc §5.22)
    expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    status: 'completed',
  });

  // Animate for the signed-in user and keep the topbar pill honest
  try {
    const Auth = (await import('../auth.js')).Auth;
    if (Auth.user && Auth.user.id === userId) {
      showPointsAnimation(amount);
      const Nav = (await import('./nav.js')).Nav;
      await Nav.refreshPointsPill();
    }
  } catch (e) { /* animation is best-effort */ }

  const { pushNotification } = await import('./notify.js');
  await pushNotification({
    userId,
    title: 'PawPoints earned',
    body: `You earned ${amount} PawPoints — ${source}.`,
    type: 'reward',
  });

  return { awarded: true, balance: await getPointsBalance(userId) };
}

/**
 * Spend points (e.g. paid competition entry). Refused when the balance is
 * insufficient. Returns { spent: boolean, balance: number }
 */
export async function spendPoints({ userId, amount, source, referenceId }) {
  const { dbGetByIndex, dbPut } = await import('../db.js');
  const balance = await getPointsBalance(userId);
  if (balance < amount) return { spent: false, balance };

  await dbPut('pointsLedger', {
    userId,
    type: 'spend',
    amount,
    source,
    referenceId,
    createdAt: new Date().toISOString(),
    status: 'completed',
  });

  try {
    const Auth = (await import('../auth.js')).Auth;
    if (Auth.user && Auth.user.id === userId) {
      showPointsAnimation(-amount);
      const Nav = (await import('./nav.js')).Nav;
      await Nav.refreshPointsPill();
    }
  } catch (e) { /* animation is best-effort */ }

  const { pushNotification } = await import('./notify.js');
  await pushNotification({
    userId,
    title: 'PawPoints redeemed',
    body: `${amount} PawPoints were used — ${source}.`,
    type: 'reward',
  });

  return { spent: true, balance: balance - amount };
}

/** Balance computed from valid, unexpired ledger transactions. */
export async function getPointsBalance(userId) {
  const { dbGetByIndex } = await import('../db.js');
  const ledger = await dbGetByIndex('pointsLedger', 'userId', userId);
  const now = Date.now();
  return ledger
    .filter((t) => t.status !== 'reversed')
    .filter((t) => !(t.type === 'earn' && t.expiresAt && new Date(t.expiresAt).getTime() <= now))
    .reduce((sum, t) => sum + (t.type === 'earn' ? t.amount : -t.amount), 0);
}

/** Points expiring within `days` days (for "use them before they go" nudges). */
export async function getExpiringSoon(userId, days = 30) {
  const { dbGetByIndex } = await import('../db.js');
  const ledger = await dbGetByIndex('pointsLedger', 'userId', userId);
  const now = Date.now();
  const horizon = now + days * 86400000;
  return ledger
    .filter((t) => t.status !== 'reversed' && t.type === 'earn' && t.expiresAt)
    .filter((t) => {
      const exp = new Date(t.expiresAt).getTime();
      return exp > now && exp <= horizon;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}
