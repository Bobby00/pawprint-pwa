// ============================================================================
// PawPrint — Business owner dashboard (doc §5.19 / §5.17 / §7.1)
// Bookings inbox (confirm/decline → notify the user), review responses
// (displayed on the public business page), listing editor, stats.
// ============================================================================

import { icon } from '../components/icons.js';
import { escapeHtml } from '../components/sanitize.js';

const STATUS_LABELS = {
  pending: 'Needs response',
  confirmed: 'Confirmed',
  declined: 'Declined',
  completed: 'Completed',
};

function when(iso) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export const DashboardPage = {
  pageTitle: 'Dashboard',

  async render(container) {
    const user = window.Auth.user;
    const { dbGetAll, dbGetByIndex } = await import('../db.js');

    const allBusinesses = await dbGetAll('businesses');
    const mine = user.role === 'admin'
      ? allBusinesses
      : allBusinesses.filter((b) => b.ownerId === user.id);

    if (!mine.length) {
      container.innerHTML = `
        <div class="pp-standard-page">
          <div class="pp-page-heading"><div><div class="pp-eyebrow"><span></span>BUSINESS DASHBOARD</div><h1>No listings <span>yet.</span></h1>
          <p>Your account is not linked to a business listing. Ask PawPrint to claim or create one for you.</p></div></div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="pp-standard-page">
        <div class="pp-page-heading">
          <div>
            <div class="pp-eyebrow"><span></span>BUSINESS DASHBOARD</div>
            <h1>Owner <span>desk.</span></h1>
            <p>Manage bookings, respond to reviews and keep your listings sharp.</p>
          </div>
        </div>
        <div class="pp-dashboard-tabs" id="dash-tabs">
          ${mine.map((b, i) => `<button class="pp-dashboard-tab ${i === 0 ? 'is-active' : ''}" data-biz="${b.id}">${escapeHtml(b.name)}</button>`).join('')}
        </div>
        <div id="dash-body"></div>
      </div>
      <div id="dash-modal-root"></div>
    `;

    const tabs = container.querySelectorAll('.pp-dashboard-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        this._renderBusiness(container, Number(tab.getAttribute('data-biz')));
      });
    });

    this._renderBusiness(container, mine[0].id);
  },

  async _renderBusiness(container, businessId) {
    const body = container.querySelector('#dash-body');
    const { dbGet, dbGetByIndex, dbGetAll } = await import('../db.js');
    const business = await dbGet('businesses', businessId);
    const [bookings, reviews, redemptions, events] = await Promise.all([
      dbGetByIndex('bookings', 'businessId', businessId),
      dbGetByIndex('reviews', 'businessId', businessId),
      dbGetByIndex('redemptions', 'businessId', businessId),
      dbGetAll('events'),
    ]);
    bookings.sort((a, b) => new Date(b.requestedAt || a.scheduledFor) - new Date(b.requestedAt || a.scheduledFor));
    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    redemptions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const users = await (await import('../db.js')).dbGetAll('users');
    const pets = await (await import('../db.js')).dbGetAll('pets');
    const nameOf = (id) => (users.find((u) => u.id === id) || {}).name || 'Member';
    const petName = (id) => (pets.find((p) => p.id === id) || {}).name || null;

    const myEvents = events.filter((e) => e.organiser === business.name);
    const myEventsHtml = myEvents.length ? `
      <div class="pp-community-feed-title">
        <h2>Your events</h2>
        <span class="pp-finalist-count">${myEvents.length} ORGANISED</span>
      </div>
      <div class="pp-dash-reviews">
        ${myEvents.map((ev) => `
          <article class="pp-post">
            <div class="pp-post-head">
              <span class="pp-post-avatar pp-post-avatar-fallback">${escapeHtml(ev.title.charAt(0).toUpperCase())}</span>
              <span class="pp-post-person"><strong>${escapeHtml(ev.title)}</strong><span>${icon('map-pin', 10)} ${escapeHtml(ev.location.split(',')[0])} · ${new Date(ev.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${ev.registrations || 0}/${ev.capacity} going</span></span>
            </div>
            <div class="pp-booking-actions">
              <button class="pp-btn pp-btn-sm pp-btn-outline js-biz-checkins" data-event="${ev.id}">${icon('users', 13)} Check-ins</button>
            </div>
            <div class="pp-event-checkins" data-biz-checkins="${ev.id}" hidden></div>
          </article>
        `).join('')}
      </div>` : '';

    const pending = bookings.filter((b) => b.status === 'pending');
    const unreadReviews = reviews.filter((r) => !r.response);

    body.innerHTML = `
      <div class="pp-stat-grid">
        <div class="pp-stat-card"><span class="pp-stat-icon">${icon('users', 18)}</span><div><strong>${pending.length}</strong><small>Pending bookings</small></div></div>
        <div class="pp-stat-card"><span class="pp-stat-icon">${icon('message-circle', 18)}</span><div><strong>${reviews.length}</strong><small>Total reviews</small></div></div>
        <div class="pp-stat-card"><span class="pp-stat-icon">${icon('star', 18)}</span><div><strong>${business.rating}</strong><small>Average rating</small></div></div>
        <div class="pp-stat-card"><span class="pp-stat-icon">${icon('sparkles', 18)}</span><div><strong>${business.reviewsCount}</strong><small>Reviews shown</small></div></div>
        <div class="pp-stat-card"><span class="pp-stat-icon">${icon('compass', 18)}</span><div><strong>${business.profileViews || 0}</strong><small>Profile views</small></div></div>
        <div class="pp-stat-card"><span class="pp-stat-icon">${icon('message-circle', 18)}</span><div><strong>${business.contactClicks || 0}</strong><small>Contact clicks</small></div></div>
        <div class="pp-stat-card"><span class="pp-stat-icon">${icon('check', 18)}</span><div><strong>${business.bookingEnquiries || 0}</strong><small>Booking enquiries</small></div></div>
      </div>

      <div class="pp-community-feed-title">
        <h2>Bookings inbox</h2>
        <span class="pp-finalist-count">${pending.length} PENDING</span>
      </div>
      <div class="pp-bookings-list">
        ${bookings.length ? bookings.map((b) => `
          <article class="pp-booking-row ${b.status === 'pending' ? 'is-pending' : ''}">
            <div class="pp-booking-main">
              <strong>${escapeHtml(b.service)}</strong>
              <small>${escapeHtml(nameOf(b.userId))}${b.petId ? ` · ${escapeHtml(petName(b.petId))}` : ''} · ${when(b.scheduledFor || b.requestedAt)}</small>
              ${b.notes ? `<p class="pp-booking-notes">“${escapeHtml(b.notes)}”</p>` : ''}
            </div>
            <div class="pp-booking-actions">
              ${b.status === 'pending' ? `
                <button class="pp-btn pp-btn-sm pp-btn-solid js-confirm" data-id="${b.id}">${icon('check', 13)} Confirm</button>
                <button class="pp-btn pp-btn-sm pp-btn-outline js-decline" data-id="${b.id}">${icon('settings', 13)} Decline</button>
              ` : b.status === 'confirmed' ? `
                <button class="pp-btn pp-btn-sm pp-btn-solid js-complete" data-id="${b.id}">${icon('check', 13)} Mark completed</button>
                <span class="pp-booking-status confirmed">${STATUS_LABELS[b.status] || b.status}</span>
              ` : `<span class="pp-booking-status ${b.status}">${STATUS_LABELS[b.status] || b.status}</span>`}
            </div>
          </article>
        `).join('') : '<p class="pp-empty-state">No booking requests yet. Requests from your business page land here.</p>'}
      </div>

      <div class="pp-community-feed-title">
        <h2>Reviews</h2>
        <span class="pp-finalist-count">${unreadReviews.length} AWAITING REPLY</span>
      </div>
      <div class="pp-dash-reviews">
        ${reviews.length ? reviews.map((r) => `
          <article class="pp-post">
            <div class="pp-post-head">
              <span class="pp-post-avatar pp-post-avatar-fallback">${(r.userName || nameOf(r.userId) || 'C').charAt(0).toUpperCase()}</span>
              <span class="pp-post-person"><strong>${escapeHtml(r.userName || nameOf(r.userId))}</strong><span>${icon('star', 10, { fill: 'currentColor' })} ${r.rating}/5 · ${when(r.createdAt)}</span></span>
            </div>
            <p class="pp-post-copy">${escapeHtml(r.comment)}</p>
            ${r.response ? `
              <div class="pp-review-response">
                <strong>${icon('check', 12)} Response from ${escapeHtml(business.name)}</strong>
                <p>${escapeHtml(r.response)}</p>
              </div>
            ` : `
              <div class="pp-review-reply">
                <textarea class="pp-input" rows="2" placeholder="Write a public reply…" data-review="${r.id}"></textarea>
                <button class="pp-btn pp-btn-sm pp-btn-solid js-reply" data-id="${r.id}">Reply</button>
              </div>
            `}
          </article>
        `).join('') : '<p class="pp-empty-state">No reviews yet.</p>'}
      </div>

      <div class="pp-community-feed-title">
        <h2>Reward redemptions</h2>
        <span class="pp-finalist-count">${redemptions.filter((r) => r.status === 'pending').length} TO CONFIRM</span>
      </div>
      <div class="pp-dash-reviews">
        ${redemptions.length ? redemptions.map((r) => `
          <article class="pp-post">
            <div class="pp-post-head">
              <span class="pp-post-avatar pp-post-avatar-fallback">${escapeHtml((r.userName || 'M').charAt(0).toUpperCase())}</span>
              <span class="pp-post-person"><strong>${escapeHtml(r.userName)}</strong><span>${escapeHtml(r.rewardTitle)} · ${when(r.createdAt)} · ${r.cost} pts</span></span>
            </div>
            <div class="pp-booking-actions">
              ${r.status === 'pending' ? `
                <code class="pp-redemption-code">${r.voucherCode}</code>
                <button class="pp-btn pp-btn-sm pp-btn-solid js-confirm-redemption" data-id="${r.id}">${icon('check', 13)} Confirm voucher</button>
              ` : `<span class="pp-redemption-status ${r.status === 'confirmed' ? 'is-confirmed' : ''}">${r.status}</span>`}
            </div>
          </article>
        `).join('') : '<p class="pp-empty-state">No redemptions yet. They appear here the moment a member redeems a voucher for this business.</p>'}
      </div>

      <div class="pp-community-feed-title">
        <h2>Listing</h2>
        <span class="pp-finalist-count">${business.verification === 'verified' ? 'VERIFIED' : 'UNVERIFIED'}</span>
      </div>
      <div class="pp-listing-editor">
        <div class="pp-listing-preview">
          <strong>${escapeHtml(business.name)}</strong>
          <small>${escapeHtml(business.category)} · ${escapeHtml(business.address)}</small>
          <p>${escapeHtml(business.description)}</p>
          <small class="pp-listing-meta">${escapeHtml(business.phone || 'No phone')} · ${escapeHtml(business.hours)} · ${escapeHtml(business.priceInfo || '')}</small>
          <span class="pp-subscription-row"><span class="pp-subscription-badge">${(business.subscription || 'free').toUpperCase()} PLAN</span><button class="pp-subscription-upgrade js-upgrade-plan" type="button">Manage plan →</button></span>
          <div class="pp-socials-row">
            ${(business.services || []).map((s) => `<span class="pp-social-chip">${escapeHtml(s)}</span>`).join('')}
          </div>
        </div>
        <button class="pp-btn pp-btn-outline pp-btn-md" id="edit-listing-btn">${icon('settings', 15)} Edit listing</button>
      </div>

      <div class="pp-community-feed-title">
        <h2>Publish an event</h2>
        <span class="pp-finalist-count">GROW YOUR COMMUNITY</span>
      </div>
      <form id="publish-event-form" class="pp-admin-form">
        <div class="pp-form-row">
          <span class="pp-form-field"><label for="pe-title">Event title *</label><input class="pp-input" id="pe-title" type="text" placeholder="Free dental day" required></span>
          <span class="pp-form-field"><label for="pe-location">Location *</label><input class="pp-input" id="pe-location" type="text" placeholder="${escapeHtml(business.address)}" value="${escapeHtml(business.address)}" required></span>
        </div>
        <span class="pp-form-field"><label for="pe-desc">Description</label><input class="pp-input" id="pe-desc" type="text" placeholder="What's happening and who it's for"></span>
        <div class="pp-form-row">
          <span class="pp-form-field"><label for="pe-date">Date (days from now)</label><input class="pp-input" id="pe-date" type="number" min="1" value="14"></span>
          <span class="pp-form-field"><label for="pe-capacity">Capacity</label><input class="pp-input" id="pe-capacity" type="number" min="1" value="30"></span>
        </div>
        <button type="submit" class="pp-btn pp-btn-solid pp-btn-md">${icon('plus', 15)} Publish event</button>
      </form>

      ${myEventsHtml}
    `;

    // Bookings actions
    body.querySelectorAll('.js-confirm').forEach((btn) => {
      btn.addEventListener('click', () => this._setBooking(container, business, Number(btn.getAttribute('data-id')), 'confirmed'));
    });
    body.querySelectorAll('.js-decline').forEach((btn) => {
      btn.addEventListener('click', () => this._setBooking(container, business, Number(btn.getAttribute('data-id')), 'declined'));
    });
    body.querySelectorAll('.js-complete').forEach((btn) => {
      btn.addEventListener('click', () => this._completeBooking(container, business, Number(btn.getAttribute('data-id'))));
    });

    // Reward redemptions (doc §5.23: business confirms fulfilment at the visit)
    body.querySelectorAll('.js-confirm-redemption').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { dbGet, dbPut } = await import('../db.js');
        const redemption = await dbGet('redemptions', Number(btn.getAttribute('data-id')));
        if (!redemption) return;
        redemption.status = 'confirmed';
        redemption.confirmedAt = new Date().toISOString();
        await dbPut('redemptions', redemption);
        await (await import('../components/notify.js')).pushNotification({
          userId: redemption.userId,
          title: 'Reward confirmed',
          body: `${business.name} confirmed your “${redemption.rewardTitle}” voucher ${redemption.voucherCode}. Enjoy!`,
          type: 'reward',
          link: '/rewards',
        });
        window.showToast(`Voucher ${redemption.voucherCode} confirmed ✓`);
        this._renderBusiness(container, business.id);
      });
    });

    // Review replies
    body.querySelectorAll('.js-reply').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.getAttribute('data-id'));
        const textarea = body.querySelector(`textarea[data-review="${id}"]`);
        const text = textarea.value.trim();
        if (!text) { window.showToast('Write a reply first.'); return; }
        const { dbGet, dbPut } = await import('../db.js');
        const review = await dbGet('reviews', id);
        review.response = text;
        review.respondedAt = new Date().toISOString();
        await dbPut('reviews', review);
        await (await import('../components/notify.js')).pushNotification({
          userId: review.userId,
          title: 'The business replied to your review',
          body: `${business.name}: “${text.slice(0, 60)}${text.length > 60 ? '…' : ''}”`,
          type: 'business',
          link: `/business/${business.id}`,
        });
        window.showToast('Reply published ✓');
        this._renderBusiness(container, business.id);
      });
    });

    // Listing editor
    const editBtn = body.querySelector('#edit-listing-btn');
    if (editBtn) editBtn.addEventListener('click', () => this._openListingEditor(container, business));

    // Subscription / plan management
    const planBtn = body.querySelector('.js-upgrade-plan');
    if (planBtn) {
      planBtn.addEventListener('click', async () => {
        const { Payments } = await import('../components/payments.js');
        Payments.openPlanModal(business, (newPlan) => {
          window.showToast(newPlan === 'free' ? 'Switched to Free plan.' : `Welcome to ${newPlan === 'standard' ? 'Standard' : 'Premium'}! 💛`);
          this._renderBusiness(container, business.id);
        });
      });
    }

    // Organiser check-ins for business-owned events (doc §5.22/5.28: +75 pts)
    body.querySelectorAll('.js-biz-checkins').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const eventId = Number(btn.getAttribute('data-event'));
        const slot = body.querySelector(`[data-biz-checkins="${eventId}"]`);
        if (!slot) return;
        if (!slot.hidden) { slot.hidden = true; return; }
        const { dbGetAll: dbAll } = await import('../db.js');
        const rsvps = await dbAll('eventRsvps');
        const guests = rsvps.filter((r) => r.eventId === eventId);
        const users = await dbAll('users');
        slot.innerHTML = guests.length ? guests.map((r) => {
          const guest = users.find((u) => u.id === r.userId);
          return `
            <div class="pp-checkin-row">
              <span>${escapeHtml(guest?.name || 'Member')}</span>
              <button class="pp-btn pp-btn-outline pp-btn-sm js-biz-checkin" data-user="${r.userId}" data-event="${eventId}">${icon('check', 13)} Check in · +75</button>
            </div>`;
        }).join('') : '<p class="pp-empty-state">No RSVPs yet.</p>';
        slot.hidden = false;

        slot.querySelectorAll('.js-biz-checkin').forEach((checkinBtn) => {
          checkinBtn.addEventListener('click', async () => {
            const attendeeId = Number(checkinBtn.getAttribute('data-user'));
            const { awardPoints, POINT_SCHEDULE } = await import('../components/points.js');
            const result = await awardPoints({
              userId: attendeeId,
              amount: POINT_SCHEDULE.attendEvent.amount,
              source: POINT_SCHEDULE.attendEvent.source,
              referenceId: `event_${eventId}`,
            });
            if (result.awarded) {
              await (await import('../components/notify.js')).pushNotification({
                userId: attendeeId,
                title: 'Checked in! 🎉',
                body: `Welcome — +${POINT_SCHEDULE.attendEvent.amount} PawPoints for attending.`,
                type: 'reward',
              });
              window.showToast('Checked in — +75 PawPoints awarded ✓');
            } else {
              window.showToast('Already checked in for this event.');
            }
            checkinBtn.disabled = true;
            checkinBtn.innerHTML = '✓ Checked in';
          });
        });
      });
    });

    // Publish event (doc §5.28: businesses may publish events)
    const eventForm = body.querySelector('#publish-event-form');
    if (eventForm) {
      eventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { dbPut } = await import('../db.js');
        const { notifyRole } = await import('../components/notify.js');
        const { audit } = await import('../components/audit.js');
        const title = body.querySelector('#pe-title').value.trim();
        const location = body.querySelector('#pe-location').value.trim();
        const days = Math.max(1, Number(body.querySelector('#pe-date').value) || 14);
        const desc = body.querySelector('#pe-desc').value.trim();
        const capacity = Math.max(1, Number(body.querySelector('#pe-capacity').value) || 30);

        await dbPut('events', {
          title,
          description: desc,
          location,
          date: new Date(Date.now() + days * 86400000).toISOString(),
          organiser: business.name,
          capacity,
          registrations: 0,
          createdAt: new Date().toISOString(),
        });
        await notifyRole('pet_owner', {
          title: 'Upcoming event',
          body: `${business.name} is hosting "${title}" — ${new Date(Date.now() + days * 86400000).toLocaleDateString()} at ${location}.`,
          type: 'event',
          link: '/discover',
        });
        await audit(window.Auth.user, 'business_create_event', `${title} (${business.name})`);
        eventForm.reset();
        window.showToast('Event published — pet owners notified 🎉');
      });
    }
  },

  async _setBooking(container, business, bookingId, status) {
    const { dbGet, dbPut } = await import('../db.js');
    const booking = await dbGet('bookings', bookingId);
    if (!booking) return;
    booking.status = status;
    booking.decidedAt = new Date().toISOString();
    await dbPut('bookings', booking);

    const whenText = booking.scheduledFor || 'the requested time';
    await (await import('../components/notify.js')).pushNotification({
      userId: booking.userId,
      title: status === 'confirmed' ? 'Booking confirmed' : 'Booking declined',
      body: status === 'confirmed'
        ? `${business.name} confirmed your ${booking.service} on ${whenText}. See you there!`
        : `${business.name} can't take your ${booking.service} on ${whenText}. Try another time or call them.`,
      type: 'booking',
      link: `/business/${business.id}`,
    });

    window.showToast(status === 'confirmed' ? 'Booking confirmed — the user has been notified ✓' : 'Booking declined — the user has been notified', {
      action: 'View business',
      onAction: async () => {
        const { navigateTo } = await import('../router.js');
        navigateTo(`/business/${business.id}`);
      },
    });
    this._renderBusiness(container, business.id);
  },

  /** Completed booking → verified transaction → +50 PawPoints (doc §5.22/§5.19). */
  async _completeBooking(container, business, bookingId) {
    const { dbGet, dbPut } = await import('../db.js');
    const booking = await dbGet('bookings', bookingId);
    if (!booking || booking.status !== 'confirmed') return;
    booking.status = 'completed';
    booking.completedAt = new Date().toISOString();
    await dbPut('bookings', booking);

    const { awardPoints, POINT_SCHEDULE } = await import('../components/points.js');
    const { pushNotification } = await import('../components/notify.js');

    await awardPoints({
      userId: booking.userId,
      amount: POINT_SCHEDULE.verifiedBooking.amount,
      source: POINT_SCHEDULE.verifiedBooking.source,
      referenceId: `booking_${bookingId}`,
    });

    await pushNotification({
      userId: booking.userId,
      title: 'Booking completed',
      body: `Your ${booking.service} at ${business.name} is complete — +${POINT_SCHEDULE.verifiedBooking.amount} PawPoints. Leave a review to earn more!`,
      type: 'booking',
      link: `/business/${business.id}`,
    });

    window.showToast('Booking marked complete — the user earned +50 PawPoints ✓');
    this._renderBusiness(container, business.id);
  },

  _openListingEditor(container, business) {
    const root = container.querySelector('#dash-modal-root');
    const socials = business.socials || {};

    root.innerHTML = `
      <div class="pp-modal-overlay" id="listing-modal">
        <div class="pp-modal">
          <div class="pp-modal-head"><h3>Edit listing</h3><button class="pp-modal-close" aria-label="Close">✕</button></div>
          <form id="listing-form" class="pp-modal-form">
            <span class="pp-form-field"><label for="le-desc">Description</label><textarea class="pp-input" id="le-desc" rows="3">${escapeHtml(business.description)}</textarea></span>
            <div class="pp-form-row">
              <span class="pp-form-field"><label for="le-phone">Phone</label><input class="pp-input" id="le-phone" type="tel" value="${escapeHtml(business.phone || '')}"></span>
              <span class="pp-form-field"><label for="le-hours">Opening hours</label><input class="pp-input" id="le-hours" type="text" value="${escapeHtml(business.hours || '')}"></span>
            </div>
            <span class="pp-form-field"><label for="le-price">Price info</label><input class="pp-input" id="le-price" type="text" value="${escapeHtml(business.priceInfo || '')}" placeholder="KES 2,500–8,000"></span>
            <span class="pp-form-field"><label for="le-services">Services (comma-separated)</label><input class="pp-input" id="le-services" type="text" value="${escapeHtml((business.services || []).join(', '))}"></span>
            <div class="pp-form-row">
              <span class="pp-form-field"><label for="le-ig">Instagram handle</label><input class="pp-input" id="le-ig" type="text" value="${escapeHtml(socials.instagram || '')}" placeholder="pawcareke"></span>
              <span class="pp-form-field"><label for="le-fb">Facebook page</label><input class="pp-input" id="le-fb" type="text" value="${escapeHtml(socials.facebook || '')}"></span>
            </div>
            <div class="pp-modal-actions">
              <button type="submit" class="pp-btn pp-btn-solid pp-btn-md">${icon('check', 15)} Save listing</button>
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

    root.querySelector('#listing-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const { dbGet, dbPut } = await import('../db.js');
      const record = await dbGet('businesses', business.id);
      record.description = root.querySelector('#le-desc').value.trim() || record.description;
      record.phone = root.querySelector('#le-phone').value.trim() || null;
      record.hours = root.querySelector('#le-hours').value.trim() || record.hours;
      record.priceInfo = root.querySelector('#le-price').value.trim() || null;
      record.services = root.querySelector('#le-services').value.split(',').map((s) => s.trim()).filter(Boolean);
      record.socials = {
        instagram: root.querySelector('#le-ig').value.trim().replace(/^@/, '') || null,
        facebook: root.querySelector('#le-fb').value.trim() || null,
      };
      await dbPut('businesses', record);
      closeModal();
      window.showToast('Listing updated ✓');
      this._renderBusiness(container, business.id);
    });
  },
};
