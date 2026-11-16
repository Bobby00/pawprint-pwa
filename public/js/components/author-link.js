// ============================================================================
// PawPrint — Author linking
// Businesses resolve to /business/:id; everyone else to /u/:id.
// Uses a lazy one-time cache of the businesses table.
// ============================================================================

let cachedBusinesses = null;

async function ensureBusinesses() {
  if (cachedBusinesses) return cachedBusinesses;
  try {
    const { dbGetAll } = await import('../db.js');
    cachedBusinesses = await dbGetAll('businesses');
  } catch (e) {
    cachedBusinesses = [];
  }
  return cachedBusinesses;
}

/** Public href for any post author name. */

export async function authorLink(name, userId) {
  const businesses = await ensureBusinesses();
  const match = businesses.find((b) => b.name === name);
  if (match) return { href: `/business/${match.id}`, label: name };
  const id = Number(userId);
  return { href: `/u/${id}`, label: name };
}

/** Pre-resolve author links for a batch of posts. */
export async function resolveLinksFor(items) {
  const businesses = await ensureBusinesses();
  return items.map((item) => {
    const match = businesses.find((b) => b.name === item.authorName);
    if (match) return { ...item, _author: { href: `/business/${match.id}`, label: item.authorName } };
    return { ...item, _author: { href: `/u/${item.authorId}`, label: item.authorName } };
  });
}

/** Synchronous helper: just builds the href. Caller must have already ensured businesses. */
export function hrefFor(name, userId, businessMatch) {
  if (businessMatch) return `/business/${businessMatch.id}`;
  return `/u/${Number(userId)}`;
}
