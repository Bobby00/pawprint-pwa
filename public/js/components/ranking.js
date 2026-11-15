// ============================================================================
// PawPrint — Business ranking engine (doc §5.13)
// Configurable weighted scoring, fully auditable: every business stores its
// own breakdown and the inputs it was computed from.
//
// Weights (doc §5.13 proposed model, calibration pending):
//   Verified satisfaction ....... 35%  (rating, 5-star scale)
//   Verified reviews ............ 25%  (volume + quality, capped)
//   Completed transactions ....... 20%  (bookings confirmed/completed)
//   Customer retention ........... 10%  (repeat customers)
//   Responsiveness ............... 10%  (share of reviews answered)
// ============================================================================

export const RANKING_WEIGHTS = {
  satisfaction: 35,
  reviews: 25,
  transactions: 20,
  retention: 10,
  responsiveness: 10,
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/** Compute the weighted reputation score for one business. */
export function computeScore(business, stats) {
  const { bookings = [], reviews = [], repeatCustomers = 0, uniqueCustomers = 0 } = stats;

  const rating = Number(business.rating) || 0;
  const satisfaction = (clamp(rating, 0, 5) / 5) * RANKING_WEIGHTS.satisfaction;

  // Reviews: quality (avg rating) × volume (log-scaled, saturates at 100)
  const reviewCount = reviews.length;
  const quality = reviewCount ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviewCount : rating;
  const volume = clamp(Math.log10(Math.max(reviewCount, business.reviewsCount || 0) + 1) / Math.log10(101), 0, 1);
  const reviewsScore = (clamp(quality, 0, 5) / 5) * RANKING_WEIGHTS.reviews * (0.4 + 0.6 * volume);

  const confirmedPlus = bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed').length;
  const transactions = clamp(confirmedPlus / 10, 0, 1) * RANKING_WEIGHTS.transactions;

  const retention = (uniqueCustomers > 0 ? repeatCustomers / uniqueCustomers : 0) * RANKING_WEIGHTS.retention;

  const responses = reviews.filter((r) => r.response).length;
  const responsiveness = (reviewCount ? responses / reviewCount : 0) * RANKING_WEIGHTS.responsiveness;

  const score = Math.round((satisfaction + reviewsScore + transactions + retention + responsiveness) * 10) / 10;

  return {
    score,
    breakdown: {
      satisfaction: Math.round(satisfaction * 10) / 10,
      reviews: Math.round(reviewsScore * 10) / 10,
      transactions: Math.round(transactions * 10) / 10,
      retention: Math.round(retention * 10) / 10,
      responsiveness: Math.round(responsiveness * 10) / 10,
    },
    inputs: {
      rating,
      reviewCount: reviewCount || business.reviewsCount || 0,
      confirmedBookings: confirmedPlus,
      repeatCustomers,
      uniqueCustomers,
      responses,
    },
    weights: { ...RANKING_WEIGHTS },
  };
}

/**
 * Recompute rankings for all businesses, stamp positions and movement.
 * Persists updated ranking info on each business record.
 */
export async function recalcAllRankings() {
  const { dbGetAll, dbPut } = await import('../db.js');
  const [businesses, bookings, reviews] = await Promise.all([
    dbGetAll('businesses'),
    dbGetAll('bookings'),
    dbGetAll('reviews'),
  ]);

  const statsFor = (businessId) => {
    const bizBookings = bookings.filter((b) => b.businessId === businessId);
    const bizReviews = reviews.filter((r) => r.businessId === businessId);
    const usersWith = new Map();
    bizBookings
      .filter((b) => b.status === 'confirmed' || b.status === 'completed')
      .forEach((b) => usersWith.set(b.userId, (usersWith.get(b.userId) || 0) + 1));
    const uniqueCustomers = usersWith.size;
    const repeatCustomers = [...usersWith.values()].filter((n) => n > 1).length;
    return { bookings: bizBookings, reviews: bizReviews, repeatCustomers, uniqueCustomers };
  };

  const scored = businesses.map((b) => ({ business: b, result: computeScore(b, statsFor(b.id)) }));
  scored.sort((a, b) => b.result.score - a.result.score);

  const results = [];
  for (let i = 0; i < scored.length; i += 1) {
    const { business, result } = scored[i];
    const previous = business.ranking && business.ranking.position ? business.ranking.position : null;
    const position = i + 1;
    const movement = previous === null ? 'steady' : (previous > position ? 'up' : previous < position ? 'down' : 'steady');
    const season = new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) + ' Season';
    business.ranking = { position, movement, score: result.score, season };
    business.rankingBreakdown = result.breakdown;
    business.rankingInputs = result.inputs;
    await dbPut('businesses', business);
    results.push({ business, result, position, movement });
  }
  return results;
}
