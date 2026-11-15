// ============================================================================
// PawPrint — Business profile screen
// Directory listing with gallery, contact/socials, clickable services that
// open a booking flow (doc §5.19 booking request lifecycle), and working
// review submission (doc §5.17).
// ============================================================================

import { icon } from '../components/icons.js';
import { escapeHtml } from '../components/sanitize.js';
import { Favourites } from '../components/favourites.js';

const GALLERY = ['/images/pawprint-vet-clinic.jpg', '/images/pawprint-dog-park.jpg', '/images/pawprint-cat-profile.jpg', '/images/pawprint-arena-dog.jpg'];

export const BusinessProfilePage = {
  pageTitle: 'Business',

  async render(container, { id }) {
    const { dbGet, dbGetByIndex, dbPut } = await import('../db.js');
    const business = await dbGet('businesses', Number(id));
    if (!business) {
      container.innerHTML = '<div class="pp-standard-page"><p class="pp-empty-state"><span class="empty-title">Business not found</span>This listing does not exist.</p></div>';
      return;
    }
    // Track profile views for owner analytics (doc §5.27)
    business.profileViews = (business.profileViews || 0) + 1;
    await dbPut('businesses', business);
    const user = window.Auth.user;
    const reviews = await dbGetByIndex('reviews', 'businessId', business.id);
    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const myReview = user ? reviews.find((r) => r.userId === user.id) : null;
    const isSaved = user ? await Favourites.isSaved(user.id, business.id) : false;
    const { Follows } = await import('../components/follows.js');
    const followedIds = user ? await Follows.followingIds(user.id, 'business') : [];
    const isFollowing = followedIds.includes(business.id);
    const followers = await Follows.count('business', business.id);
    const { Likes } = await import('../components/likes.js');
    const likedReviewIds = await Likes.likedIdsFor(user.id, reviews);
    const image = GALLERY[business.id % GALLERY.length];
    const gallery = [image, ...GALLERY.filter((g) => g !== image)].slice(0, 3);
    const socials = business.socials || {};

    container.innerHTML = `
      <div class="pp-standard-page">
        <div class="pp-page-heading"><div><div class="pp-eyebrow"><span></span>A PAWPRINT BUSINESS</div><h1>${business.name.replace(/\s\w+$/, '')} <span>${business.name.split(' ').slice(-1)}</span></h1></div></div>

        <section class="pp-arena-feature">
          <div class="pp-arena-feature-image">
            <img src="${image}" alt="${business.name}" />
            ${business.verification === 'verified' ? `<span class="pp-arena-live"><span></span> VERIFIED</span>` : ''}
          </div>
          <div class="pp-arena-feature-info">
            <span class="pp-feature-label">${icon('map-pin', 14)} ${business.address}</span>
            <h2>${business.name}</h2>
            <p>${business.description}</p>
            <div class="pp-arena-countdown">
              <span><strong>${business.rating}</strong><small>RATING</small></span><i>:</i>
              <span><strong>${business.reviewsCount}</strong><small>REVIEWS</small></span><i>:</i>
              <span><strong>${followers}</strong><small>FOLLOWERS</small></span><i>:</i>
              <span><strong>${(business.services || []).length}</strong><small>SERVICES</small></span>
            </div>
            <div class="pp-business-contact">
              <a class="pp-btn pp-btn-outline pp-btn-md" href="tel:${(business.phone || '').replace(/\s/g, '')}">${icon('message-circle', 15)} ${business.phone || 'Call'}</a>
              <a class="pp-btn pp-btn-outline pp-btn-md" href="https://www.google.com/maps/search/?api=1&query=${business.lat},${business.lng}" target="_blank" rel="noopener">${icon('map-pin', 15)} Directions</a>
              ${business.booking ? `<button class="pp-btn pp-btn-solid pp-btn-md js-book" data-service="">${icon('plus', 15)} Book a visit</button>` : ''}
              <button class="pp-btn pp-btn-outline pp-btn-md pp-save-button js-save-business ${isSaved ? 'is-saved' : ''}" aria-label="Save ${business.name}">${icon('heart', 15)} <span>${isSaved ? 'Saved' : 'Save'}</span></button>
              <button class="pp-btn ${isFollowing ? 'pp-btn-solid' : 'pp-btn-outline'} pp-btn-md js-follow-business">${icon('users', 15)} <span>${isFollowing ? 'Following' : 'Follow'}</span></button>
            </div>
            <span class="pp-demo-note">${business.priceInfo || ''}</span>
          </div>
        </section>

        <div class="pp-gallery" aria-label="Business photos">
          ${gallery.map((g) => `<img src="${g}" alt="${business.name}" loading="lazy" />`).join('')}
        </div>

        <div class="pp-details-grid">
          <section class="pp-details-card">
            <h3>${icon('map-pin', 15)} Visit &amp; contact</h3>
            <div class="pp-detail-row">${icon('map-pin', 14)} <span>${business.address}</span></div>
            <div class="pp-detail-row">${icon('message-circle', 14)} <a href="tel:${(business.phone || '').replace(/\s/g, '')}">${business.phone || '—'}</a></div>
            <div class="pp-detail-row">${icon('compass', 14)} <a href="mailto:${business.email || ''}">${business.email || '—'}</a></div>
            ${business.website ? `<div class="pp-detail-row">${icon('arrow-right', 14)} <a href="${business.website}" target="_blank" rel="noopener">${business.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
            <div class="pp-detail-row">${icon('check', 14)} <span>${business.hours}</span></div>
            ${(socials.instagram || socials.facebook) ? `
              <div class="pp-socials-row">
                ${socials.instagram ? `<a class="pp-social-chip" href="https://instagram.com/${socials.instagram}" target="_blank" rel="noopener">${icon('star', 13)} @${socials.instagram}</a>` : ''}
                ${socials.facebook ? `<a class="pp-social-chip" href="https://facebook.com/${socials.facebook}" target="_blank" rel="noopener">${icon('users', 13)} ${socials.facebook}</a>` : ''}
              </div>
            ` : ''}
          </section>
          <section class="pp-details-card">
            <h3>${icon('star', 15)} Good to know</h3>
            <div class="pp-detail-row">${icon('shield-check', 14)} <span>${business.verification === 'verified' ? 'Verified by PawPrint' : 'Verification pending'}</span></div>
            <div class="pp-detail-row">${icon('sparkles', 14)} <span>${business.priceInfo || 'Ask for pricing'}</span></div>
            ${business.booking ? `<div class="pp-detail-row">${icon('check', 14)} <span>Accepts booking requests</span></div>` : ''}
            ${(business.awards || []).map((a) => `<div class="pp-detail-row">${icon('award', 14)} <span>${a}</span></div>`).join('')}
            ${business.ranking && business.ranking.position ? `<div class="pp-detail-row">${icon('trophy', 14)} <span>Ranked #${business.ranking.position} · ${business.category}${business.ranking.movement === 'up' ? ' ↑' : business.ranking.movement === 'down' ? ' ↓' : ''}</span></div>` : ''}
            ${business.ranking?.score ? `<button class="pp-ranking-score-toggle js-ranking-toggle" type="button">${icon('award', 14)} Reputation score: <strong>${business.ranking.score}/100</strong> ${icon('chevron-right', 13)}</button>
              <div class="pp-ranking-breakdown" hidden>
                <small>HOW THIS SCORE IS CALCULATED — every business is measured the same way</small>
                ${(business.rankingBreakdown ? Object.entries(business.rankingBreakdown) : []).map(([key, val]) => {
                  const label = { satisfaction: 'Verified satisfaction', reviews: 'Reviews & reputation', transactions: 'Completed transactions', retention: 'Repeat customers', responsiveness: 'Responsiveness' }[key] || key;
                  const weight = { satisfaction: 35, reviews: 25, transactions: 20, retention: 10, responsiveness: 10 }[key];
                  return `<span class="pp-breakdown-row"><span>${label} <em>(${weight}%)</em></span><span>${val}/${weight}</span></span>`;
                }).join('')}
                <small>Scores recalculate whenever reviews, bookings and interactions change. Advertising cannot influence this ranking.</small>
              </div>` : ''}
          </section>
        </div>

        ${(business.products || []).length ? `
          <div class="pp-finalists-heading">
            <div><span class="pp-eyebrow"><span></span> IN THE SHOP</span><h2>Products</h2></div>
            <span class="pp-finalist-count">${(business.products || []).length} ITEMS</span>
          </div>
          <div class="pp-products-grid">
            ${(business.products || []).map((product, pi) => `
              <div class="pp-product-card">
                <span class="pp-product-tile">${escapeHtml(String(product).trim().charAt(0).toUpperCase() || 'P')}</span>
                <span class="pp-product-info"><strong>${escapeHtml(product)}</strong><small>PetMart exclusive · ask in-store</small></span>
                <button class="pp-btn pp-btn-sm pp-btn-outline js-enquire" data-product="${escapeHtml(String(product))}">${icon('message-circle', 13)} Ask</button>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="pp-finalists-heading">
          <div><span class="pp-eyebrow"><span></span> WHAT THEY OFFER</span><h2>Services</h2></div>
          <span class="pp-finalist-count">${(business.services || []).length} SERVICES</span>
        </div>
        <div class="pp-category-list">
          ${(business.services || []).map((s) => business.booking
            ? `<button class="pp-btn pp-btn-sm pp-category-button js-book" data-service="${escapeHtml(s)}">${icon('plus', 13)} ${s}</button>`
            : `<span class="pp-btn pp-btn-sm pp-category-button is-selected">${s}</span>`).join('')}
        </div>
        ${business.booking ? '<p class="pp-demo-note">Tap a service to request a booking — the business confirms or proposes an alternative (doc §5.19).</p>' : ''}

        <div class="pp-community-feed-title"><h2>Customer reviews</h2><span class="pp-finalist-count">${reviews.length} REVIEWS</span></div>

        <div id="review-form-slot"></div>

        <div id="business-reviews">
          ${reviews.length ? reviews.map((r) => `
            <article class="pp-post">
              <div class="pp-post-head">
                <span class="pp-post-avatar pp-post-avatar-fallback">${(r.userName || 'C').charAt(0).toUpperCase()}</span>
                <span class="pp-post-person"><strong>${escapeHtml(r.userName || (r.verified ? 'Verified customer' : 'Customer'))}</strong><span>${icon('star', 10, { fill: 'currentColor' })} ${r.rating}/5 · ${r.verified ? 'Verified visit' : 'Community review'} · ${this._relativeDate(r.createdAt)}</span></span>
              </div>
              <p class="pp-post-copy">${escapeHtml(r.comment)}</p>
              ${r.photos && r.photos.length ? `<div class="pp-review-photos">${r.photos.map((p) => `<img class="pp-review-photo-img" src="${p.url}" alt="Review photo" loading="lazy" />`).join('')}</div>` : ''}
              ${r.response ? `
                <div class="pp-review-response">
                  <strong>${icon('check', 12)} Response from ${business.name}</strong>
                  <p>${escapeHtml(r.response)}</p>
                </div>
              ` : ''}
              <div class="pp-post-actions">
                <button class="pp-action-button js-like-review ${likedReviewIds.has(r.id) ? 'is-liked' : ''}" data-id="${r.id}" aria-pressed="${likedReviewIds.has(r.id)}">${icon('heart', 18, likedReviewIds.has(r.id) ? { fill: 'currentColor' } : {})} Like${r.reactions ? ` · ${r.reactions}` : ''}</button>
                <button class="pp-action-button js-report-review" data-id="${r.id}">Report</button>
              </div>
            </article>
          `).join('') : '<p class="pp-empty-state">No reviews yet — be the first to share your experience.</p>'}
        </div>
      </div>
      <div id="booking-modal-root"></div>
    `;

    container.querySelectorAll('.js-enquire').forEach((btn) => {
      btn.addEventListener('click', () => this._openBookingModal(container, business, `Product enquiry — ${btn.getAttribute('data-product')}`));
    });

    container.querySelectorAll('.js-book').forEach((btn) => {
      btn.addEventListener('click', () => this._openBookingModal(container, business, btn.getAttribute('data-service')));
    });

    // Track outbound contact clicks (doc §5.27: contact clicks)
    container.querySelectorAll('a[href^="tel:"], a[href^="mailto:"], a[href*="google.com/maps"], a[href^="https://instagram.com"], a[href^="https://facebook.com"]').forEach((a) => {
      a.addEventListener('click', async () => {
        try {
          const { dbGet, dbPut } = await import('../db.js');
          const fresh = await dbGet('businesses', business.id);
          fresh.contactClicks = (fresh.contactClicks || 0) + 1;
          await dbPut('businesses', fresh);
        } catch (e) { /* analytics are best-effort */ }
      });
    });

    const saveBtn = container.querySelector('.js-save-business');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const nowSaved = await Favourites.toggle(user.id, business.id);
        saveBtn.classList.toggle('is-saved', nowSaved);
        saveBtn.querySelector('span').textContent = nowSaved ? 'Saved' : 'Save';
        window.showToast(nowSaved ? 'Saved to favourites 💛' : 'Removed from favourites');
      });
    }

    container.querySelectorAll('.js-ranking-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const breakdown = btn.nextElementSibling;
        if (breakdown) {
          breakdown.hidden = !breakdown.hidden;
          btn.classList.toggle('is-open', !breakdown.hidden);
        }
      });
    });

    const followBtn = container.querySelector('.js-follow-business');
    if (followBtn) {
      followBtn.addEventListener('click', async () => {
        const { Follows } = await import('../components/follows.js');
        const nowFollowing = await Follows.toggle(user.id, 'business', business.id);
        followBtn.classList.toggle('pp-btn-solid', nowFollowing);
        followBtn.classList.toggle('pp-btn-outline', !nowFollowing);
        followBtn.querySelector('span').textContent = nowFollowing ? 'Following' : 'Follow';
        window.showToast(nowFollowing ? `Following ${business.name} — nice taste 🐾` : `Unfollowed ${business.name}`);
        this.render(container, { id: String(business.id) });
      });
    }

    container.querySelectorAll('.js-like-review').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.getAttribute('data-id'));
        const { dbGet, dbPut } = await import('../db.js');
        const { Likes } = await import('../components/likes.js');
        const review = await dbGet('reviews', id);
        if (!review) return;
        const result = await Likes.toggle(user.id, review, 'reviews');
        btn.classList.toggle('is-liked', result.liked);
        btn.setAttribute('aria-pressed', String(result.liked));
        btn.innerHTML = `${icon('heart', 18, result.liked ? { fill: 'currentColor' } : {})} Like${result.count ? ` · ${result.count}` : ''}`;
      });
    });

    container.querySelectorAll('.js-report-review').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { reportTarget } = await import('../components/report.js');
        const { dbGet } = await import('../db.js');
        const review = await dbGet('reviews', Number(btn.getAttribute('data-id')));
        reportTarget({
          targetType: 'review',
          targetId: review.id,
          preview: (review.comment || '').slice(0, 80),
        });
      });
    });

    this._renderReviewForm(container.querySelector('#review-form-slot'), business, myReview);
  },

  _relativeDate(iso) {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  },

  /** Booking request (doc §5.19): request → business confirms/declines. */
  async _openBookingModal(container, business, preselected) {
    const user = window.Auth.user;
    const { dbGetByIndex } = await import('../db.js');
    const myPets = await dbGetByIndex('pets', 'ownerId', user.id);
    let services = [...(business.services || [])];
    if (preselected && !services.includes(preselected)) services = [preselected, ...services];
    const root = container.querySelector('#booking-modal-root');

    root.innerHTML = `
      <div class="pp-modal-overlay" id="booking-modal">
        <div class="pp-modal">
          <div class="pp-modal-head"><h3>Book with ${escapeHtml(business.name)}</h3><button class="pp-modal-close" aria-label="Close">✕</button></div>
          <form id="booking-form" class="pp-modal-form">
            <span class="pp-form-field"><label for="bk-service">Service</label>
              <select class="pp-input" id="bk-service">
                ${services.map((s) => `<option value="${escapeHtml(s)}" ${s === preselected ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
              </select>
            </span>
            <div class="pp-form-row">
              <span class="pp-form-field"><label for="bk-date">Preferred date</label><input class="pp-input" id="bk-date" type="date" required></span>
              <span class="pp-form-field"><label for="bk-time">Preferred time</label><input class="pp-input" id="bk-time" type="time" value="10:00" required></span>
            </div>
            ${myPets.length ? `
              <span class="pp-form-field"><label for="bk-pet">Pet (optional)</label>
                <select class="pp-input" id="bk-pet">
                  <option value="">No pet / general visit</option>
                  ${myPets.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
                </select>
              </span>
            ` : ''}
            <span class="pp-form-field"><label for="bk-notes">Notes</label><textarea class="pp-input" id="bk-notes" rows="2" placeholder="Anything the business should know?"></textarea></span>
            <p class="pp-demo-note">Your request is sent to ${escapeHtml(business.name)} — they confirm, decline or propose an alternative. Status: <strong>pending</strong>.</p>
            <div class="pp-modal-actions">
              <button type="submit" class="pp-btn pp-btn-solid pp-btn-md">${icon('check', 15)} Send booking request</button>
              <button type="button" class="pp-btn pp-btn-ghost pp-btn-md pp-modal-dismiss">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => { root.innerHTML = ''; };
    root.querySelectorAll('.pp-modal-close, .pp-modal-dismiss').forEach((b) => b.addEventListener('click', closeModal));
    root.querySelector('.pp-modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    root.querySelector('#booking-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const { dbPut, dbGet } = await import('../db.js');
      const { pushNotification } = await import('../components/notify.js');
      const service = root.querySelector('#bk-service').value;
      const date = root.querySelector('#bk-date').value;
      const time = root.querySelector('#bk-time').value;
      const petSel = root.querySelector('#bk-pet');
      const notes = root.querySelector('#bk-notes').value.trim();

      await dbPut('bookings', {
        businessId: business.id,
        userId: user.id,
        petId: petSel ? Number(petSel.value) || null : null,
        service,
        scheduledFor: `${date} ${time}`,
        notes: notes || null,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      });

      // Track booking enquiries (doc §5.27: booking enquiries)
      const bizRecord = await dbGet('businesses', business.id);
      bizRecord.bookingEnquiries = (bizRecord.bookingEnquiries || 0) + 1;
      await dbPut('businesses', bizRecord);

      if (business.ownerId) {
        await pushNotification({
          userId: business.ownerId,
          title: 'New booking request',
          body: `${user.name} requested ${service} on ${date} at ${time}.`,
          type: 'booking',
          link: `/business/${business.id}`,
        });
      }

      closeModal();
      window.showToast(`Booking request sent — ${business.name} will confirm 💛`);
    });
  },

  _renderReviewForm(slot, business, myReview) {
    const user = window.Auth.user;
    if (myReview) {
      slot.innerHTML = `
        <div class="pp-review-done">${icon('check', 15)} You reviewed ${business.name} — thanks for helping other pet parents. <span>+30 PawPoints</span></div>
      `;
      return;
    }

    let rating = 0;
    slot.innerHTML = `
      <form id="review-form" class="pp-review-form">
        <div class="pp-review-form-head">
          <span class="pp-eyebrow"><span></span> SHARE YOUR EXPERIENCE</span>
          <span class="pp-review-points">${icon('sparkles', 13)} +30 PawPoints</span>
        </div>
        <div class="pp-star-row" id="star-row" role="radiogroup" aria-label="Rating">
          ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="pp-star" data-value="${n}" aria-label="${n} star${n > 1 ? 's' : ''}">${icon('star', 22)}</button>`).join('')}
          <span class="pp-star-hint" id="star-hint">Tap to rate</span>
        </div>
        <textarea class="pp-input" id="review-comment" rows="3" placeholder="How was your visit? What stood out?" required></textarea>
        <div class="pp-review-photo">
          <button type="button" class="pp-btn pp-btn-outline pp-btn-sm" id="review-photo-btn">${icon('image', 14)} Photo (optional, up to 3)</button>
          <div class="pp-review-photo-preview" id="review-photo-preview" hidden></div>
          <input type="file" id="review-photo-input" accept="image/*" multiple hidden>
        </div>
        <button type="submit" class="pp-btn pp-btn-solid pp-btn-md">${icon('star', 15)} Submit review</button>
      </form>
    `;

    const hint = slot.querySelector('#star-hint');
    const labels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Great', 5: 'Excellent' };
    slot.querySelectorAll('.pp-star').forEach((btn) => {
      btn.addEventListener('click', () => {
        rating = Number(btn.getAttribute('data-value'));
        slot.querySelectorAll('.pp-star').forEach((b) => {
          b.classList.toggle('is-active', Number(b.getAttribute('data-value')) <= rating);
        });
        hint.textContent = `${rating}/5 · ${labels[rating]}`;
      });
    });

    // Photo attach (up to 3)
    const reviewPhotos = [];
    const photoBtn = slot.querySelector('#review-photo-btn');
    const photoInput = slot.querySelector('#review-photo-input');
    const photoPreview = slot.querySelector('#review-photo-preview');
    if (photoBtn && photoInput) {
      photoBtn.addEventListener('click', () => photoInput.click());
      const renderPreview = () => {
        photoPreview.innerHTML = reviewPhotos.map((m, i) => `
          <span class="pp-compose-media-item">
            <img src="${m.url}" alt="Review photo ${i + 1}" />
            <button type="button" class="pp-compose-media-remove" data-index="${i}" aria-label="Remove photo">✕</button>
          </span>
        `).join('');
        photoPreview.querySelectorAll('.pp-compose-media-remove').forEach((btn) => {
          btn.addEventListener('click', () => {
            reviewPhotos.splice(Number(btn.getAttribute('data-index')), 1);
            renderPreview();
          });
        });
        photoPreview.hidden = reviewPhotos.length === 0;
      };
      photoInput.addEventListener('change', async () => {
        for (const file of Array.from(photoInput.files || [])) {
          if (reviewPhotos.length >= 3) { window.showToast('Up to 3 photos per review.'); break; }
          try {
            const { readMediaFile } = await import('../components/media.js');
            reviewPhotos.push(await readMediaFile(file));
          } catch (err) { window.showToast(err.message); }
        }
        photoInput.value = '';
        renderPreview();
      });
    }

    slot.querySelector('#review-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const comment = slot.querySelector('#review-comment').value.trim();
      if (!rating) { window.showToast('Tap the stars to rate first 🐾'); return; }
      if (!comment) { window.showToast('Write a few words about your visit.'); return; }

      const { dbPut, dbGetByIndex, dbGet } = await import('../db.js');
      const { awardPoints, POINT_SCHEDULE } = await import('../components/points.js');
      const { pushNotification } = await import('../components/notify.js');

      // Verified visit = has a completed/confirmed booking with this business
      const { dbGetByIndex: dbGetByIndexFn } = await import('../db.js');
      const bookings = await dbGetByIndexFn('bookings', 'businessId', business.id);
      const isVerifiedVisit = bookings.some((b) => b.userId === user.id && (b.status === 'confirmed' || b.status === 'completed'));

      const reviewId = await dbPut('reviews', {
        businessId: business.id,
        userId: user.id,
        userName: user.name,
        rating,
        comment,
        photos: reviewPhotos,
        verified: isVerifiedVisit,
        createdAt: new Date().toISOString(),
      });

      // Recalculate the business rating: seeded base (stamped once) + community reviews
      const allReviews = await dbGetByIndex('reviews', 'businessId', business.id);
      const biz = await dbGet('businesses', business.id);
      if (!biz.baseStats) {
        biz.baseStats = {
          rating: biz.rating || 0,
          count: Math.max(0, (biz.reviewsCount || 0) - allReviews.length),
        };
      }
      const base = biz.baseStats;
      const total = base.rating * base.count + allReviews.reduce((s, r) => s + r.rating, 0);
      const count = base.count + allReviews.length;
      biz.rating = count ? Math.round((total / count) * 10) / 10 : biz.rating;
      biz.reviewsCount = count;
      await dbPut('businesses', biz);

      await awardPoints({
        userId: user.id,
        amount: POINT_SCHEDULE.verifiedReview.amount,
        source: POINT_SCHEDULE.verifiedReview.source,
        referenceId: `review_${reviewId}`,
      });

      if (biz.ownerId) {
        await pushNotification({
          userId: biz.ownerId,
          title: 'New business review',
          body: `${user.name} left a ${rating}-star review on ${biz.name}.`,
          type: 'business',
          link: `/business/${biz.id}`,
        });
      }

      window.showToast('Review posted — +30 PawPoints 💛');
      const { navigateTo } = await import('../router.js');
      navigateTo(`/business/${business.id}`);
    });
  },
};

