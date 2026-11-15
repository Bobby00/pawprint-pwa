// ============================================================================
// PawPrint — Adoption & Rescue (doc §5.29)
// Animals from verified rescue organisations: discovery + application.
// PawPrint facilitates; organisations decide. Applications notify admins.
// ============================================================================

import { icon } from '../components/icons.js';
import { escapeHtml } from '../components/sanitize.js';

export const AdoptPage = {
  pageTitle: 'Adopt a pet',

  async render(container) {
    const { dbGetAll } = await import('../db.js');
    const animals = (await dbGetAll('adoptions')).filter((a) => a.status === 'available');
    animals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    container.innerHTML = `
      <div class="pp-standard-page">
        <div class="pp-page-heading">
          <div>
            <div class="pp-eyebrow"><span></span>SECOND CHANCES, FOREVER HOMES</div>
            <h1>Adopt, don't <span>shop.</span></h1>
            <p>Animals from vetted Nairobi rescue organisations — meet them here, apply here, take them home.</p>
          </div>
        </div>

        <div class="pp-adoption-banner">          <span>${icon('heart', 22)}</span>
          <span><strong>One application, real lives saved.</strong><small>We share your application with the rescue — they decide. PawPrint never takes ownership of animals or decides adoptions.</small></span>
        </div>

        <div class="pp-discover-grid" id="adoption-grid">
          ${animals.length ? animals.map((a) => `
            <article class="pp-adoption-card">
              <span class="pp-discovery-image">
                <img src="${a.image || '/images/pawprint-dog-park.jpg'}" alt="${escapeHtml(a.name)}" loading="lazy" />
                <span class="pp-discovery-category">${escapeHtml(a.species)}</span>
              </span>
              <span class="pp-adoption-body">
                <strong>${escapeHtml(a.name)}</strong>
                <small>${escapeHtml(a.breed || a.species)} · ${a.sex} · ${a.age} yrs</small>
                <small class="pp-adoption-org"><button class="js-org-profile pp-adoption-org-link" data-org="${escapeHtml(a.org)}" type="button">${icon('shield-check', 11)} ${escapeHtml(a.org)}</button> · ${escapeHtml(a.location)}</small>
                <button class="pp-btn pp-btn-solid pp-btn-sm js-meet" data-id="${a.id}">${icon('heart', 13)} Meet ${escapeHtml(a.name)}</button>
              </span>
            </article>
          `).join('') : '<p class="pp-empty-state">No animals available right now — every successful adoption is a new story. Check back soon. 🐾</p>'}
        </div>

        <p class="pp-demo-note">All listings are from PawPrint-verified rescue organisations. Verification is based on evidence — never payment.</p>
      </div>
      <div id="adoption-modal-root"></div>
    `;

    container.querySelectorAll('.js-meet').forEach((btn) => {
      btn.addEventListener('click', () => {
        const animal = animals.find((a) => a.id === Number(btn.getAttribute('data-id')));
        if (animal) this._openApplication(container, animal);
      });
    });

    container.querySelectorAll('.js-org-profile').forEach((btn) => {
      btn.addEventListener('click', () => this._openOrgProfile(container, btn.getAttribute('data-org'), animals));
    });
  },

  /** Org profile modal: verified badge, bio, animals awaiting homes (doc §5.29). */
  _openOrgProfile(container, orgName, animals) {
    const escape = escapeHtml;
    const root = container.querySelector('#adoption-modal-root');
    const mine = animals.filter((a) => a.org === orgName);
    const adopted = 0; // adoption stats would come from applications in production

    root.innerHTML = `
      <div class="pp-modal-overlay" id="org-modal">
        <div class="pp-modal">
          <div class="pp-modal-head">
            <h3>${escape(orgName)}</h3>
            <button class="pp-modal-close" aria-label="Close">✕</button>
          </div>
          <div class="pp-org-profile">
            <span class="pp-org-badge">${icon('shield-check', 14)} PawPrint-verified rescue organisation</span>
            <p>Nairobi's trusted network of foster homes and rescue coordinators. Every animal listed here is health-checked, vaccinated and ready for a loving home.</p>
            <div class="pp-org-stats">
              <span><strong>${mine.length}</strong><small>Available now</small></span>
              <span><strong>${adopted || '—'}</strong><small>Rescues placed</small></span>
              <span><strong>100%</strong><small>Verified listings</small></span>
            </div>
            ${mine.length ? `
              <h4>${icon('heart', 14)} Waiting for homes</h4>
              <div class="pp-org-animals">
                ${mine.map((a) => `
                  <button class="pp-org-animal-row js-meet-from-org" data-id="${a.id}">
                    <span class="pp-org-animal-tile">${escape(String(a.species).charAt(0))}</span>
                    <span><strong>${escape(a.name)}</strong><small>${escape(a.breed || a.species)} · ${a.age} yrs</small></span>
                    ${icon('arrow-right', 14)}
                  </button>
                `).join('')}
              </div>
            ` : '<p class="pp-empty-state">No animals currently listed — check back soon.</p>'}
          </div>
        </div>
      </div>
    `;

    const closeModal = () => { root.innerHTML = ''; };
    root.querySelectorAll('.pp-modal-close').forEach((b) => b.addEventListener('click', closeModal));
    root.querySelector('.pp-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    root.querySelectorAll('.js-meet-from-org').forEach((btn) => {
      btn.addEventListener('click', () => {
        closeModal();
        const animal = animals.find((a) => a.id === Number(btn.getAttribute('data-id')));
        if (animal) this._openApplication(container, animal);
      });
    });
  },

  _openApplication(container, animal) {
    const user = window.Auth.user;
    const root = container.querySelector('#adoption-modal-root');

    root.innerHTML = `
      <div class="pp-modal-overlay" id="adoption-modal">
        <div class="pp-modal">
          <div class="pp-modal-head"><h3>Meet ${escapeHtml(animal.name)}</h3><button class="pp-modal-close" aria-label="Close">✕</button></div>
          <div class="pp-adoption-detail">
            <p class="pp-adoption-story">${escapeHtml(animal.description)}</p>
            <span class="pp-adoption-org">${icon('shield-check', 13)} ${escapeHtml(animal.org)} · ${escapeHtml(animal.location)}</span>
          </div>
          <form id="application-form" class="pp-modal-form">
            <span class="pp-form-field"><label for="app-note">Why you and ${escapeHtml(animal.name)}?</label><textarea class="pp-input" id="app-note" rows="3" placeholder="Tell ${escapeHtml(animal.org)} about your home, experience and why you'd be a great fit…" required></textarea></span>
            <span class="pp-form-field"><label for="app-phone">Best phone number</label><input class="pp-input" id="app-phone" type="tel" value="${escapeHtml(user.phone || '')}" placeholder="+254 700 000 000" required></span>
            <p class="pp-demo-note">Your application goes to ${escapeHtml(animal.org)} — they decide. PawPrint facilitates, never decides (doc §5.29).</p>
            <div class="pp-modal-actions">
              <button type="submit" class="pp-btn pp-btn-solid pp-btn-md">${icon('heart', 15)} Submit application</button>
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

    root.querySelector('#application-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const note = root.querySelector('#app-note').value.trim();
      const phone = root.querySelector('#app-phone').value.trim();
      if (!note || !phone) return;
      const { dbPut } = await import('../db.js');
      await dbPut('adoptionApplications', {
        animalId: animal.id,
        animalName: animal.name,
        applicantId: user.id,
        applicantName: user.name,
        note,
        phone,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
      });
      const { notifyRole } = await import('../components/notify.js');
      await notifyRole('admin', {
        title: 'New adoption application',
        body: `${user.name} applied to adopt ${animal.name} (${animal.org}).`,
        type: 'moderation',
        link: '/admin',
      });
      closeModal();
      window.showToast(`Application sent to ${animal.org} — they'll be in touch 💛`);
    });
  },
};
