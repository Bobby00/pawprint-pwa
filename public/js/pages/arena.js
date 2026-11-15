// ============================================================================
// PawPrint — Arena screen (The Pack, per doc §5.12)
// Competition feature, entry flow (pick pet + description), finalists,
// full leaderboard, voting with duplicate prevention + owner notifications.
// ============================================================================

import { icon } from '../components/icons.js';
import { escapeHtml } from '../components/sanitize.js';
import { notifyRole } from '../components/notify.js';
import { COMPETITION_MONEY_FEES } from '../payments-config.js';

function moneyFee(comp) {
  return COMPETITION_MONEY_FEES[comp.id] ?? 0;
}

const ENTRY_IMAGES = ['/images/pawprint-arena-dog.jpg', '/images/pawprint-dog-park.jpg', '/images/pawprint-cat-profile.jpg'];

export const ArenaPage = {
  pageTitle: 'Arena',

  async render(container) {
    const { dbGetAll } = await import('../db.js');
    const user = window.Auth.user;
    const competitions = await dbGetAll('competitions');
    const active = competitions.filter((c) => c.status === 'active');
    const entries = await dbGetAll('entries');
    const votes = await dbGetAll('votes');
    const pets = await dbGetAll('pets');

    container.innerHTML = `
      <div class="pp-standard-page">
        <div class="pp-page-heading">
          <div><div class="pp-eyebrow"><span></span>A LITTLE FRIENDLY COMPETITION</div><h1>Welcome to the <span>Arena.</span></h1></div>
          <button class="pp-btn pp-btn-outline pp-btn-md" id="arena-challenges-btn">${icon('check', 15)} Challenge Arena</button>
          <button class="pp-btn pp-btn-outline pp-btn-md" id="arena-history-btn">${icon('award', 15)} Awards &amp; history</button>
        </div>
        <div id="arena-feature"></div>
        <div id="arena-finalists"></div>
        <div id="arena-leaderboard"></div>
        <div id="arena-rankings"></div>
        <div id="arena-showdown"></div>
      </div>
      <div id="arena-modal-root"></div>
    `;

    container.querySelector('#arena-history-btn').addEventListener('click', () => {
      window.showToast('Awards & history are coming soon — results publish when voting closes.');
    });

    container.querySelector('#arena-challenges-btn').addEventListener('click', async () => {
      const { navigateTo } = await import('../router.js');
      navigateTo('/challenges');
    });

    await this._renderBusinessRankings(container, user);
    await this._renderShowdown(container, user);

    for (const comp of active) {
      this._renderFeature(container, comp, user);
    }
    if (active.length) {
      await this._renderFinalists(container, active[0], entries, votes, pets, user);
      this._renderLeaderboard(container, active[0], entries, pets, user);
    } else {
      container.querySelector('#arena-feature').innerHTML =
        '<p class="pp-empty-state">No competitions are live right now. Check back soon.</p>';
    }
  },

  _countdown(votingEnd) {
    const ms = Math.max(0, new Date(votingEnd) - Date.now());
    const days = Math.floor(ms / 86400000);
    const hrs = Math.floor((ms % 86400000) / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return { days, hrs, mins };
  },

  _renderFeature(container, comp, user) {
    const el = container.querySelector('#arena-feature');
    if (!el) return; // navigated away mid-render
    const cd = this._countdown(comp.votingEnd);
    const entryOpen = new Date(comp.entryEnd) > new Date();

    el.innerHTML = `
      <section class="pp-arena-feature">
        <div class="pp-arena-feature-image">
          <img src="/images/pawprint-arena-dog.jpg" alt="A playful dog ready for the Nairobi pet contest" />
          <span class="pp-arena-live"><span></span> VOTING OPEN</span>
        </div>
        <div class="pp-arena-feature-info">
          <span class="pp-feature-label">${icon('trophy', 14)} LIVE PET COMPETITION</span>
          <h2>${escapeHtml(comp.name)}</h2>
          <p>${escapeHtml(comp.description)}</p>
          <div class="pp-arena-countdown">
            <span><strong>${String(cd.days).padStart(2, '0')}</strong><small>DAYS</small></span><i>:</i>
            <span><strong>${String(cd.hrs).padStart(2, '0')}</strong><small>HRS</small></span><i>:</i>
            <span><strong>${String(cd.mins).padStart(2, '0')}</strong><small>MINS</small></span>
            ${entryOpen ? `<button class="pp-btn pp-btn-solid pp-vote-button js-enter-comp" data-comp="${comp.id}">${icon('vote', 16)} Enter your pet</button>`
              : `<span class="pp-btn pp-btn-outline pp-vote-button" style="cursor:default">${icon('check', 16)} Entries closed</span>`}
          </div>
          <span class="pp-demo-note">${comp.sponsor ? `Sponsored by ${escapeHtml(comp.sponsor)} · ` : ''}Prize: ${escapeHtml(comp.prize)} · ${escapeHtml(comp.votingRules || 'One vote per user')}</span>
        </div>
      </section>
    `;

    const enterBtn = el.querySelector('.js-enter-comp');
    if (enterBtn) enterBtn.addEventListener('click', () => this._openEntryModal(comp, user));
  },

  /** Entry flow (doc §5.12): pick an eligible pet, add a description, submit. */
  async _openEntryModal(comp, user) {
    const { dbGetAll, dbGetByIndex } = await import('../db.js');

    // Loophole guard: only pet owners enter competitions (doc §5.12)
    if (user.role !== 'pet_owner') {
      window.showToast('Competitions are open to pet owner accounts.');
      return;
    }

    // Loophole guard: entry window must still be open
    if (new Date(comp.entryEnd) < new Date()) {
      window.showToast('Entries for this competition have closed.');
      return;
    }

    const myPets = await dbGetByIndex('pets', 'ownerId', user.id);
    const compEntries = (await dbGetAll('entries')).filter((e) => e.competitionId === comp.id && (!e.status || e.status === 'approved' || e.status === 'pending'));
    const alreadyEntered = compEntries.some((e) => myPets.some((p) => p.id === e.petId));

    const root = document.getElementById('arena-modal-root');
    if (alreadyEntered) {
      window.showToast('You already have a pet entered in this competition 🐾');
      return;
    }

    // Entry fee (free or PawPoints — conversion model to be finalised)
    const isPaid = comp.entryType === 'points' && (comp.entryCost || 0) > 0;
    let balance = 0;
    if (isPaid) {
      const { getPointsBalance } = await import('../components/points.js');
      balance = await getPointsBalance(user.id);
    }
    const feeLine = isPaid
      ? `Entry fee: ${comp.entryCost} PawPoints · your balance: ${balance}`
      : 'Free entry';

    if (!myPets.length) {
      root.innerHTML = `
        <div class="pp-modal-overlay" id="entry-modal">
          <div class="pp-modal">
            <div class="pp-modal-head"><h3>Enter ${escapeHtml(comp.name)}</h3><button class="pp-modal-close" aria-label="Close">✕</button></div>
            <p class="pp-modal-body">You need a pet profile before you can enter. Create one — it takes a minute and earns you 50 PawPoints.</p>
            <div class="pp-modal-actions">
              <a href="/pet-profile" class="pp-btn pp-btn-solid pp-btn-md" data-route="/pet-profile">${icon('plus', 15)} Create a pet profile</a>
              <button class="pp-btn pp-btn-ghost pp-btn-md pp-modal-dismiss">Not now</button>
            </div>
          </div>
        </div>
      `;
    } else {
      root.innerHTML = `
        <div class="pp-modal-overlay" id="entry-modal">
          <div class="pp-modal">
            <div class="pp-modal-head"><h3>Enter ${escapeHtml(comp.name)}</h3><button class="pp-modal-close" aria-label="Close">✕</button></div>
            <form id="entry-form" class="pp-modal-form">
              <span class="pp-form-field"><label for="entry-pet">Choose your pet</label>
                <select class="pp-input" id="entry-pet">
                  ${myPets.map((p) => `<option value="${p.id}">${escapeHtml(p.name)} · ${escapeHtml(p.species)}${p.breed ? ' · ' + escapeHtml(p.breed) : ''}</option>`).join('')}
                </select>
              </span>
              <span class="pp-form-field"><label for="entry-desc">Short description</label>
                <textarea class="pp-input" id="entry-desc" rows="3" placeholder="Why should Nairobi vote for your best friend?" required></textarea>
              </span>
              <div class="pp-entry-photo">
                <button type="button" class="pp-btn pp-btn-outline pp-btn-sm" id="entry-photo-btn">${icon('image', 14)} Add a photo (optional)</button>
                <div class="pp-entry-photo-preview" id="entry-photo-preview" hidden></div>
                <input type="file" id="entry-photo-input" accept="image/*" hidden>
              </div>
              <span class="pp-entry-fee ${isPaid ? 'is-paid' : ''}">${icon(isPaid ? 'sparkles' : 'check', 14)} ${feeLine}</span>
              ${isPaid ? `
                <fieldset class="pp-payment-choice">
                  <legend>Pay with</legend>
                  <label class="pp-payment-option"><input type="radio" name="entry-payment" value="points" ${balance >= (comp.entryCost || 0) ? 'checked' : ''}> ${icon('sparkles', 13)} ${comp.entryCost} PawPoints</label>
                  <label class="pp-payment-option"><input type="radio" name="entry-payment" value="money" ${balance >= (comp.entryCost || 0) ? '' : 'checked'}> ${icon('message-circle', 13)} KES ${moneyFee(comp)} with M-Pesa or card</label>
                </fieldset>
              ` : ''}
              <p class="pp-demo-note">${escapeHtml(comp.eligibility || 'All pets eligible')} · ${escapeHtml(comp.votingRules || 'One vote per user')}</p>
              <div class="pp-modal-actions">
                <button type="submit" class="pp-btn pp-btn-solid pp-btn-md" ${isPaid && balance < (comp.entryCost || 0) ? 'disabled' : ''}>${icon('trophy', 15)} ${isPaid ? `Enter for ${comp.entryCost} pts` : 'Submit entry'}</button>
                <button type="button" class="pp-btn pp-btn-ghost pp-btn-md pp-modal-dismiss">Cancel</button>
              </div>
              ${isPaid && balance < (comp.entryCost || 0) ? '<p class="pp-demo-note">Not enough PawPoints — earn more by completing your pet profile or writing reviews.</p>' : ''}
            </form>
          </div>
        </div>
      `;
    }

    const closeModal = () => { root.innerHTML = ''; };
    root.querySelectorAll('.pp-modal-close, .pp-modal-dismiss').forEach((b) => b.addEventListener('click', closeModal));
    root.querySelector('.pp-modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
    root.querySelectorAll('[data-route]').forEach((el) => {
      el.addEventListener('click', closeModal);
    });

    // Competition photo (optional, one per entry)
    let entryPhoto = null;
    const photoBtn = root.querySelector('#entry-photo-btn');
    const photoInput = root.querySelector('#entry-photo-input');
    const photoPreview = root.querySelector('#entry-photo-preview');
    if (photoBtn && photoInput) {
      photoBtn.addEventListener('click', () => photoInput.click());
      photoInput.addEventListener('change', async () => {
        const file = photoInput.files && photoInput.files[0];
        if (!file) return;
        try {
          const { readMediaFile } = await import('../components/media.js');
          entryPhoto = await readMediaFile(file);
          photoPreview.innerHTML = `
            <span class="pp-compose-media-item">
              <img src="${entryPhoto.url}" alt="${escapeHtml(file.name)}" />
              <button type="button" class="pp-compose-media-remove" id="entry-photo-remove" aria-label="Remove photo">✕</button>
            </span>`;
          photoPreview.hidden = false;
          photoPreview.querySelector('#entry-photo-remove')?.addEventListener('click', () => {
            entryPhoto = null;
            photoPreview.hidden = true;
            photoPreview.innerHTML = '';
          });
        } catch (err) {
          window.showToast(err.message);
        }
        photoInput.value = '';
      });
    }

    const form = root.querySelector('#entry-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Re-validate the window at submit time (modal may have been open across the deadline)
        if (new Date(comp.entryEnd) < new Date()) {
          closeModal();
          window.showToast('Entries for this competition have closed.');
          return;
        }

        const petId = Number(root.querySelector('#entry-pet').value);
        const description = root.querySelector('#entry-desc').value.trim();
        if (!description) { window.showToast('Add a short description first.'); return; }

        const payChoiceEl = root.querySelector('input[name="entry-payment"]:checked');
        const paymentMethod = payChoiceEl ? payChoiceEl.getAttribute('value') : 'free'; // 'points' | 'money'

        const { dbPut } = await import('../db.js');
        const { pushNotification } = await import('../components/notify.js');

        const pet = myPets.find((p) => p.id === petId);
        const moneyFeeKes = moneyFee(comp);

        if (paymentMethod === 'money') {
          const { Payments } = await import('../components/payments.js');
          const outcome = await Payments.openCheckout({
            purpose: 'competition_entry',
            purposeId: `comp_${comp.id}_pet_${petId}`,
            label: `Entry to ${comp.name}`,
            amount: moneyFeeKes,
            currency: 'KES',
            userId: user.id,
          });
          if (outcome !== 'paid' && outcome !== 'bank_pending') return;
          await dbPut('entries', {
            competitionId: comp.id,
            petId,
            ownerId: user.id,
            description,
            photos: entryPhoto ? [entryPhoto] : [],
            votes: 0,
            entryFee: moneyFeeKes,
            entryPaymentType: 'money',
            entryPaymentStatus: outcome === 'paid' ? 'paid' : 'pending_clearance',
            status: 'pending',
            createdAt: new Date().toISOString(),
          });
          await pushNotification({
            userId: user.id,
            title: 'Competition entry submitted',
            body: `${pet.name} is entered in "${comp.name}" — it appears in the finalists once moderators approve it.`,
            type: 'competition',
            link: '/arena',
          });
          window.showToast?.('Entry submitted — it appears after moderation ✓');
          const { navigateTo } = await import('../router.js');
          navigateTo('/arena');
          return;
        }

        const { spendPoints } = await import('../components/points.js');

        // Charged entry: spend the fee before the entry is recorded
        if (isPaid) {
          const result = await spendPoints({
            userId: user.id,
            amount: comp.entryCost,
            source: `Competition entry — ${comp.name}`,
            referenceId: `entry_${comp.id}_${petId}`,
          });
          if (!result.spent) {
            window.showToast(`Entry needs ${comp.entryCost} PawPoints — you have ${result.balance}.`);
            return;
          }
        }

        await dbPut('entries', {
          competitionId: comp.id,
          petId,
          ownerId: user.id,
          description,
          photos: entryPhoto ? [entryPhoto] : [],
          votes: 0,
          entryFee: isPaid ? comp.entryCost : 0,
          // Entries start pending; an admin/moderator approves before voting opens (doc §5.12)
          status: 'pending',
          createdAt: new Date().toISOString(),
        });

        await pushNotification({
          userId: user.id,
          title: 'Competition entry submitted',
          body: `${pet.name} is entered in "${comp.name}" — it appears in the finalists once moderators approve it. Voting closes ${new Date(comp.votingEnd).toLocaleDateString()}.`,
          type: 'competition',
          link: '/arena',
        });

        // Let the moderation team know there is work to do
        await notifyRole('admin', {
          title: 'Competition entry to review',
          body: `${user.name} entered ${pet.name} in "${comp.name}" — pending moderation.`,
          type: 'moderation',
          link: '/admin',
        });

        closeModal();
        window.showToast(`${pet.name} is in the running! 🏆`);
        const { navigateTo } = await import('../router.js');
        navigateTo('/arena');
      });
    }
  },

  async _renderFinalists(container, comp, entries, votes, pets, user) {
    const el = container.querySelector('#arena-finalists');
    if (!el) return; // navigated away mid-render
    // Public finalists: private pets hidden from others; owner always sees theirs
    const compEntries = entries.filter((e) => {
      if (e.competitionId !== comp.id) return false;
      if (e.status && e.status !== 'approved') return false;
      const pet = pets.find((p) => p.id === e.petId);
      if (!pet) return false;
      return pet.visibility !== 'private' || (user && e.ownerId === user.id);
    });
    const voteRecords = votes.filter((v) => v.competitionId === comp.id);
    const petFor = (petId) => pets.find((p) => p.id === petId);
    const voteCount = (entry) => entry.votes || 0;
    const hasVoted = voteRecords.some((v) => v.userId === user.id);
    const sorted = [...compEntries].sort((a, b) => voteCount(b) - voteCount(a)).slice(0, 3);

    if (!sorted.length) { el.innerHTML = ''; return; }

    el.innerHTML = `
      <div class="pp-finalists-heading">
        <div><span class="pp-eyebrow"><span></span> YOUR NEIGHBOURHOOD'S FAVOURITES</span><h2>Meet the finalists</h2></div>
        <span class="pp-finalist-count">${String(compEntries.length).padStart(2, '0')} PETS · NAIROBI</span>
      </div>
      <div class="pp-finalists-grid">
        ${sorted.map((entry, index) => {
          const pet = petFor(entry.petId);
          const name = pet ? pet.name : 'Pet';
          const count = voteCount(entry);
          const isMine = user && entry.ownerId === user.id;
          const photo = entry.photos?.length ? entry.photos[0].url : ENTRY_IMAGES[index % ENTRY_IMAGES.length];
          return `
            <article class="pp-finalist-card">
              <a href="/profile" class="pp-finalist-photo" data-route="/profile">
                <img src="${photo}" alt="${escapeHtml(name)}, a contest finalist" loading="lazy" />
                ${index === 0 ? `<span class="pp-rank-badge">${icon('award', 13)} TOP VOTE GETTER</span>` : ''}
                ${isMine ? `<span class="pp-rank-badge pp-rank-mine">${icon('paw-print', 13)} YOUR PET</span>` : ''}
              </a>
              <div class="pp-finalist-info">
                <span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(entry.description)}</small></span>
                <span class="pp-votes">${icon('heart', 14, { fill: 'currentColor' })} ${count}</span>
              </div>
              <button class="pp-btn pp-btn-outline pp-btn-sm pp-finalist-vote js-vote" data-comp="${comp.id}" data-entry="${entry.id}" ${hasVoted || isMine ? 'disabled' : ''}>
                ${isMine ? `${icon('check', 15)} Your entry` : hasVoted ? `${icon('check', 15)} Voted` : `${icon('heart', 15)} Vote for ${escapeHtml(name)}`}
              </button>
              <button class="pp-finalist-share js-share-entry" data-pet="${escapeHtml(name)}" aria-label="Share this entry">${icon('share', 15)}</button>
            </article>
          `;
        }).join('')}
      </div>
    `;

    el.querySelectorAll('.js-share-entry').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { shareLink } = await import('../components/share.js');
        await shareLink({
          title: `PawPrint Arena — ${comp.name}`,
          text: `Vote for ${btn.getAttribute('data-pet')} in ${comp.name} on PawPrint!`,
          path: '/arena',
        });
      });
    });

    el.querySelectorAll('.js-vote').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const competitionId = Number(btn.getAttribute('data-comp'));
        const entryId = Number(btn.getAttribute('data-entry'));
        const { dbPut, dbGet } = await import('../db.js');
        const { pushNotification } = await import('../components/notify.js');

        // Loophole guards: voting window + one vote per user (doc §5.12)
        if (new Date(comp.votingEnd) < new Date()) { window.showToast('Voting has closed for this competition.'); return; }
        const already = voteRecords.some((v) => v.userId === user.id);
        if (already) { window.showToast('You already voted in this competition.'); return; }

        await dbPut('votes', { competitionId, entryId, userId: user.id, createdAt: new Date().toISOString() });
        const entry = await dbGet('entries', entryId);
        if (entry) {
          entry.votes = (entry.votes || 0) + 1;
          await dbPut('entries', entry);
          // Notify the entry owner (doc §6.1: "New vote" → pet owner)
          if (entry.ownerId && entry.ownerId !== user.id) {
            await pushNotification({
              userId: entry.ownerId,
              title: 'New vote on your entry',
              body: `Someone just voted in "${comp.name}" — your pet now has ${entry.votes} votes.`,
              type: 'competition',
              link: '/arena',
            });
          }
        }
        window.showToast('Vote cast! 🐾');
        const { navigateTo } = await import('../router.js');
        navigateTo('/arena');
      });
    });
  },

  /** Business Rankings (doc §5.13) — transparent weighted scoring. */
  async _renderBusinessRankings(container, user) {
    const el = container.querySelector('#arena-rankings');
    if (!el) return;
    const { dbGetAll } = await import('../db.js');
    const { computeScore, recalcAllRankings, RANKING_WEIGHTS } = await import('../components/ranking.js');
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
      return {
        bookings: bizBookings,
        reviews: bizReviews,
        repeatCustomers: [...usersWith.values()].filter((n) => n > 1).length,
        uniqueCustomers: usersWith.size,
      };
    };

    const scored = businesses
      .map((b) => ({ business: b, score: computeScore(b, statsFor(b.id)).score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    el.innerHTML = `
      <div class="pp-finalists-heading">
        <div><span class="pp-eyebrow"><span></span> THE BUSINESS ARENA</span><h2>Ranked by <span>reputation.</span></h2></div>
        ${user.role === 'admin' ? `<button class="pp-btn pp-btn-outline pp-btn-sm" id="refresh-rankings-btn">${icon('settings', 13)} Refresh rankings</button>` : ''}
      </div>
      <div class="pp-business-rankings">
        ${scored.map(({ business, score }, i) => {
          const movement = business.ranking?.movement;
          const arrow = movement === 'up' ? '↑' : movement === 'down' ? '↓' : '→';
          return `
            <a href="/business/${business.id}" class="pp-ranking-row" data-route="/business/${business.id}">
              <span class="pp-ranking-position">${i + 1}</span>
              <span class="pp-ranking-name"><strong>${escapeHtml(business.name)}</strong><small>${escapeHtml(business.category)} · ${business.verification === 'verified' ? 'Verified' : 'Listed'}</small></span>
              <span class="pp-ranking-movement ${movement || 'steady'}">${arrow}</span>
              <span class="pp-ranking-score">${score.toFixed(1)}<small>/100</small></span>
            </a>`;
        }).join('')}
      </div>
      <p class="pp-demo-note">Scored on verified satisfaction (${RANKING_WEIGHTS.satisfaction}%), reviews (${RANKING_WEIGHTS.reviews}%), completed transactions (${RANKING_WEIGHTS.transactions}%), repeat customers (${RANKING_WEIGHTS.retention}%) and responsiveness (${RANKING_WEIGHTS.responsiveness}%) — advertising never touches this ranking.</p>
    `;

    const refreshBtn = container.querySelector('#refresh-rankings-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = 'Refreshing…';
        await recalcAllRankings();
        window.showToast('Rankings recalculated ✓');
        const { navigateTo } = await import('../router.js');
        navigateTo('/arena');
      });
    }
  },

  /** Business Showdown (doc §5.14): time-limited duel, public voting. */
  async _renderShowdown(container, user) {
    const el = container.querySelector('#arena-showdown');
    if (!el) return;
    const { dbGetAll, dbGetByIndex, dbPut, dbDelete } = await import('../db.js');
    const [showdowns, businesses] = await Promise.all([
      dbGetAll('showdowns'),
      dbGetAll('businesses'),
    ]);
    const showdown = showdowns.find((s) => s.status === 'active');
    if (!showdown) { el.innerHTML = ''; return; }

    const today = Date.now();
    const isLive = today >= new Date(showdown.startDate).getTime() && today <= new Date(showdown.endDate).getTime();
    const daysLeft = Math.max(0, Math.ceil((new Date(showdown.endDate).getTime() - today) / 86400000));
    const contenders = (showdown.businessIds || []).map((id) => businesses.find((b) => b.id === id)).filter(Boolean);

    let votes = [];
    try { votes = await dbGetByIndex('showdownVotes', 'showdownId', showdown.id); } catch (e) { votes = []; }
    const total = votes.length;
    const votesFor = (id) => votes.filter((v) => v.businessId === id).length;
    const myVote = votes.find((v) => v.userId === user.id);

    el.innerHTML = `
      <div class="pp-showdown">
        <div class="pp-showdown-head">
          <div><span class="pp-feature-label">${icon('vote', 13)} ${isLive ? `LIVE SHOWDOWN · ${daysLeft}D LEFT` : 'SHOWDOWN CLOSED'}</span><h3>${escapeHtml(showdown.title)}</h3></div>
          <span class="pp-finalist-count">${escapeHtml(showdown.scope)}</span>
        </div>
        <p class="pp-showdown-story">${escapeHtml(showdown.story)}</p>
        <div class="pp-showdown-contenders">
          ${contenders.map((c) => {
            const count = votesFor(c.id);
            const pct = total ? Math.round((count / total) * 100) : 0;
            return `
              <div class="pp-showdown-contender">
                <strong>${escapeHtml(c.name)}</strong>
                <small>${escapeHtml(c.category)} · ${icon('star', 11, { fill: 'currentColor' })} ${c.rating} · ${(c.services || []).length} services</small>
                <div class="pp-vote-bar"><span style="width:${pct}%"></span></div>
                <button class="pp-btn pp-btn-sm ${myVote?.businessId === c.id ? 'pp-btn-solid' : 'pp-btn-outline'} js-showdown-vote" data-business="${c.id}" data-showdown="${showdown.id}" ${!isLive ? 'disabled' : ''}>
                  ${myVote?.businessId === c.id ? `${icon('check', 13)} Your vote` : icon('heart', 13) + ` Vote for ${escapeHtml(c.name.split(' ')[0])}`} <span class="pp-showdown-votes">${count} · ${pct}%</span>
                </button>
              </div>`;
          }).join('')}
        </div>
        <div class="pp-showdown-meta">
          <span>${icon('award', 12)} Prize: ${escapeHtml(showdown.prize)}</span>
          <span>${icon('sparkles', 12)} Sponsored by ${escapeHtml(showdown.sponsor)}</span>
          <span>${icon('users', 12)} ${total} votes cast</span>
        </div>
      </div>
    `;

    el.querySelectorAll('.js-showdown-vote').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const businessId = Number(btn.getAttribute('data-business'));
        const showdownId = Number(btn.getAttribute('data-showdown'));
        const existing = votes.find((v) => v.userId === user.id);
        if (existing) {
          await dbDelete('showdownVotes', existing.id);
          window.showToast('Vote removed');
        } else {
          await dbPut('showdownVotes', {
            showdownId,
            businessId,
            userId: user.id,
            createdAt: new Date().toISOString(),
          });
          window.showToast('Vote cast — the pack decides 🗳️');
        }
        const { navigateTo } = await import('../router.js');
        navigateTo('/arena');
      });
    });
  },

  /** Full leaderboard (doc §5.12: monitor rankings). */
  _renderLeaderboard(container, comp, entries, pets, user) {
    const el = container.querySelector('#arena-leaderboard');
    if (!el) return;
    const compEntries = entries
      .filter((e) => {
        if (e.competitionId !== comp.id) return false;
        if (e.status && e.status !== 'approved') return false;
        const pet = pets.find((p) => p.id === e.petId);
        if (!pet) return false;
        return pet.visibility !== 'private';
      })
      .sort((a, b) => (b.votes || 0) - (a.votes || 0));

    if (compEntries.length <= 3) { el.innerHTML = ''; return; }

    el.innerHTML = `
      <div class="pp-finalists-heading">
        <div><span class="pp-eyebrow"><span></span> LIVE STANDINGS</span><h2>Full leaderboard</h2></div>
        <span class="pp-finalist-count">UPDATES AS NAIROBI VOTES</span>
      </div>
      <div class="pp-leaderboard">
        ${compEntries.map((entry, index) => {
          const pet = pets.find((p) => p.id === entry.petId);
          const isMine = user && entry.ownerId === user.id;
          return `
            <div class="pp-leader-row${isMine ? ' is-mine' : ''}">
              <span class="pp-leader-rank">${String(index + 1).padStart(2, '0')}</span>
              <span class="pp-leader-pet">${escapeHtml(pet ? pet.name : 'Pet')}<small>${escapeHtml(entry.description)}</small></span>
              <span class="pp-votes">${icon('heart', 13, { fill: 'currentColor' })} ${entry.votes || 0}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },
};
