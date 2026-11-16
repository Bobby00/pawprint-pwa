// ============================================================================
// PawPrint — Profile screen (user, pets, PawPoints)
// ============================================================================

import { icon } from '../components/icons.js';
import { readAvatarFile } from '../components/avatar.js';
import { escapeHtml } from '../components/sanitize.js';

export const ProfilePage = {
  pageTitle: 'Profile',

  async render(container) {
    const { dbGetAll, dbGetByIndex } = await import('../db.js');
    const user = window.Auth.user;
    const pets = await dbGetByIndex('pets', 'ownerId', user.id);
    const { getPointsBalance, getExpiringSoon } = await import('../components/points.js');
    const ledger = await dbGetByIndex('pointsLedger', 'userId', user.id);
    const points = await getPointsBalance(user.id);
    const expiringSoon = await getExpiringSoon(user.id, 30);
    const recent = [...ledger].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const referralCode = await window.Auth.ensureReferralCode();

    // Profile completeness (pending information checklist)
    const isPetOwner = user.role === 'pet_owner';
    const checklist = [
      { label: 'Full name', done: !!user.name, fix: 'name' },
      { label: 'Email verified', done: !!user.verified, fix: null },
      { label: 'Phone number', done: !!user.phone, fix: 'phone' },
      { label: 'Neighbourhood', done: !!user.location, fix: 'location' },
      ...(isPetOwner ? [{ label: 'Pet profile created', done: pets.length > 0, fix: 'pet' }] : []),
    ];
    const doneCount = checklist.filter((c) => c.done).length;
    const completeness = Math.round((doneCount / checklist.length) * 100);
    const pending = checklist.filter((c) => !c.done);

    container.innerHTML = `
      <div class="pp-standard-page">
        <div class="pp-page-heading">
          <div><div class="pp-eyebrow"><span></span>YOUR PAWPRINT HOME</div><h1>Profile & <span>PawPoints.</span></h1></div>
          <button class="pp-btn pp-btn-outline pp-btn-md" id="logout-btn">${icon('logout', 15)} Sign out</button>
        </div>

        <div class="pp-profile-placeholder">
          <a href="#" class="pp-points-card is-profile" style="text-decoration:none">
            <span class="pp-points-card-top"><span class="pp-points-stamp">${icon('paw-print', 17)}</span><span class="pp-points-card-label">${user.name.toUpperCase()}</span>${icon('user', 16)}</span>
            <strong class="pp-points-total">${points} <span>pts</span></strong>
            <span class="pp-points-card-bottom"><span>${user.role === 'admin' ? 'Platform admin' : user.role === 'business_owner' ? 'Business owner' : 'Pet owner'} · ${user.location || 'Nairobi'}</span><span class="pp-points-earn">+50 ${icon('sparkles', 12)}</span></span>
            <span class="pp-points-progress"><span></span></span>
          </a>
          <section>
            <div class="pp-profile-avatar-block">
              <span class="pp-profile-avatar" id="profile-avatar">${user.avatar ? `<img class="pp-avatar-img" src="${user.avatar}" alt="${user.name}" />` : user.name.charAt(0).toUpperCase()}</span>
              <div class="pp-profile-avatar-copy">
                <h2>${user.role === 'admin' ? 'PawPrint Admin' : user.name}</h2>
                <p>${user.role === 'admin'
                  ? 'You manage competitions, businesses, events and content from the admin console.'
                  : pets.length ? `${pets.length} pet${pets.length > 1 ? 's' : ''} · ${points} PawPoints` : 'Add your first pet to join competitions and earn PawPoints.'}</p>
                <button class="pp-btn pp-btn-outline pp-btn-sm" id="change-avatar-btn">${icon('image', 13)} ${user.avatar ? 'Change photo' : 'Add photo'}</button>
                ${user.avatar ? `<button class="pp-btn pp-btn-ghost pp-btn-sm pp-avatar-remove" id="remove-avatar-btn">Remove</button>` : ''}
                <input type="file" id="avatar-input" accept="image/*" hidden>
                <a href="${user.role === 'admin' ? '/admin' : '/pet-profile'}" data-route="${user.role === 'admin' ? '/admin' : '/pet-profile'}">${user.role === 'admin' ? 'Open admin console' : 'Add a pet'} ${icon('arrow-right', 14)}</a>
              </div>
            </div>
          </section>
        </div>

        ${user.role !== 'admin' ? `
          <div class="pp-referral-card">
            <span class="pp-referral-icon">${icon('users', 20)}</span>
            <span class="pp-referral-copy">
              <strong>Invite a friend, earn 100 PawPoints</strong>
              <small>Share your code — you get 100 PawPoints when they join and complete their first pet profile.</small>
              <span class="pp-referral-code-row">
                <code class="pp-referral-code" id="referral-code">${referralCode}</code>
                <button class="pp-btn pp-btn-outline pp-btn-sm" id="copy-referral">${icon('arrow-right', 13)} Copy invite link</button>
              </span>
            </span>
          </div>
        ` : ''}

        <div class="pp-profile-progress">
          <div class="pp-profile-progress-head">
            <strong>Profile ${completeness}% complete</strong>
            <button class="pp-btn pp-btn-outline pp-btn-sm" id="edit-profile-btn">${icon('settings', 13)} Edit profile</button>
          </div>
          <div class="pp-progress-track"><span style="width:${completeness}%"></span></div>
          ${pending.length
            ? `<small class="pp-progress-pending">Still pending: ${pending.map((p) => p.label).join(' · ')}</small>`
            : '<small class="pp-progress-pending">Everything is filled in — you\'re all set! 🐾</small>'}
        </div>

        <div class="pp-profile-links">
          <button class="pp-profile-link js-share-profile" id="share-profile-btn" type="button">${icon('share', 17)} <span><strong>Share my profile</strong><small>Invite friends — earn 100 PawPoints each activated pet parent</small></span>${icon('arrow-right', 15)}</button>          ${user.role !== 'admin' ? `<a href="/rewards" class="pp-profile-link" data-route="/rewards">${icon('sparkles', 17)} <span><strong>Browse rewards</strong><small>Spend PawPoints on treats and services</small></span>${icon('chevron-right', 15)}</a>` : ''}
          ${user.role === 'business_owner' ? `<a href="/dashboard" class="pp-profile-link" data-route="/dashboard">${icon('settings', 17)} <span><strong>Open business dashboard</strong><small>Bookings, reviews and your listing</small></span>${icon('chevron-right', 15)}</a>` : ''}
          <a href="/settings" class="pp-profile-link" data-route="/settings">${icon('settings', 17)} <span><strong>Account settings</strong><small>Notifications, password and deactivation</small></span>${icon('chevron-right', 15)}</a>
        </div>

        ${pets.length ? `
          <div class="pp-finalists-heading">
            <div><span class="pp-eyebrow"><span></span> YOUR CREW</span><h2>Your pets</h2></div>
            <span class="pp-finalist-count">${String(pets.length).padStart(2, '0')} PETS</span>
          </div>
          <div class="pp-discover-grid">
            ${pets.map((p, i) => {
              const images = ['/images/pawprint-dog-park.jpg', '/images/pawprint-cat-profile.jpg'];
              const primary = p.photos && p.photos.length ? p.photos[0].url : images[i % images.length];
              return `
                <div class="pp-discovery-card" data-pet="${p.id}">
                  <span class="pp-discovery-image"><img src="${primary}" alt="${p.name}" loading="lazy" data-lightbox="pet-${p.id}" data-lightbox-src="${primary}" data-lightbox-caption="${escapeHtml(p.name)}" /><span class="pp-discovery-category">${p.species}</span></span>
                  <span class="pp-discovery-details">
                    <span><strong>${escapeHtml(p.name)}</strong><span>${p.breed || p.species}${p.age ? ` · ${p.age} yr` : ''} · ${(p.photos || []).length} photo${(p.photos || []).length === 1 ? '' : 's'}</span></span>
                    <span class="pp-rating">${icon('star', 13, { fill: 'currentColor' })} ${(p.achievements || []).length}</span>
                  </span>
                  <div class="pp-pet-photos">
                    ${(p.photos || []).slice(0, 4).map((photo, j) => `<span class="pp-pet-photo-thumb"><img src="${photo.url}" alt="${escapeHtml(photo.name || p.name)}" data-lightbox="pet-photos-${p.id}" data-lightbox-src="${photo.url}" data-lightbox-caption="${escapeHtml(photo.name || p.name)}" /><button class="pp-pet-photo-remove" data-pet="${p.id}" data-index="${j}" aria-label="Remove photo">✕</button></span>`).join('')}
                  </div>
                  <span class="pp-pet-photo-add">
                    <button class="pp-btn pp-btn-outline pp-btn-sm js-pet-photo" data-pet="${p.id}">${icon('image', 13)} Add photo</button>
                    <button class="pp-btn pp-btn-outline pp-btn-sm js-share-pet" data-name="${escapeHtml(p.name)}" aria-label="Share ${escapeHtml(p.name)}">${icon('share', 13)} Share</button>
                    <button class="pp-btn pp-btn-outline pp-btn-sm js-edit-pet" data-pet="${p.id}">${icon('settings', 13)} Edit</button>
                    <button class="pp-btn pp-btn-ghost pp-btn-sm js-pet-visibility" data-pet="${p.id}" data-visible="${p.visibility || 'public'}" aria-label="Toggle visibility">${icon(p.visibility === 'private' ? 'shield-check' : 'users', 13)} ${p.visibility === 'private' ? 'Private' : 'Public'}</button>
                    <button class="pp-btn pp-btn-ghost pp-btn-sm pp-pet-delete" data-pet="${p.id}" data-name="${escapeHtml(p.name)}" aria-label="Remove ${escapeHtml(p.name)}">${icon('menu', 13)} Remove</button>
                    <input type="file" accept="image/*" class="js-pet-photo-input" data-pet="${p.id}" hidden>
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        ${expiringSoon > 0 ? `<div class="pp-expiry-banner">${icon('sparkles', 14)} <strong>${expiringSoon} PawPoints</strong> expire within 30 days — spend them on the rewards store before they go.</div>` : ''}
        <div class="pp-community-feed-title"><h2>PawPoints activity</h2><span class="pp-finalist-count">LEDGER</span></div>
        <div class="pp-points-ledger" id="pp-ledger-track">
          ${recent.length ? recent.map((t, i) => `
            <div class="pp-side-event${i >= 5 ? ' pp-ledger-extra' : ''}" ${i >= 5 ? 'hidden' : ''}>
              <span class="pp-event-date is-yellow"><strong>${t.type === 'earn' ? '+' : '−'}</strong><small>${t.amount}</small></span>
              <span class="pp-event-info"><strong>${t.source}</strong><small>${new Date(t.createdAt).toLocaleDateString()} · ${t.status}</small></span>
              <span class="pp-votes">${icon('sparkles', 14)} PawPoints</span>
            </div>
          `).join('') : '<p class="pp-empty-state">No points yet — complete your pet profile to earn 50.</p>'}
        </div>
        ${recent.length > 5 ? `<button class="pp-btn pp-btn-ghost pp-btn-sm pp-ledger-toggle" id="ledger-toggle">${icon('chevron-right', 13)} Show all ${recent.length} transactions</button>` : ''}
      </div>
    `;

    const ledgerToggle = container.querySelector('#ledger-toggle');
    if (ledgerToggle) {
      ledgerToggle.addEventListener('click', () => {
        const extras = container.querySelectorAll('.pp-ledger-extra');
        const collapsed = extras[0]?.hasAttribute('hidden');
        extras.forEach((el) => el.toggleAttribute('hidden', !collapsed));
        ledgerToggle.innerHTML = collapsed
          ? `${icon('chevron-right', 13)} Show less`
          : `${icon('chevron-right', 13)} Show all ${recent.length} transactions`;
      });
    }

    // Share my profile (doc P0: shareable public pages)
    const shareBtn = container.querySelector('#share-profile-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const { shareLink } = await import('../components/share.js');
        await shareLink({
          title: `${user.name} on PawPrint`,
          text: `Meet ${user.name.split(' ')[0]} on PawPrint — Nairobi's pet community!`,
          path: '/profile',
        });
      });
    }

    container.querySelector('#logout-btn').addEventListener('click', () => {
      window.Auth.logout();
      window.showToast('Signed out. See you soon 🐾');
      const { renderRoute } = window.__ppRouter || {};
      if (renderRoute) renderRoute('/login');
      else { window.history.pushState({}, '', '/login'); window.dispatchEvent(new CustomEvent('routechange', { detail: { route: '/login' } })); }
    });

    const copyBtn = container.querySelector('#copy-referral');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const link = `${window.location.origin}/register?ref=${referralCode}`;
        try {
          await navigator.clipboard.writeText(link);
          window.showToast('Invite link copied 💛');
        } catch (e) {
          window.showToast(`Your invite link: ${link}`, { action: 'OK' });
        }
      });
    }

    // Change / remove avatar
    const changeBtn = container.querySelector('#change-avatar-btn');
    const avatarInput = container.querySelector('#avatar-input');
    if (changeBtn && avatarInput) {
      changeBtn.addEventListener('click', () => avatarInput.click());
      avatarInput.addEventListener('change', async () => {
        const file = avatarInput.files && avatarInput.files[0];
        if (!file) return;
        try {
          const dataUrl = await readAvatarFile(file);
          const { dbGet, dbPut } = await import('../db.js');
          const record = await dbGet('users', user.id);
          record.avatar = dataUrl;
          await dbPut('users', record);
          const { password: _pw, ...safe } = record;
          window.Auth.user = safe;
          const { Nav } = await import('../components/nav.js');
          Nav.updateUser(safe);
          window.showToast('Photo updated 📸');
          const { navigateTo } = await import('../router.js');
          navigateTo('/profile');
        } catch (err) {
          window.showToast(err.message);
        }
      });
    }

    const removeBtn = container.querySelector('#remove-avatar-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', async () => {
        const { dbGet, dbPut } = await import('../db.js');
        const record = await dbGet('users', user.id);
        record.avatar = null;
        await dbPut('users', record);
        const { password: _pw, ...safe } = record;
        window.Auth.user = safe;
        const { Nav } = await import('../components/nav.js');
        Nav.updateUser(safe);
        window.showToast('Photo removed');
        const { navigateTo } = await import('../router.js');
        navigateTo('/profile');
      });
    }

    // Pet photo upload / remove
    container.querySelectorAll('.js-pet-visibility').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const petId = Number(btn.getAttribute('data-pet'));
        const { dbGet, dbPut } = await import('../db.js');
        const pet = await dbGet('pets', petId);
        if (!pet) return;
        pet.visibility = pet.visibility === 'private' ? 'public' : 'private';
        await dbPut('pets', pet);
        window.showToast(pet.visibility === 'private' ? 'Pet is now private 🐾' : 'Pet is public again 🐾');
        const { navigateTo } = await import('../router.js');
        navigateTo('/profile');
      });
    });

    container.querySelectorAll('.js-edit-pet').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pet = pets.find((p) => p.id === Number(btn.getAttribute('data-pet')));
        if (pet) this._openEditPet(container, pet);
      });
    });

    container.querySelectorAll('.pp-pet-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const petId = Number(btn.getAttribute('data-pet'));
        const name = btn.getAttribute('data-name');
        if (!window.confirm(`Remove ${name} from your pack? Their profile and photos will be deleted.`)) return;
        const { dbDelete } = await import('../db.js');
        await dbDelete('pets', petId);
        window.showToast(`${name} removed — forever in our hearts 🐾`);
        const { navigateTo } = await import('../router.js');
        navigateTo('/profile');
      });
    });

    container.querySelectorAll('.js-share-pet').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { shareLink } = await import('../components/share.js');
        await shareLink({
          title: `${btn.getAttribute('data-name')} on PawPrint`,
          text: `Meet ${btn.getAttribute('data-name')} 🐾 — say hello on PawPrint!`,
          path: '/profile',
        });
      });
    });

    container.querySelectorAll('.js-pet-photo').forEach((btn) => {
      btn.addEventListener('click', () => {
        const petId = btn.getAttribute('data-pet');
        const input = container.querySelector(`.js-pet-photo-input[data-pet="${petId}"]`);
        if (input) input.click();
      });
    });
    container.querySelectorAll('.js-pet-photo-input').forEach((input) => {
      input.addEventListener('change', async () => {
        const petId = Number(input.getAttribute('data-pet'));
        const file = input.files && input.files[0];
        if (!file) return;
        try {
          const dataUrl = await readAvatarFile(file);
          const { dbGet, dbPut } = await import('../db.js');
          const pet = await dbGet('pets', petId);
          pet.photos = Array.isArray(pet.photos) ? [...pet.photos, { type: 'image', url: dataUrl, name: file.name }] : [{ type: 'image', url: dataUrl, name: file.name }];
          await dbPut('pets', pet);
          window.showToast('Photo added to your pack 📸');
          const { navigateTo } = await import('../router.js');
          navigateTo('/profile');
        } catch (err) {
          window.showToast(err.message);
        }
      });
    });
    container.querySelectorAll('.pp-pet-photo-remove').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const petId = Number(btn.getAttribute('data-pet'));
        const index = Number(btn.getAttribute('data-index'));
        const { dbGet, dbPut } = await import('../db.js');
        const pet = await dbGet('pets', petId);
        (pet.photos || []).splice(index, 1);
        await dbPut('pets', pet);
        window.showToast('Photo removed');
        const { navigateTo } = await import('../router.js');
        navigateTo('/profile');
      });
    });

    const editBtn = container.querySelector('#edit-profile-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const modalRoot = document.createElement('div');
        modalRoot.innerHTML = `
          <div class="pp-modal-overlay" id="edit-profile-modal">
            <div class="pp-modal">
              <div class="pp-modal-head"><h3>Edit profile</h3><button class="pp-modal-close" aria-label="Close">✕</button></div>
              <form id="edit-profile-form" class="pp-modal-form">
                <span class="pp-form-field"><label for="ep-name">Full name</label><input class="pp-input" id="ep-name" type="text" value="${user.name || ''}" required></span>
                <span class="pp-form-field"><label for="ep-phone">Phone number</label><input class="pp-input" id="ep-phone" type="tel" value="${user.phone || ''}" placeholder="+254 700 000 000"></span>
                <span class="pp-form-field"><label for="ep-location">Neighbourhood</label><input class="pp-input" id="ep-location" type="text" value="${user.location || ''}" placeholder="Westlands, Nairobi"></span>
                <div class="pp-modal-actions">
                  <button type="submit" class="pp-btn pp-btn-solid pp-btn-md">${icon('check', 15)} Save changes</button>
                  <button type="button" class="pp-btn pp-btn-ghost pp-btn-md pp-modal-dismiss">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        `;
        document.body.appendChild(modalRoot);
        const close = () => modalRoot.remove();
        modalRoot.querySelectorAll('.pp-modal-close, .pp-modal-dismiss').forEach((b) => b.addEventListener('click', close));
        modalRoot.querySelector('.pp-modal-overlay').addEventListener('click', (e) => {
          if (e.target === e.currentTarget) close();
        });
        modalRoot.querySelector('#edit-profile-form').addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const { dbGet, dbPut } = await import('../db.js');
          const record = await dbGet('users', user.id);
          record.name = modalRoot.querySelector('#ep-name').value.trim() || record.name;
          record.phone = modalRoot.querySelector('#ep-phone').value.trim() || null;
          record.location = modalRoot.querySelector('#ep-location').value.trim() || null;
          await dbPut('users', record);
          const { password: _pw, ...safe } = record;
          window.Auth.user = safe;
          close();
          window.showToast('Profile updated ✓');
          const { navigateTo } = await import('../router.js');
          navigateTo('/profile');
        });
      });
    }
  },

  /** Edit pet details (doc §5.5: edit pet information). */
  _openEditPet(container, pet) {
    const modalRoot = document.createElement('div');
    modalRoot.innerHTML = `
      <div class="pp-modal-overlay" id="edit-pet-modal">
        <div class="pp-modal">
          <div class="pp-modal-head"><h3>Edit ${escapeHtml(pet.name)}</h3><button class="pp-modal-close" aria-label="Close">✕</button></div>
          <form id="edit-pet-form" class="pp-modal-form">
            <span class="pp-form-field"><label for="ep-name">Pet name *</label><input class="pp-input" id="ep-name" type="text" value="${escapeHtml(pet.name)}" required></span>
            <div class="pp-form-row">
              <span class="pp-form-field"><label for="ep-species">Species *</label>
                <select class="pp-input" id="ep-species">
                  ${['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'].map((s) => `<option value="${s}" ${pet.species === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
              </span>
              <span class="pp-form-field"><label for="ep-breed">Breed</label><input class="pp-input" id="ep-breed" type="text" value="${escapeHtml(pet.breed || '')}"></span>
            </div>
            <div class="pp-form-row">
              <span class="pp-form-field"><label for="ep-age">Age (years)</label><input class="pp-input" id="ep-age" type="number" min="0" value="${pet.age || ''}"></span>
              <span class="pp-form-field"><label for="ep-gender">Gender</label>
                <select class="pp-input" id="ep-gender">
                  <option value="" ${!pet.gender ? 'selected' : ''}>Select</option>
                  <option value="Male" ${pet.gender === 'Male' ? 'selected' : ''}>Male</option>
                  <option value="Female" ${pet.gender === 'Female' ? 'selected' : ''}>Female</option>
                </select>
              </span>
            </div>
            <span class="pp-form-field"><label for="ep-personality">Personality</label><input class="pp-input" id="ep-personality" type="text" value="${escapeHtml(pet.personality || '')}"></span>
            <span class="pp-form-field"><label for="ep-interests">Interests (comma separated)</label><input class="pp-input" id="ep-interests" type="text" value="${escapeHtml((pet.interests || []).join(', '))}"></span>
            <span class="pp-form-field"><label for="ep-bio">Biography</label><textarea class="pp-input" id="ep-bio" rows="3">${escapeHtml(pet.bio || '')}</textarea></span>
            <div class="pp-modal-actions">
              <button type="submit" class="pp-btn pp-btn-solid pp-btn-md">${icon('check', 15)} Save changes</button>
              <button type="button" class="pp-btn pp-btn-ghost pp-btn-md pp-modal-dismiss">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modalRoot);

    const close = () => modalRoot.remove();
    modalRoot.querySelectorAll('.pp-modal-close, .pp-modal-dismiss').forEach((b) => b.addEventListener('click', close));
    modalRoot.querySelector('.pp-modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) close();
    });

    modalRoot.querySelector('#edit-pet-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const { dbPut } = await import('../db.js');
      pet.name = modalRoot.querySelector('#ep-name').value.trim() || pet.name;
      pet.species = modalRoot.querySelector('#ep-species').value;
      pet.breed = modalRoot.querySelector('#ep-breed').value.trim() || null;
      pet.age = parseInt(modalRoot.querySelector('#ep-age').value) || null;
      pet.gender = modalRoot.querySelector('#ep-gender').value || null;
      pet.personality = modalRoot.querySelector('#ep-personality').value.trim() || null;
      pet.interests = modalRoot.querySelector('#ep-interests').value.split(',').map((s) => s.trim()).filter(Boolean);
      pet.bio = modalRoot.querySelector('#ep-bio').value.trim() || null;
      await dbPut('pets', pet);
      close();
      window.showToast(`${pet.name}'s profile updated ✓`);
      const { navigateTo } = await import('../router.js');
      navigateTo('/profile');
    });
  },
};
