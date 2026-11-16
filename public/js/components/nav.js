// ============================================================================
// PawPrint — Navigation (rail + bottom nav + header details)
// ============================================================================

import { icon } from './icons.js';

const NAV_ITEMS = [
  { label: 'Home', to: '/', icon: 'home' },
  { label: 'Discover', to: '/discover', icon: 'compass' },
  { label: 'Arena', to: '/arena', icon: 'trophy' },
  { label: 'Community', to: '/community', icon: 'users' },
  { label: 'Profile', to: '/profile', icon: 'user' },
];

// Secondary destinations
const MORE_ITEMS = [
  { label: 'Messages', to: '/messages', icon: 'message-circle', badge: true },
  { label: 'Challenges', to: '/challenges', icon: 'check', badge: true },
  { label: 'Rewards', to: '/rewards', icon: 'sparkles', badge: true },
  { label: 'Adopt a pet', to: '/adopt', icon: 'heart', badge: true },
  { label: 'Settings', to: '/settings', icon: 'settings' },
  { label: 'Business dashboard', to: '/dashboard', icon: 'settings', businessOnly: true },
  { label: 'Admin console', to: '/admin', icon: 'shield-check', adminOnly: true },
];

export const Nav = {
  init() {
    this._buildRailNav();
    this._buildBottomNav();
    this._buildMoreLinks();
    this._bindMoreSheet();
    this._decorateShell();
    this._bindRouteLinks();
  },

  _buildRailNav() {
    const railNav = document.getElementById('rail-nav');
    if (!railNav) return;
    railNav.innerHTML = NAV_ITEMS.map(({ label, to, icon: name }) => `
      <a href="${to}" class="pp-nav-link" data-route="${to}" aria-current="false">
        ${icon(name, 19)}<span>${label}</span>
        ${label === 'Arena' ? '<span class="pp-nav-new">LIVE</span>' : ''}
      </a>
    `).join('');
  },

  _buildMoreLinks() {
    const role = window.Auth?.user?.role;
    const isAdmin = role === 'admin';
    const isBusinessOwner = role === 'business_owner';

    const visible = MORE_ITEMS.filter((item) => {
      if (item.adminOnly) return isAdmin;
      if (item.businessOnly) return isBusinessOwner || isAdmin;
      return true;
    });

    const railMore = document.getElementById('rail-more');
    if (railMore) {
      railMore.innerHTML = visible.map(({ label, to, icon: name, badge }) => `
        <a href="${to}" class="pp-rail-more-link" data-route="${to}" data-more-to="${to}">
          ${icon(name, 16)}<span>${label}</span>${badge ? `<span class="pp-count-badge" data-count-for="${to}" hidden>0</span>` : ''}
        </a>
      `).join('');
    }

    const grid = document.getElementById('more-sheet-grid');
    if (grid) {
      grid.innerHTML = visible.map(({ label, to, icon: name, badge }) => `
        <a href="${to}" class="pp-more-tile" data-route="${to}" data-more-to="${to}">
          <span class="pp-more-tile-icon">${icon(name, 22)}${badge ? `<span class="pp-count-badge pp-count-badge-on-icon" data-count-for="${to}" hidden>0</span>` : ''}</span>
          <span>${label}</span>
        </a>
      `).join('');
    }
  },

  /** Refresh the unread-count badges on MORE items + notification bell. */
  async refreshNavCounts() {
    const set = (route, count) => {
      document.querySelectorAll(`[data-count-for="${route}"]`).forEach((el) => {
        el.textContent = String(count);
        el.hidden = count <= 0;
      });
    };
    try {
      const user = window.Auth?.user;
      if (!user) { ['/messages', '/challenges', '/adopt', '/rewards'].forEach((r) => set(r, 0)); return; }
      const { dbGetByIndex, dbGetAll } = await import('../db.js');
      const [unreadMessages, _unreadNotifs, allChallenges, participations, allRewards, allAdoptions] = await Promise.all([
        dbGetByIndex('messages', 'toUserId', user.id).then((m) => m.filter((x) => !x.read).length),
        dbGetByIndex('notifications', 'userId', user.id).then((n) => n.filter((x) => !x.read).length),
        dbGetAll('challenges'),
        dbGetByIndex('challengeParticipations', 'userId', user.id),
        dbGetAll('rewards'),
        dbGetAll('adoptions'),
      ]);
      const joinedUncompleted = participations.filter((p) => p.status === 'joined').length;
      const myJoinable = allChallenges.filter((c) => {
        const now = Date.now();
        return new Date(c.endDate).getTime() > now;
      }).length - participations.length;
      set('/messages', unreadMessages);
      set('/challenges', Math.max(0, myJoinable) + joinedUncompleted);
      set('/adopt', allAdoptions.filter((a) => a.status === 'available').length);
      set('/rewards', allRewards.filter((r) => r.available !== false).length);
    } catch (e) { /* counts are best-effort */ }
  },

  _buildBottomNav() {
    const bottomNav = document.getElementById('bottom-nav');
    if (!bottomNav) return;
    bottomNav.innerHTML = NAV_ITEMS.map(({ label, to, icon: name }) => `
      <a href="${to}" class="pp-bottom-link" data-route="${to}" aria-current="false">
        ${icon(name, 20)}<span>${label}</span>
      </a>
    `).join('') + `
      <button class="pp-bottom-link pp-bottom-more" id="more-nav-btn" aria-haspopup="dialog" aria-controls="more-sheet">
        ${icon('menu', 20)}<span>More</span>
      </button>
    `;
  },

  _bindMoreSheet() {
    const sheet = document.getElementById('more-sheet');
    if (!sheet) return;
    const closeBtn = document.getElementById('more-sheet-close');

    document.addEventListener('click', (e) => {
      if (e.target.closest('#more-nav-btn')) { sheet.hidden = false; return; }
      if (e.target === closeBtn) { sheet.hidden = true; return; }
      if (e.target.closest('.pp-more-tile')) { sheet.hidden = true; return; }
      if (!e.target.closest('.pp-more-sheet') && !e.target.closest('#more-nav-btn') && !sheet.hidden) {
        sheet.hidden = true;
      }
    });
  },

  _decorateShell() {
    // Brand marks and static icons
    const set = (id, svg) => { const el = document.getElementById(id); if (el) el.innerHTML = svg; };
    set('mobile-brand-mark', icon('paw-print', 23, { strokeWidth: 2.8 }));
    set('rail-brand-mark', icon('paw-print', 24, { strokeWidth: 2.8 }));
    set('rail-pin-icon', icon('map-pin', 15));
    document.querySelectorAll('.rail-chevron').forEach((el) => { el.innerHTML = icon('chevron-right', 14); });
    document.querySelectorAll('.rail-arrow').forEach((el) => { el.innerHTML = icon('arrow-right', 16); });
    set('rail-challenge-icon', icon('trophy', 20));
    set('rail-join-icon', icon('plus', 17));
    set('rail-help-icon', icon('circle-help', 14));
    set('topbar-sparkles', icon('sparkles', 15));
    set('topbar-messages-icon', icon('message-circle', 19));
    set('mobile-messages-icon', icon('message-circle', 19));
    set('mobile-bell-icon', icon('bell', 19));
    document.querySelectorAll('.js-notifications-btn').forEach((el) => {
      if (!el.querySelector('.js-bell-icon')) {
        const span = document.createElement('span');
        span.className = 'js-bell-icon';
        span.innerHTML = icon('bell', 19);
        el.prepend(span);
      }
    });
    const topJoin = document.getElementById('topbar-join-link');
    if (topJoin) topJoin.innerHTML = `${icon('plus', 15)} <span class="pp-top-join-label">Join the pack</span>`;
  },

  /** Show the signed-in user's live PawPoints balance in the topbar pill. */
  async refreshPointsPill() {
    const pill = document.querySelector('.pp-points-pill');
    if (!pill) return;
    const user = window.Auth?.user;
    if (!user || user.role === 'admin') {
      pill.innerHTML = `${icon('sparkles', 15)} <span>Earn PawPoints</span>`;
      return;
    }
    try {
      const { getPointsBalance } = await import('../components/points.js');
      const balance = await getPointsBalance(user.id);
      pill.innerHTML = `${icon('sparkles', 15)} <span>${balance} pts</span>`;
    } catch (e) { /* pill is best-effort */ }
  },

  _bindRouteLinks() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-route]');
      if (!link) return;
      const route = link.getAttribute('data-route');
      if (!route) return;
      e.preventDefault();
      window.history.pushState({}, '', route);
      window.dispatchEvent(new CustomEvent('routechange', { detail: { route } }));
    });
  },

  updateActiveRoute(path) {
    document.querySelectorAll('.pp-nav-link, .pp-bottom-link').forEach((item) => {
      const route = item.getAttribute('data-route');
      const isActive = route === path || (route === '/' && path === '/');
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  },

  // Fill user identity into rail + mobile header after login
  async updateUser(user) {
    if (!user) return;
    const initial = (user.name || 'U').charAt(0).toUpperCase();
    const isAdmin = user.role === 'admin';

    const avatarEl = document.getElementById('user-avatar');
    const railAvatar = document.getElementById('rail-avatar');
    const railName = document.getElementById('rail-user-name');
    const railSub = document.getElementById('rail-user-sub');

    const fillAvatar = (el) => {
      if (!el) return;
      if (user.avatar) {
        el.innerHTML = `<img class="pp-avatar-img" src="${user.avatar}" alt="${user.name || ''}" />`;
        el.classList.add('pp-avatar-photo');
      } else {
        el.classList.remove('pp-avatar-photo');
        el.textContent = initial;
      }
    };
    fillAvatar(avatarEl);
    fillAvatar(railAvatar);
    if (railName) railName.textContent = user.name;
    if (railSub) {
      const roleLabel = isAdmin ? 'Platform admin' : user.role === 'business_owner' ? 'Business' : 'Pet owner';
      railSub.textContent = `View profile · ${roleLabel}`;
    }

    // Admins manage the platform, not pets: hide owner-facing "add pet" CTAs
    document.querySelectorAll('.pp-rail-join, .pp-top-join').forEach((el) => {
      el.classList.toggle('hidden', isAdmin);
    });

    // Role may have changed since init (e.g. fresh login on a seeded page)
    this._buildMoreLinks();
    await this.refreshNavCounts();
  },
};
