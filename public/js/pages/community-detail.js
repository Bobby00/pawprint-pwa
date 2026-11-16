// ============================================================================
// PawPrint — Community detail page (doc §5.10)
// Public info + rules shown before joining; membership gates posting.
// Pinned posts float to the top; organisers/admins can pin.
// ============================================================================

import { icon } from '../components/icons.js';
import { escapeHtml } from '../components/sanitize.js';
import { Comments } from '../components/comments.js';
import { postMediaHtml, wireComposerMedia } from '../components/media.js';
import { avatarHtml } from '../components/avatar.js';
import { resolveLinksFor } from '../components/author-link.js';

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const CommunityDetailPage = {
  pageTitle: 'Community',

  async render(container, { id }) {
    const { dbGet, dbGetAll, dbGetByIndex } = await import('../db.js');
    const user = window.Auth.user;
    const community = await dbGet('communities', Number(id));

    if (!community) {
      container.innerHTML = '<div class="pp-standard-page"><p class="pp-empty-state"><span class="empty-title">Pack not found</span>This community does not exist.</p></div>';
      return;
    }

    const allMembers = await dbGetByIndex('communityMembers', 'communityId', community.id);
    const membership = allMembers.find((m) => m.userId === user.id);
    const isMember = !!membership;
    const isOrganiser = community.ownerId === user.id;
    const canPin = user.role === 'admin' || isOrganiser;

    const allPosts = await dbGetAll('posts');
    const { Follows } = await import('../components/follows.js');
    const followedUsers = user ? await Follows.followingIds(user.id, 'user') : [];
    const enriched = await resolveLinksFor(allPosts.filter((p) => p.communityId === community.id));
    const rawPosts = enriched;
    const { Likes } = await import('../components/likes.js');
    const likedIds = await Likes.likedIdsFor(user.id, rawPosts);
    const users = await dbGetAll('users');
    const avatarOf = (id) => (users.find((u) => u.id === id) || {}).avatar || null;
    // Pinned first, then followed authors, then recency
    const feedPosts = Follows.boostFollowed(rawPosts, followedUsers);
    feedPosts.sort((a, b) => {
      if (!!b.pinned !== !!a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      return 0;
    });

    container.innerHTML = `
      <div class="pp-standard-page">
        <a href="/community" class="pp-back-link" data-route="/community">${icon('chevron-right', 14)} All packs</a>

        <section class="pp-community-hero">
          <img class="pp-community-hero-img" src="${community.image}" alt="" />
          <div class="pp-community-hero-info">
            <span class="pp-eyebrow"><span></span>${icon('users', 13)} LOCAL PACK · ${escapeHtml(community.location)}</span>
            <h1>${escapeHtml(community.name)}</h1>
            <p>${escapeHtml(community.description)}</p>
            <div class="pp-community-hero-meta">
              <span>${icon('users', 13)} ${(community.membersBase || 0) + allMembers.length} members</span>
              <span>${icon('message-circle', 13)} ${feedPosts.length} posts</span>
              <span>${community.isPublic ? 'Open pack' : 'Private pack'}</span>
            </div>
            ${isMember
              ? `<button class="pp-btn pp-btn-outline pp-btn-md js-join" data-id="${community.id}">${icon('check', 15)} Joined · Leave</button>`
              : `<button class="pp-btn pp-btn-solid pp-btn-md js-join" data-id="${community.id}">${icon('plus', 15)} Join the pack</button>`}
          </div>
        </section>

        <div class="pp-details-grid">
          <section class="pp-details-card">
            <h3>${icon('circle-help', 15)} House rules</h3>
            ${community.rules.map((r, i) => `<div class="pp-detail-row"><span class="pp-rule-number">${i + 1}</span> <span>${escapeHtml(r)}</span></div>`).join('')}
          </section>
          <section class="pp-details-card">
            <h3>${icon('shield-check', 15)} Before you post</h3>
            <div class="pp-detail-row">${icon('users', 14)} <span>Members only — join the pack to start posting.</span></div>
            <div class="pp-detail-row">${icon('check', 14)} <span>Be kind, be local, be helpful.</span></div>
            <div class="pp-detail-row">${icon('star', 14)} <span>Pin-worthy moments are chosen by the organiser.</span></div>
          </section>
        </div>

        ${isMember ? `
          <div class="pp-compose-post">
            ${avatarHtml({ name: user.name, avatar: user.avatar || null }, 'pp-post-avatar')}
            <div class="pp-compose-body">
              <textarea id="community-compose" class="pp-input" placeholder="Share with ${escapeHtml(community.name)}…" rows="2"></textarea>
              <div class="pp-compose-media-preview" id="community-media-preview" hidden></div>
              <div class="pp-compose-foot">
                <button class="pp-btn pp-btn-outline pp-btn-sm js-attach-media" type="button">${icon('image', 14)} Photo / video</button>
                <button id="community-post-btn" class="pp-btn pp-btn-solid pp-btn-md">Post</button>
              </div>
            </div>
            <input type="file" id="community-media-input" accept="image/*,video/*" multiple hidden>
          </div>
        ` : `
          <div class="pp-join-gate">
            <span>${icon('users', 18)}</span>
            <span><strong>Join to post here.</strong><small>Read the rules above, then join the pack to share moments, ask questions and join walks.</small></span>
            <button class="pp-btn pp-btn-solid pp-btn-sm js-join" data-id="${community.id}">${icon('plus', 14)} Join the pack</button>
          </div>
        `}

        <div class="pp-community-feed-title">
          <h2>Pack feed</h2>
          <span class="pp-finalist-count">${feedPosts.length} POSTS</span>
        </div>
        <div id="community-feed">
          ${feedPosts.length ? feedPosts.map((p) => `
            <article class="pp-post ${p.pinned ? 'is-pinned' : ''}" data-post="${p.id}">
              ${p.pinned ? `<div class="pp-pinned-badge">${icon('star', 12)} Pinned by the organiser</div>` : ''}
              <div class="pp-post-head">
                ${avatarHtml({ name: p.authorName, avatar: avatarOf(p.authorId) }, 'pp-post-avatar')}
                <span class="pp-post-person"><strong>${p._author ? `<a class="pp-author-link" href="${p._author.href}" data-route="${p._author.href}">${escapeHtml(p.authorName)}</a>` : escapeHtml(p.authorName)}</strong><span>${timeAgo(p.createdAt)}</span></span>
                ${p.authorId && p.authorId !== user.id ? `<button class="pp-follow-btn js-follow-user ${followedUsers.includes(p.authorId) ? 'is-followed' : ''}" data-id="${p.authorId}">${followedUsers.includes(p.authorId) ? 'Following' : 'Follow'}</button><button class="pp-message-mini js-message-user" data-id="${p.authorId}" aria-label="Message ${p.authorName}">${icon('message-circle', 13)}</button>` : ''}
                <span class="pp-post-head-actions">
                  ${canPin ? `<button class="pp-more-button js-pin" data-id="${p.id}" aria-label="${p.pinned ? 'Unpin' : 'Pin'} post">${icon('star', 17)}</button>` : ''}
                  ${p.authorId === user.id
                    ? `<span class="pp-post-owner-actions"><button class="pp-more-button js-edit-post" data-id="${p.id}" aria-label="Edit post">${icon('pen', 15)}</button><button class="pp-more-button js-delete-post" data-id="${p.id}" aria-label="Delete post">${icon('trash', 15)}</button></span>`
                    : `<button class="pp-more-button js-report" data-type="post" data-id="${p.id}" aria-label="Report post">${icon('menu', 17)}</button>`}
                </span>
              </div>
              <p class="pp-post-copy">${p.text}${p.editedAt ? ' <span class="pp-post-edited">· edited</span>' : ''}</p>
              ${postMediaHtml(p)}
              <div class="pp-post-reactions"><span>${icon('heart', 15, { fill: 'currentColor' })} ${p.reactions} friends like this</span><span>${p.comments || 0} comments</span></div>
              <div class="pp-post-actions">
                <button class="pp-action-button js-love ${likedIds.has(p.id) ? 'is-liked' : ''}" data-id="${p.id}" aria-pressed="${likedIds.has(p.id)}">${icon('heart', 18, likedIds.has(p.id) ? { fill: 'currentColor' } : {})} Like</button>
                <button class="pp-action-button js-toggle-comments" data-id="${p.id}">${icon('message-circle', 18)} Comment</button>
                <button class="pp-action-button js-report" data-type="post" data-id="${p.id}">Report</button>
              </div>
              <div class="pp-comments-slot" data-slot="${p.id}" hidden></div>
            </article>
          `).join('') : '<p class="pp-empty-state">No posts yet — join the pack and be the first. 🐾</p>'}
        </div>
      </div>
    `;

    this._bind(container, community, feedPosts, { isMember });
  },

  /** Edit a community post (doc §5.9: edit your posts). */
  _openEditModal(container, feedPosts, community, postId) {
    const post = feedPosts.find((p) => p.id === postId);
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
      navigateTo(`/community/${community.id}`);
    });
  },

  async _bind(container, community, feedPosts, { isMember }) {
    const user = window.Auth.user;
    const { dbGet, dbPut, dbGetAll, dbDelete, dbGetByIndex } = await import('../db.js');
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

    // Message author from the pack feed
    container.querySelectorAll('.js-message-user').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { navigateTo } = await import('../router.js');
        navigateTo(`/messages/${btn.getAttribute('data-id')}`);
      });
    });

    // Join / leave
    container.querySelectorAll('.js-join').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          const members = await dbGetByIndex('communityMembers', 'userId', user.id);
          const existing = members.find((m) => m.communityId === community.id);
          if (existing) {
            await dbDelete('communityMembers', existing.id);
            window.showToast(`You left ${community.name}`);
          } else {
            await dbPut('communityMembers', { communityId: community.id, userId: user.id, joinedAt: new Date().toISOString() });
            window.showToast(`Karibu to ${community.name}! 🐾`);
          }
          const { navigateTo } = await import('../router.js');
          navigateTo(`/community/${community.id}`);
        } catch (err) {
          console.error('[PawPrint] Join failed:', err);
          window.showToast('Could not update your membership — please try again.');
        }
      });
    });

    // Composer (members only)
    const postBtn = container.querySelector('#community-post-btn');
    if (postBtn) {
      const media = wireComposerMedia(container, {
        inputSelector: '#community-media-input',
        previewSelector: '#community-media-preview',
        buttonSelector: '.js-attach-media',
      });
      const input = container.querySelector('#community-compose');
      postBtn.addEventListener('click', async () => {
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
          communityId: community.id,
          pinned: false,
          createdAt: new Date().toISOString(),
        });
        input.value = '';
        media.clear();
        const { notifyFollowers } = await import('../components/notify.js');
        await notifyFollowers(user.id, {
          title: `${user.name} posted in ${community.name}`,
          body: (text || 'Shared a photo').slice(0, 70),
          link: `/community/${community.id}`,
        });
        window.showToast('Shared with the pack! 💛');
        const { navigateTo } = await import('../router.js');
        navigateTo(`/community/${community.id}`);
      });
    }

    // Love — persisted toggle
    container.querySelectorAll('.js-love').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.getAttribute('data-id'));
        const post = feedPosts.find((p) => p.id === id);
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

    // Comments
    container.querySelectorAll('.js-toggle-comments').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const slot = btn.closest('.pp-post').querySelector('.pp-comments-slot');
        const postId = Number(btn.getAttribute('data-id'));
        if (slot.hidden) {
          slot.hidden = false;
          const post = feedPosts.find((p) => p.id === postId);
          await Comments.render(slot, post);
        } else {
          slot.hidden = true;
          slot.innerHTML = '';
        }
      });
    });

    // Report
    container.querySelectorAll('.js-report').forEach((btn) => {
      btn.addEventListener('click', () => {
        const post = feedPosts.find((p) => p.id === Number(btn.getAttribute('data-id')));
        reportTarget({ targetType: 'post', targetId: post.id, preview: (post.text || '').slice(0, 80) });
      });
    });

    // Delete own post
    container.querySelectorAll('.js-delete-post').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.getAttribute('data-id'));
        if (!window.confirm('Delete this post? This cannot be undone.')) return;
        await dbDelete('posts', id);
        window.showToast('Post deleted');
        const { navigateTo } = await import('../router.js');
        navigateTo(`/community/${community.id}`);
      });
    });

    // Edit own post (doc §5.9: edit your posts)
    container.querySelectorAll('.js-edit-post').forEach((btn) => {
      btn.addEventListener('click', () => this._openEditModal(container, feedPosts, community, Number(btn.getAttribute('data-id'))));
    });

    // Pin / unpin (organiser or admin)
    container.querySelectorAll('.js-pin').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const post = feedPosts.find((p) => p.id === Number(btn.getAttribute('data-id')));
        if (!post) return;
        post.pinned = !post.pinned;
        await dbPut('posts', post);
        window.showToast(post.pinned ? 'Pinned to the top of the pack ⭐' : 'Unpinned');
        const { navigateTo } = await import('../router.js');
        navigateTo(`/community/${community.id}`);
      });
    });
  },
};
