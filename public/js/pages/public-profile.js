// ============================================================================
// PawPrint — Public user profile (doc §3: Pet Owner persona)
// Anyone can view a pack member's public card — name, role, neighbourhood,
// and their pets. Follow/unfollow from here with no page refresh.
// ============================================================================

import { icon } from '../components/icons.js';
import { escapeHtml } from '../components/sanitize.js';
import { avatarHtml } from '../components/avatar.js';
import { Follows } from '../components/follows.js';

export const PublicProfilePage = {
  pageTitle: 'Profile',

  async render(container, { id }) {
    const { dbGet, dbGetAll } = await import('../db.js');
    const target = await dbGet('users', Number(id));
    if (!target) {
      container.innerHTML = '<div class="pp-standard-page"><p class="pp-empty-state"><span class="empty-title">Person not found</span>This account does not exist.</p></div>';
      return;
    }

    const me = window.Auth.user;
    const businesses = await dbGetAll('businesses');
    const ownsBusiness = businesses.find((b) => b.ownerId === target.id);
    const pets = (await (async () => {
      const { dbGetByIndex } = await import('../db.js');
      return dbGetByIndex('pets', 'ownerId', target.id);
    })());

    const followedIds = me ? await Follows.followingIds(me.id, 'user') : [];
    const isFollowed = followedIds.includes(target.id);

    container.innerHTML = `
      <div class="pp-standard-page">
        <a class="pp-back-link" href="/community" data-route="/community">${icon('chevron-right', 14)} Back to packs</a>

        <section class="pp-public-profile">
          <span class="pp-public-avatar">${avatarHtml({ name: target.name, avatar: target.avatar }, 'pp-post-avatar')}</span>
          <div class="pp-public-copy">
            <span class="pp-eyebrow"><span></span>${target.role === 'business_owner' ? 'LOCAL PET BUSINESS' : 'PET PARENT'}</span>
            <h1>${escapeHtml(target.name)}</h1>
            <p>${escapeHtml(target.location || 'Nairobi, Kenya')}</p>
            <div class="pp-public-actions">
              ${ownsBusiness ? `<a class="pp-btn pp-btn-outline pp-btn-sm" href="/business/${ownsBusiness.id}" data-route="/business/${ownsBusiness.id}">${icon('star', 13)} ${escapeHtml(ownsBusiness.name)}</a>` : ''}
              ${me && me.id !== target.id ? `
                <button class="pp-btn ${isFollowed ? 'pp-btn-outline' : 'pp-btn-solid'} pp-btn-sm js-toggle-follow" data-id="${target.id}">${isFollowed ? 'Following' : `${icon('plus', 13)} Follow`}</button>
                <a class="pp-btn pp-btn-outline pp-btn-sm" href="/messages/${target.id}" data-route="/messages/${target.id}">${icon('message-circle', 15)} Message</a>
              ` : ''}
            </div>
          </div>
        </section>

        ${pets.length ? `
          <div class="pp-finalists-heading">
            <div><span class="pp-eyebrow"><span></span> THE CREW</span><h2>${escapeHtml(target.name.split(' ')[0])}'s pets</h2></div>
            <span class="pp-finalist-count">${pets.length} PET${pets.length === 1 ? '' : 'S'}</span>
          </div>
          <div class="pp-discover-grid">
            ${pets.map((p, i) => {
              const images = ['/images/pawprint-dog-park.jpg', '/images/pawprint-cat-profile.jpg'];
              const primary = p.photos && p.photos.length ? p.photos[0].url : images[i % images.length];
              return `
                <div class="pp-discovery-card">
                  <span class="pp-discovery-image"><img src="${primary}" alt="${escapeHtml(p.name)}" loading="lazy" /><span class="pp-discovery-category">${escapeHtml(p.species)}</span></span>
                  <span class="pp-discovery-details">
                    <span><strong>${escapeHtml(p.name)}</strong><span>${p.breed ? escapeHtml(p.breed) : escapeHtml(p.species)}${p.age ? ` · ${p.age} yr` : ''}</span></span>
                  </span>
                </div>`;
            }).join('')}
          </div>
        ` : ''}
      </div>
    `;

    container.querySelectorAll('.js-toggle-follow').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const followeeId = Number(btn.getAttribute('data-id'));
        const nowFollowing = await Follows.toggle(me.id, 'user', followeeId);
        btn.classList.toggle('pp-btn-solid', !nowFollowing);
        btn.classList.toggle('pp-btn-outline', nowFollowing);
        btn.innerHTML = nowFollowing ? 'Following' : `${icon('plus', 13)} Follow`;
        window.showToast(nowFollowing ? `Following ${target.name.split(' ')[0]} 🐾` : 'Unfollowed');
      });
    });
  },
};
