// ============================================================================
// PawPrint — Direct messages (doc §5.9 / module 01: private messaging)
// Two-pane conversations: thread list with unread counts + active thread.
// Messages are stored locally (demo); reads mark themselves read on open.
// ============================================================================

import { icon } from '../components/icons.js';
import { escapeHtml } from '../components/sanitize.js';
import { avatarHtml } from '../components/avatar.js';

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Count unread messages addressed to this user. */
export async function countUnread(userId) {
  const { dbGetByIndex } = await import('../db.js');
  const rows = await dbGetByIndex('messages', 'toUserId', userId);
  return rows.filter((m) => !m.read).length;
}

/** Refresh the topbar message badge (desktop + mobile). */
export async function refreshMessageBadge() {
  const dots = [document.getElementById('messages-dot'), document.getElementById('mobile-messages-dot')].filter(Boolean);
  try {
    const user = window.Auth?.user;
    if (!user) {
      dots.forEach((d) => { d.style.display = 'none'; });
      return;
    }
    const unread = await countUnread(user.id);
    dots.forEach((d) => {
      if (!unread) { d.style.display = 'none'; return; }
      d.textContent = String(unread);
      d.style.display = 'grid';
    });
  } catch (e) { /* badge is best-effort */ }
}

export const MessagesPage = {
  pageTitle: 'Messages',

  async render(container, params = {}) {
    const user = window.Auth.user;
    const { dbGetAll, dbGet, dbPut } = await import('../db.js');
    const [all, users] = await Promise.all([dbGetAll('messages'), dbGetAll('users')]);
    const partnerOf = (m) => (m.fromUserId === user.id ? m.toUserId : m.fromUserId);
    const myThreads = all.filter((m) => m.fromUserId === user.id || m.toUserId === user.id);

    // Build partner list with last message + unread count
    const partnerIds = [...new Set(myThreads.map(partnerOf))];
    const partners = partnerIds
      .map((id) => {
        const msgs = myThreads
          .filter((m) => partnerOf(m) === id)
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return {
          id,
          person: users.find((u) => u.id === id),
          last: msgs[msgs.length - 1],
          unread: msgs.filter((m) => m.toUserId === user.id && !m.read).length,
        };
      })
      .filter((p) => p.person)
      .sort((a, b) => new Date(b.last?.createdAt || 0) - new Date(a.last?.createdAt || 0));

    const activeId = params.userId ? Number(params.userId) : (partners[0]?.id ?? null);

    container.innerHTML = `
      <div class="pp-standard-page">
        <div class="pp-page-heading"><div><div class="pp-eyebrow"><span></span>YOUR CIRCLE</div><h1>Messages<span>.</span></h1></div></div>
        <div class="pp-messages-layout">
          <aside class="pp-conversation-list" id="conversation-list">
            ${partners.length ? partners.map((p) => `
              <a href="/messages/${p.id}" class="pp-conversation-item ${p.id === activeId ? 'is-active' : ''}" data-route="/messages/${p.id}">
                ${avatarHtml({ name: p.person.name, avatar: p.person.avatar }, 'pp-post-avatar')}
                <span class="pp-conversation-copy"><strong>${escapeHtml(p.person.name)}</strong><small>${escapeHtml((p.last?.text || '').slice(0, 46))}${(p.last?.text || '').length > 46 ? '…' : ''}</small></span>
                ${p.unread ? `<span class="pp-unread-dot">${p.unread}</span>` : ''}
              </a>`).join('') : '<p class="pp-empty-state">No conversations yet — tap Message on any post to start one. 🐾</p>'}
          </aside>
          <section class="pp-thread" id="thread"></section>
        </div>
      </div>
    `;

    if (activeId) {
      await this._renderThread(container, activeId, { all, users });
    } else {
      container.querySelector('#thread').innerHTML = '<div class="pp-empty-state">Pick a conversation, or tap someone\'s Message button.</div>';
    }

    // Mark this thread read + refresh badge
    await this._markRead(activeId);
    refreshMessageBadge();
  },

  async _markRead(otherId) {
    if (!otherId) return;
    const user = window.Auth.user;
    const { dbGetByIndex, dbPut } = await import('../db.js');
    const rows = await dbGetByIndex('messages', 'toUserId', user.id);
    await Promise.all(
      rows.filter((m) => m.fromUserId === otherId && !m.read).map((m) => dbPut('messages', { ...m, read: true }))
    );
  },

  async _renderThread(container, otherId, { all, users }) {
    const user = window.Auth.user;
    const threadEl = container.querySelector('#thread');
    const other = users.find((u) => u.id === otherId);
    if (!other) {
      threadEl.innerHTML = '<div class="pp-empty-state">That member does not exist anymore.</div>';
      return;
    }

    const mine = all
      .filter((m) => (m.fromUserId === user.id && m.toUserId === otherId) || (m.fromUserId === otherId && m.toUserId === user.id))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    threadEl.innerHTML = `
      <div class="pp-thread-head">
        ${avatarHtml({ name: other.name, avatar: other.avatar }, 'pp-post-avatar')}
        <div><strong>${escapeHtml(other.name)}</strong><small>${escapeHtml(other.role === 'business_owner' ? 'Local business' : 'Member')}${other.location ? ` · ${escapeHtml(other.location.split(',')[0])}` : ''}</small></div>
      </div>
      <div class="pp-thread-body" id="thread-body">
        ${mine.length ? mine.map((m) => `
          <div class="pp-bubble ${m.fromUserId === user.id ? 'is-mine' : ''}">${escapeHtml(m.text)}<small>${timeAgo(m.createdAt)}</small></div>
        `).join('') : '<p class="pp-empty-state">Say hello — you both love pets 🐾</p>'}
      </div>
      <form class="pp-thread-foot" id="thread-form">
        <input class="pp-input" id="thread-input" type="text" placeholder="Write a message…" autocomplete="off" maxlength="500" required>
        <button type="submit" class="pp-btn pp-btn-solid pp-btn-md">${icon('arrow-right', 15)}</button>
      </form>
    `;

    const body = threadEl.querySelector('#thread-body');
    if (body) body.scrollTop = body.scrollHeight;

    threadEl.querySelector('#thread-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = threadEl.querySelector('#thread-input');
      const text = input.value.trim();
      if (!text) return;
      const { dbPut } = await import('../db.js');
      await dbPut('messages', {
        fromUserId: user.id,
        toUserId: otherId,
        text,
        read: false,
        createdAt: new Date().toISOString(),
      });
      input.value = '';
      const { navigateTo } = await import('../router.js');
      navigateTo(`/messages/${otherId}`);
    });
  },
};
