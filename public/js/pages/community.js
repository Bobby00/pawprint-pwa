// ============================================================================
// PawPrint — Community screen (local packs + feed)
// ============================================================================

import { icon } from '../components/icons.js';
import { escapeHtml } from '../components/sanitize.js';
import { postMediaHtml, wireComposerMedia } from '../components/media.js';
import { resolveLinksFor } from '../components/author-link.js';

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const CommunityPage = {
  pageTitle: 'Community',

  async render(container) {
    const { dbGetAll, dbGetByIndex } = await import('../db.js');
    const { Follows } = await import('../components/follows.js');
    const { avatarHtml } = await import('../components/avatar.js');
    const { Likes } = await import('../components/likes.js');
    const user = window.Auth.user;
    const posts = await dbGetAll('posts');
    const likedIds = await Likes.likedIdsFor(user.id, posts);
    const allUsers = await dbGetAll('users');
    const avatarOf = (id) => (allUsers.find((u) => u.id === id) || {}).avatar || null;
    const followedUsers = await Follows.followingIds(user.id, 'user');
    const enriched = await resolveLinksFor(posts);
    Follows.boostFollowed(posts, followedUsers);
    const communities = await dbGetAll('communities');
    const communityNames = new Map(communities.map((c) => [c.id, c.name]));
    const allMembers = await dbGetAll('communityMembers');
    communities.forEach((g) => {
      g.membersCount = allMembers.filter((m) => m.communityId === g.id).length;
    });
    const myMemberships = await dbGetByIndex('communityMembers', 'userId', user.id);
    const joinedIds = myMemberships.map((m) => m.communityId);

    container.innerHTML = `
      <div class="pp-standard-page">
        <div class="pp-page-heading"><div><div class="pp-eyebrow"><span></span>BETTER TOGETHER, PAW BY PAW</div><h1>Find your <span>people.</span></h1></div></div>
        <div class="pp-community-banner">
          <span class="pp-community-icon">${icon('users', 25)}</span>
          <span><strong>There's a pack for every paw.</strong><small>Meet nearby pet parents and discover your local community.</small></span>
        </div>
        <a href="/adopt" class="pp-adoption-cta" data-route="/adopt">
          <span class="pp-adoption-cta-icon">${icon('heart', 22)}</span>
          <span><strong>Rescue &amp; adoption</strong><small>Meet Bella, Kibo and other animals looking for homes — verified organisations.</small></span>
          ${icon('arrow-right', 18)}
        </a>
        <div class="pp-finalists-heading">
          <div><span class="pp-eyebrow"><span></span> YOUR CORNER OF NAIROBI</span><h2>Local communities</h2></div>
        </div>
        <div class="pp-community-grid">
          ${communities.map((g) => `
            <article class="pp-community-card">
              <img src="${g.image}" alt="" loading="lazy" />
              <div>
                <span>${icon('users', 14)} LOCAL PACK</span>
                <h3>${escapeHtml(g.name)}</h3>
                <p>${(g.membersBase || 0) + (g.membersCount || 0)} members · ${escapeHtml(g.location.split(',')[0])}</p>
                <a href="/community/${g.id}" class="pp-btn pp-btn-outline pp-btn-sm" data-route="/community/${g.id}">${icon('users', 14)} ${joinedIds.includes(g.id) ? 'Open pack' : 'Meet the pack'}</a>
              </div>
            </article>
          `).join('')}
        </div>
        <div class="pp-community-feed-title">
          <h2>Today in the community</h2>
          <button class="pp-btn pp-btn-ghost pp-btn-sm">Popular this week ${icon('chevron-right', 14)}</button>
        </div>

        <div class="pp-compose-post">
          ${avatarHtml({ name: user.name, avatar: user.avatar || null }, 'pp-post-avatar')}
          <div class="pp-compose-body">
            <textarea id="community-compose" class="pp-input" placeholder="Share a moment with the pack…" rows="2"></textarea>
            <div class="pp-compose-media-preview" id="community-media-preview" hidden></div>
            <div class="pp-compose-foot">
              <button class="pp-btn pp-btn-outline pp-btn-sm js-attach-media" type="button">${icon('image', 14)} Photo / video</button>
              <button id="community-post-btn" class="pp-btn pp-btn-solid pp-btn-md">Post</button>
            </div>
          </div>
          <input type="file" id="community-media-input" accept="image/*,video/*" multiple hidden>
        </div>
        <div id="community-feed">
          ${enriched.slice(0, 5).map((p) => `
            <article class="pp-post" data-post="${p.id}">
              ${p.communityId ? `<a class="pp-pack-badge" href="/community/${p.communityId}" data-route="/community/${p.communityId}">${icon('users', 11)} ${escapeHtml(communityNames.get(p.communityId) || 'Local pack')}</a>` : ''}
              <div class="pp-post-head">
                ${avatarHtml({ name: p.authorName, avatar: avatarOf(p.authorId) }, 'pp-post-avatar')}
                <span class="pp-post-person"><strong>${p._author ? `<a class="pp-author-link" href="${p._author.href}" data-route="${p._author.href}">${escapeHtml(p.authorName)}</a>` : escapeHtml(p.authorName)}</strong><span>${timeAgo(p.createdAt)}</span></span>
                ${p.authorId && p.authorId !== user.id ? `<button class="pp-follow-btn js-follow-user ${followedUsers.includes(p.authorId) ? 'is-followed' : ''}" data-id="${p.authorId}">${followedUsers.includes(p.authorId) ? 'Following' : 'Follow'}</button><button class="pp-message-mini js-message-user" data-id="${p.authorId}" aria-label="Message ${p.authorName}">${icon('message-circle', 13)}</button>` : ''}
                ${p.authorId === user.id
                  ? `<span class="pp-post-owner-actions"><button class="pp-more-button js-edit-post" data-id="${p.id}" aria-label="Edit post">${icon('pen', 16)}</button><button class="pp-more-button js-delete-post" data-id="${p.id}" aria-label="Delete post">${icon('trash', 16)}</button></span>`
                  : `<button class="pp-more-button js-report" data-type="post" data-id="${p.id}" aria-label="Report post">${icon('menu', 18)}</button>`}
              </div>
              <p class="pp-post-copy">${p.text}${p.editedAt ? ' <span class="pp-post-edited">· edited</span>' : ''}</p>
              ${postMediaHtml(p)}
              <div class="pp-post-reactions"><span>${icon('heart', 15, { fill: 'currentColor' })} ${p.reactions} friends like this</span><span class="pp-comment-count">${p.comments || 0} comments</span></div>
              <div class="pp-post-actions">
                <button class="pp-action-button js-love ${likedIds.has(p.id) ? 'is-liked' : ''}" data-id="${p.id}" aria-pressed="${likedIds.has(p.id)}">${icon('heart', 18, likedIds.has(p.id) ? { fill: 'currentColor' } : {})} Like</button>
                <button class="pp-action-button js-toggle-comments" data-id="${p.id}">${icon('message-circle', 18)} Comment</button>
                <button class="pp-action-button js-report" data-type="post" data-id="${p.id}">Report</button>
              </div>
              <div class="pp-comments-slot" data-slot="${p.id}" hidden></div>
            </article>
          `).join('') || '<p class="pp-empty-state">No general posts yet — join a pack and start the conversation. 🐾</p>'}
        </div>
      </div>
    `;

    this._bindFeed(container, posts);
  },

  /** Edit a community post (doc §5.9: edit your posts). */
  _openEditModal(container, posts, postId) {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const root = document.createElement('div');
    root.innerHTML = `
      <div class="pp-modal-overlay" id="edit-post-modal">
        <div class="pp-modal">
          <div class="pp-modal-head"><h3>Edit post</h3><button class="pp-modal-close" aria-label="Close">✕</button></div>
          <form id="edit-post-form" class="pp-modal-form">
            <textarea class="pp-input" id="edit-post-text" rows="4" maxlength="500" required>${escapeHtml(post.text || '')}</textarea>
            <div class="pp-modal-actions">
              <button type="submit" class="pp-btn pp-btn-solid pp-btn-md">${icon('check', 15)} Save changes</button>
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

    root.querySelector('#edit-post-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = root.querySelector('#edit-post-text').value.trim();
      if (!text) return;
      post.text = text;
      post.editedAt = new Date().toISOString();
      const { dbPut } = await import('../db.js');
      await dbPut('posts', post);
      close();
      window.showToast('Post updated ✓');
      const { navigateTo } = await import('../router.js');
      navigateTo('/community');
    });
  },

  async _bindFeed(container, posts) {
    const user = window.Auth.user;
    const { dbGetAll, dbPut, dbDelete } = await import('../db.js');
    const { Comments } = await import('../components/comments.js');
    const { reportTarget } = await import('../components/report.js');
    const { Follows } = await import('../components/follows.js');

    // Follow / unfollow authors
    container.querySelectorAll('.js-follow-user').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const followeeId = Number(btn.getAttribute('data-id'));
        const nowFollowing = await Follows.toggle(user.id, 'user', followeeId);
        btn.classList.toggle('is-followed', nowFollowing);
        btn.textContent = nowFollowing ? 'Following' : 'Follow';
        window.showToast(nowFollowing ? 'Following — their posts float up 🐾' : 'Unfollowed');
      });
    });

    // Message author from the feed
    container.querySelectorAll('.js-message-user').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { navigateTo } = await import('../router.js');
        navigateTo(`/messages/${btn.getAttribute('data-id')}`);
      });
    });

    // Love — persisted toggle
    container.querySelectorAll('.js-love').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.getAttribute('data-id'));
        const { dbGet } = await import('../db.js');
        const post = await dbGet('posts', id);
        if (!post) return;
        const { Likes } = await import('../components/likes.js');
        const result = await Likes.toggle(user.id, post);
        btn.classList.toggle('is-liked', result.liked);
        btn.setAttribute('aria-pressed', String(result.liked));
        btn.innerHTML = `${icon('heart', 18, result.liked ? { fill: 'currentColor' } : {})} Like`;
        const row = btn.closest('.pp-post').querySelector('.pp-post-reactions span');
        if (row) row.innerHTML = `${icon('heart', 15, { fill: 'currentColor' })} ${result.count} friends like this`;
        if (result.liked) window.showToast('Liked 💛');
      });
    });

    // Comments (expand inline)
    container.querySelectorAll('.js-toggle-comments').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const slot = btn.closest('.pp-post').querySelector('.pp-comments-slot');
        const postId = Number(btn.getAttribute('data-id'));
        if (slot.hidden) {
          slot.hidden = false;
          const post = posts.find((p) => p.id === postId);
          await Comments.render(slot, post);
          slot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          slot.hidden = true;
          slot.innerHTML = '';
        }
      });
    });

    // Report (posts)
    container.querySelectorAll('.js-report').forEach((btn) => {
      btn.addEventListener('click', () => reportTarget({
        targetType: 'post',
        targetId: Number(btn.getAttribute('data-id')),
        preview: (posts.find((p) => p.id === Number(btn.getAttribute('data-id'))) || {}).text || '',
      }));
    });

    // Delete own post
    container.querySelectorAll('.js-delete-post').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.getAttribute('data-id'));
        if (!window.confirm('Delete this post? This cannot be undone.')) return;
        await dbDelete('posts', id);
        window.showToast('Post deleted');
        const { navigateTo } = await import('../router.js');
        navigateTo('/community');
      });
    });

    // Edit own post (doc §5.9: edit your posts)
    container.querySelectorAll('.js-edit-post').forEach((btn) => {
      btn.addEventListener('click', () => this._openEditModal(container, posts, Number(btn.getAttribute('data-id'))));
    });

    // Compose
    const media = wireComposerMedia(container, {
      inputSelector: '#community-media-input',
      previewSelector: '#community-media-preview',
      buttonSelector: '.js-attach-media',
    });
    const btn = container.querySelector('#community-post-btn');
    const input = container.querySelector('#community-compose');
    if (!btn || !input) return; // navigated away mid-render
    btn.addEventListener('click', async () => {
      const text = input.value.trim();
      if (!text && !media.files().length) { window.showToast('Write something first 🐾'); return; }
      await dbPut('posts', {
        id: Date.now(),
        authorId: user.id,
        authorName: user.name,
        text: text || '',
        type: media.files().length ? 'media' : 'text',
        photos: media.files(),
        reactions: 0,
        comments: 0,
        createdAt: new Date().toISOString(),
      });
      input.value = '';
      media.clear();
      const { notifyFollowers } = await import('../components/notify.js');
      await notifyFollowers(user.id, {
        title: `${user.name} shared a moment`,
        body: (text || 'Shared a photo').slice(0, 70),
        link: '/community',
      });
      window.showToast('Shared with the pack! 💛');
      const { navigateTo } = await import('../router.js');
      navigateTo('/community');
    });
  },
};
