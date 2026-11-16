// ============================================================================
// PawPrint — Post comments (doc §5.9: comment on posts, notify post owner)
// Used by the home feed and the community page.
// ============================================================================

import { icon } from './icons.js';
import { escapeHtml } from './sanitize.js';
import { resolveLinksFor } from './author-link.js';

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const Comments = {
  /** Render the comment list + composer for a post into `slot`. */
  async render(slot, post) {
    const user = window.Auth.user;
    const { dbGetByIndex, dbGetAll } = await import('../db.js');
    const { avatarHtml } = await import('./avatar.js');
    const users = await dbGetAll('users');
    const avatarOf = (id) => (users.find((u) => u.id === id) || {}).avatar || null;
    const comments = await dbGetByIndex('comments', 'postId', post.id);
    comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const enrichedComments = await resolveLinksFor(comments.map((c) => ({ ...c, authorName: c.userName })));

    slot.innerHTML = `
      <div class="pp-comments">
        ${enrichedComments.length ? enrichedComments.map((c) => `
          <div class="pp-comment">
            ${avatarHtml({ name: c.userName, avatar: avatarOf(c.userId) }, 'pp-post-avatar')}
            <div class="pp-comment-body">
              <strong>${c._author ? `<a class="pp-author-link" href="${c._author.href}" data-route="${c._author.href}">${escapeHtml(c.userName || 'Member')}</a>` : escapeHtml(c.userName || 'Member')}</strong>
              <p>${escapeHtml(c.text)}${c.editedAt ? ' <span class="pp-post-edited">· edited</span>' : ''}</p>
              <small>${timeAgo(c.createdAt)}</small>
            </div>
            ${c.userId === user.id ? `<button class="pp-comment-edit" data-id="${c.id}" aria-label="Edit comment">${icon('pen', 13)}</button>` : ''}
          </div>
        `).join('') : '<p class="pp-comments-empty">No comments yet — start the conversation 🐾</p>'}
        <div class="pp-comment-compose">
          ${avatarHtml({ name: user.name, avatar: user.avatar || null }, 'pp-post-avatar')}
          <input class="pp-input" type="text" placeholder="Add a comment…" maxlength="280">
          <button class="pp-btn pp-btn-solid pp-btn-sm">${icon('arrow-right', 13)}</button>
        </div>
      </div>
    `;

    const input = slot.querySelector('input');
    const send = slot.querySelector('.pp-comment-compose .pp-btn');
    const submit = async () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      await this.add(post, text);
      await this.render(slot, post);
    };
    send.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });

    // Edit own comment
    slot.querySelectorAll('.pp-comment-edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-id'));
        const comment = enrichedComments.find((c) => c.id === id);
        if (comment) this._openEditModal(slot, post, comment);
      });
    });
  },

  /** Inline edit modal for own comments. */
  _openEditModal(slot, post, comment) {
    const root = document.createElement('div');
    root.innerHTML = `
      <div class="pp-modal-overlay" id="edit-comment-modal">
        <div class="pp-modal">
          <div class="pp-modal-head"><h3>Edit comment</h3><button class="pp-modal-close" aria-label="Close">✕</button></div>
          <form id="edit-comment-form" class="pp-modal-form">
            <textarea class="pp-input" id="edit-comment-text" rows="3" maxlength="280" required>${escapeHtml(comment.text)}</textarea>
            <div class="pp-modal-actions">
              <button type="submit" class="pp-btn pp-btn-solid pp-btn-md">${icon('check', 15)} Save</button>
              <button type="button" class="pp-btn pp-btn-ghost pp-btn-md pp-modal-dismiss">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    const close = () => root.remove();
    root.querySelectorAll('.pp-modal-close, .pp-modal-dismiss').forEach((b) => b.addEventListener('click', close));
    root.querySelector('.pp-modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) close();
    });

    root.querySelector('#edit-comment-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = root.querySelector('#edit-comment-text').value.trim();
      if (!text) return;
      const { dbPut } = await import('../db.js');
      await dbPut('comments', { ...comment, text, editedAt: new Date().toISOString() });
      close();
      this.render(slot, post);
    });
  },

  /** Create a comment record, bump the post counter, notify the owner. */
  async add(post, text) {
    const user = window.Auth.user;
    const { dbPut } = await import('../db.js');

    await dbPut('comments', {
      postId: post.id,
      userId: user.id,
      userName: user.name,
      text,
      createdAt: new Date().toISOString(),
    });

    post.comments = (post.comments || 0) + 1;
    await dbPut('posts', post);

    if (post.authorId && post.authorId !== user.id) {
      const { pushNotification } = await import('./notify.js');
      await pushNotification({
        userId: post.authorId,
        title: 'New comment on your post',
        body: `${user.name}: “${text.slice(0, 60)}${text.length > 60 ? '…' : ''}”`,
        type: 'community',
        link: '/community',
      });
    }
  },
};
