// ============================================================================
// PawPrint — Notification component
// Toast + bell badge + dropdown list
// ============================================================================

import { escapeHtml } from './sanitize.js';

export const NotificationUI = {
  container: null,
  badge: null,
  dropdown: null,

  init() {
    this.container = document.getElementById('toast-container');
    this.badge = document.getElementById('notif-badge');
    this.dot = document.getElementById('notif-dot');
    this._bind();
  },

  _bind() {
    document.querySelectorAll('.js-notifications-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDropdown(btn);
      });
    });
  },

  toggleDropdown(btn) {
    let dd = document.getElementById('notif-dropdown');
    if (dd) {
      dd.remove();
      return;
    }
    dd = this._buildDropdown();
    document.body.appendChild(dd);
    this._positionDropdown(dd, btn);
    const handler = (e) => {
      if (!dd.contains(e.target) && !btn.contains(e.target)) {
        dd.remove();
        window.removeEventListener('click', handler);
      }
    };
    window.addEventListener('click', handler);
  },

  _positionDropdown(dd, btn) {
    const rect = btn.getBoundingClientRect();
    dd.style.top = `${rect.bottom + 8}px`;
    dd.style.right = `${Math.max(12, window.innerWidth - rect.right)}px`;
    dd.style.left = 'auto';
  },

  _buildDropdown() {
    const dd = document.createElement('div');
    dd.id = 'notif-dropdown';
    dd.className = 'notif-dropdown';
    dd.innerHTML = `
      <div class="notif-dropdown-header">
        <span>Notifications</span>
        <button id="notif-mark-read" class="notif-btn-sm">Mark all read</button>
      </div>
      <div id="notif-list" class="notif-list"></div>
    `;
    const markRead = dd.querySelector('#notif-mark-read');
    markRead.addEventListener('click', () => {
      this.markAllRead();
      dd.querySelectorAll('.notif-item').forEach((el) => el.classList.remove('unread'));
      this.updateBadge(0);
    });
    this.renderList(dd.querySelector('#notif-list'));
    return dd;
  },

  async renderList(listEl) {
    if (!listEl) return;
    const user = (await import('../auth.js')).Auth.user;
    if (!user) {
      listEl.innerHTML = '<div class="notif-empty">Log in to see notifications</div>';
      return;
    }
    const { dbGetByIndex } = await import('../db.js');
    const notifs = await dbGetByIndex('notifications', 'userId', user.id);
    notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (notifs.length === 0) {
      listEl.innerHTML = '<div class="notif-empty">No notifications yet.</div>';
      return;
    }

    listEl.innerHTML = notifs.map((n) => `
      <div class="notif-item ${!n.read ? 'unread' : ''}" data-id="${n.id}" ${n.link ? `data-route="${n.link}"` : ''} role="button" tabindex="0" title="${n.read ? '' : 'Mark as read'}">
        <div class="notif-item-body">
          <div class="notif-title">${escapeHtml(n.title)}</div>
          <div class="notif-body">${escapeHtml(n.body)}</div>
          <div class="notif-time">${formatRelative(n.createdAt)}</div>
        </div>
      </div>
    `).join('');

    // Clicking any notification marks it read; linked ones also navigate
    listEl.querySelectorAll('.notif-item[data-id]').forEach((el) => {
      el.addEventListener('click', async () => {
        const id = Number(el.getAttribute('data-id'));
        const notif = notifs.find((n) => n.id === id);
        if (notif && !notif.read) {
          notif.read = true;
          await dbPut('notifications', notif);
          el.classList.remove('unread');
          await this.refreshBadge();
        }
        const route = el.getAttribute('data-route');
        if (!route) return;
        const dropdown = document.getElementById('notif-dropdown');
        if (dropdown) dropdown.remove();
        window.history.pushState({}, '', route);
        window.dispatchEvent(new CustomEvent('routechange', { detail: { route } }));
      });
    });
  },

  async markAllRead() {
    const user = (await import('../auth.js')).Auth.user;
    if (!user) return;
    const { dbGetByIndex, dbPut } = await import('../db.js');
    const notifs = await dbGetByIndex('notifications', 'userId', user.id);
    await Promise.all(notifs.map((n) => dbPut('notifications', { ...n, read: true })));
    this.updateBadge(0);
  },

  updateBadge(count) {
    if (this.badge) {
      this.badge.textContent = count;
      this.badge.style.display = count > 0 ? 'grid' : 'none';
    }
    if (this.dot) {
      this.dot.style.display = count > 0 ? 'block' : 'none';
    }
  },

  async refreshBadge() {
    const user = (await import('../auth.js')).Auth.user;
    if (!user) { this.updateBadge(0); return; }
    const { dbGetByIndex } = await import('../db.js');
    const notifs = await dbGetByIndex('notifications', 'userId', user.id);
    const unread = notifs.filter((n) => !n.read).length;
    this.updateBadge(unread);
  },

  showToast(message, options = {}) {
    if (!this.container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    if (options.action) {
      const btn = document.createElement('button');
      btn.className = 'toast-action';
      btn.textContent = options.action;
      btn.addEventListener('click', () => {
        if (options.onAction) options.onAction();
        this.container.removeChild(toast);
      });
      toast.appendChild(btn);
    }
    this.container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) this.container.removeChild(toast);
    }, 5000);
  },
};

function formatRelative(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}
