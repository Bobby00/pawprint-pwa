// ============================================================================
// PawPrint — Home screen (feed column + quick sidebar)
// ============================================================================

import { icon } from '../components/icons.js';
import { postMediaHtml } from '../components/media.js';
import { avatarHtml } from '../components/avatar.js';
import { Likes } from '../components/likes.js';

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function dayMonth(iso) {
  const d = new Date(iso);
  return { day: d.getDate(), mon: d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase() };
}

function feedPost(p, { isContest = false, isFollowed = false, avatar = null, liked = false } = {}) {
  const initial = (p.authorName || '?').charAt(0).toUpperCase();
  const meId = window.Auth?.user?.id;
  const avatarField = avatar ? { name: p.authorName, avatar } : { name: p.authorName };
  return `
    <article class="pp-post">
      <div class="pp-post-head">
        ${avatarHtml(avatarField, 'pp-post-avatar')}
        <span class="pp-post-person"><strong>${p.authorName}</strong><span>@${(p.authorName || '').toLowerCase().replace(/\s+/g, '')} · ${timeAgo(p.createdAt)}</span></span>
        ${p.authorId && p.authorId !== meId ? `<button class="pp-follow-btn js-follow-user ${isFollowed ? 'is-followed' : ''}" data-id="${p.authorId}">${isFollowed ? 'Following' : 'Follow'}</button><button class="pp-message-mini js-message-user" data-id="${p.authorId}" aria-label="Message ${p.authorName}">${icon('message-circle', 13)}</button>` : ''}
        <button class="pp-more-button" aria-label="More post options">${icon('menu', 18)}</button>
      </div>
      ${isContest ? `<div class="pp-post-context">${icon('trophy', 13)} ENTERED <span>·</span> ${p.contestLabel || 'CUTEST PET CONTEST'}</div>` : ''}
      <p class="pp-post-copy">${p.text}${p.editedAt ? ' <span class="pp-post-edited">· edited</span>' : ''}</p>
      ${postMediaHtml(p)}
      <div class="pp-post-reactions"><span>${icon('heart', 15, { fill: 'currentColor' })} ${p.reactions} friends like this</span><span>${p.comments} comments</span></div>
      <div class="pp-post-actions">
        <button class="pp-action-button js-love ${liked ? 'is-liked' : ''}" data-id="${p.id}" aria-pressed="${liked}">${icon('heart', 18, liked ? { fill: 'currentColor' } : {})} Like</button>
        <button class="pp-action-button js-toggle-comments" data-id="${p.id}">${icon('message-circle', 18)} Comment</button>
        <button class="pp-action-button pp-vote-action js-vote-post" data-id="${p.id}">${icon('vote', 18)} Vote</button>
        <button class="pp-action-button js-report" data-type="post" data-id="${p.id}">Report</button>
      </div>
      <div class="pp-comments-slot" data-slot="${p.id}" hidden></div>
    </article>
  `;
}

export const HomePage = {
  pageTitle: 'Home',

  async render(container) {
    const { dbGetAll, dbGetByIndex } = await import('../db.js');
    const { Follows } = await import('../components/follows.js');
    const Auth = window.Auth;
    const user = Auth.user;
    const posts = await dbGetAll('posts');
    const allUsers = await dbGetAll('users');
    const avatarOf = (id) => (allUsers.find((u) => u.id === id) || {}).avatar || null;
    const followedUsers = await Follows.followingIds(user.id, 'user');
    const likedIds = await Likes.likedIdsFor(user.id, posts);
    Follows.boostFollowed(posts, followedUsers);
    const competitions = await dbGetAll('competitions');
    const activeComp = competitions.find((c) => c.status === 'active');
    const businesses = await dbGetAll('businesses');
    const spotlight = [...businesses].sort((a, b) => b.rating - a.rating)[0];
    const pets = await dbGetByIndex('pets', 'ownerId', user.id);
    const ledger = await dbGetByIndex('pointsLedger', 'userId', user.id);
    const points = ledger.reduce((sum, t) => sum + (t.type === 'earn' ? t.amount : -t.amount), 0);
    const communities = [
      { name: 'Karen pack', letter: 'K', alt: false },
      { name: 'Westlands', letter: 'W', alt: true },
    ];

    const first = user.name.split(' ')[0];
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase() + ', NAIROBI';

    // Stories: your pets first, then communities, then the arena
    const isAdmin = user.role === 'admin';
    const petStories = isAdmin ? '' : pets.slice(0, 2).map((p) => `
      <a href="/profile" class="pp-story-item" data-route="/profile"><span class="pp-story-avatar pp-story-letters">${p.name.charAt(0)}</span><span>${p.name}</span></a>
    `).join('');
    const communityStories = communities.map((c) => `
      <a href="/community" class="pp-story-item" data-route="/community"><span class="pp-story-avatar pp-story-letters${c.alt ? ' pp-story-letters-alt' : ''}">${c.letter}</span><span>${c.name}</span></a>
    `).join('');

    const contestCard = activeComp ? `
      <div class="pp-feed-contest">
        <span class="pp-contest-flag">${icon('trophy', 14)} THE ARENA IS LIVE</span>
        <a href="/arena" class="pp-contest-inner" data-route="/arena">
          <img src="/images/pawprint-arena-dog.jpg" alt="" loading="lazy" />
          <span class="pp-contest-copy">
            <span>YOUR VOTE MATTERS</span>
            <strong>${activeComp.name.replace(/Nairobi's |Nairobi’s /i, '')}</strong>
            <small>Meet the finalists and cast your vote.</small>
            <span class="pp-contest-cta">Meet the finalists ${icon('arrow-right', 15)}</span>
          </span>
        </a>
      </div>` : '';

    const ev1 = dayMonth(Date.now() + 2 * 86400000);
    const ev2 = dayMonth(Date.now() + 8 * 86400000);

    // Upcoming events from the events store + this user's RSVPs
    const events = await dbGetAll('events');
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    const upcoming = events.filter((e) => new Date(e.date) > Date.now()).slice(0, 3);
    const rsvps = await dbGetByIndex('eventRsvps', 'userId', user.id);
    const rsvpedIds = rsvps.map((r) => r.eventId);

    // Event reminders (doc §6.1: "Upcoming event" → registered participants)
    for (const e of upcoming) {
      if (!rsvpedIds.includes(e.id)) continue;
      const hoursLeft = (new Date(e.date) - Date.now()) / 3600000;
      if (hoursLeft <= 26 && hoursLeft > 0) {
        try {
          const key = `pawprint_reminder_${user.id}_${e.id}`;
          if (localStorage.getItem(key)) continue;
          const { pushNotification } = await import('../components/notify.js');
          await pushNotification({
            userId: user.id,
            title: 'Event starts soon 🐾',
            body: `${e.title} — ${e.location.split(',')[0]}, ${new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${new Date(e.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}. Don't forget!`,
            type: 'event',
            link: '/',
          });
          localStorage.setItem(key, '1');
        } catch (e2) { /* reminders are best-effort */ }
      }
    }

    const eventRows = upcoming.length ? upcoming.map((e, i) => {
      const d = dayMonth(e.date);
      const when = new Date(e.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      const going = rsvpedIds.includes(e.id);
      const full = e.capacity && (e.registrations || 0) >= e.capacity;
      const hoursLeft = Math.max(0, Math.round((new Date(e.date) - Date.now()) / 3600000));
      const soon = hoursLeft <= 36;
      return `
        <div class="pp-side-event pp-side-event-row ${soon && going ? 'is-soon' : ''}">
          <span class="pp-event-date ${i % 2 ? 'is-yellow' : ''}"><strong>${d.day}</strong><small>${d.mon}</small></span>
          <span class="pp-event-info">
            <strong>${e.title}</strong>
            <small>${icon('map-pin', 12)} ${e.location.split(',')[0]} · ${when}</small>
            ${going ? `<button class="pp-btn pp-btn-sm pp-btn-outline pp-rsvp-button" disabled>${icon('check', 13)} Going${soon ? ` · starts soon` : ''}</button>` : `
              <button class="pp-btn pp-btn-sm ${full ? 'pp-btn-ghost' : 'pp-btn-solid'} pp-rsvp-button js-rsvp" data-id="${e.id}" ${full ? 'disabled' : ''}>${full ? 'Event full' : `${icon('plus', 13)} RSVP`}</button>
            `}
          </span>
        </div>`;
    }).join('') : '<p class="pp-empty-state">No upcoming events yet.</p>';

    container.innerHTML = `
      <div class="pp-home-layout">
        <section class="pp-feed-column">
          <div class="pp-page-heading">
            <div>
              <div class="pp-eyebrow"><span></span>${dateLabel}</div>
              <h1>${greeting}, <span>${first}</span> <span class="pp-wave">✳</span></h1>
            </div>
            <a href="/community" class="pp-compose" data-route="/community">${icon('plus', 17)} <span class="pp-compose-label">Share a moment</span></a>
          </div>
          <div class="pp-stories" aria-label="Pet stories">
            ${isAdmin
              ? `<a href="/admin" class="pp-story-item" data-route="/admin"><span class="pp-story-avatar pp-story-letters">${icon('shield-check', 20)}</span><span>Console</span></a>`
              : `<a href="/pet-profile" class="pp-story-item" data-route="/pet-profile"><span class="pp-story-avatar pp-story-letters">${icon('plus', 20)}</span><span class="pp-story-add-icon">${icon('plus', 14)}</span><span>Your pets</span></a>`}
            <a href="/arena" class="pp-story-item pp-story-highlight-item" data-route="/arena"><span class="pp-story-avatar pp-story-highlight pp-story-letters">A</span><span>Cutest Pet</span></a>
            ${petStories}
            ${communityStories}
          </div>
          <div class="pp-feed-label"><span>YOUR FEED</span><button class="pp-btn pp-btn-ghost pp-filter-button">${icon('settings', 15)} For you ${icon('chevron-right', 14)}</button></div>
          ${posts.slice(0, 1).map((p) => feedPost(p, { isContest: true, isFollowed: followedUsers.includes(p.authorId), avatar: avatarOf(p.authorId), liked: likedIds.has(p.id) })).join('')}
          ${contestCard}
          ${posts.slice(1, 4).map((p) => feedPost(p, { isFollowed: followedUsers.includes(p.authorId), avatar: avatarOf(p.authorId), liked: likedIds.has(p.id) })).join('')}
        </section>
        <aside class="pp-right-sidebar">
          <a href="/profile" class="pp-points-card" data-route="/profile">
            <span class="pp-points-card-top"><span class="pp-points-stamp">${icon('paw-print', 17)}</span><span class="pp-points-card-label">PAWPOINTS</span>${icon('arrow-down-right', 16)}</span>
            <strong class="pp-points-total">${points} <span>pts</span></strong>
            <span class="pp-points-card-bottom"><span>Complete your pet profile</span><span class="pp-points-earn">+50 ${icon('sparkles', 12)}</span></span>
            <span class="pp-points-progress"><span></span></span>
          </a>
          <section class="pp-side-section">
            <div class="pp-side-heading"><h2>Happening nearby</h2><a href="/discover" data-route="/discover">See all</a></div>
            ${eventRows}
          </section>
          ${spotlight ? `
            <section class="pp-side-section pp-spotlight">
              <div class="pp-side-heading"><h2>Local favourite</h2><span class="pp-spotlight-icon">${icon('star', 14, { fill: 'currentColor' })}</span></div>
              <a href="/business/${spotlight.id}" class="pp-business-image" data-route="/business/${spotlight.id}">
                <img src="/images/pawprint-vet-clinic.jpg" alt="" loading="lazy" />
                ${spotlight.verification === 'verified' ? `<span class="pp-verified">${icon('shield-check', 13)} VERIFIED</span>` : ''}
              </a>
              <a href="/business/${spotlight.id}" class="pp-business-title" data-route="/business/${spotlight.id}">
                <span><strong>${spotlight.name}</strong><small>${icon('map-pin', 12)} ${spotlight.address.split(',')[0]} · ${spotlight.category}</small></span>
                <span class="pp-rating">${icon('star', 13, { fill: 'currentColor' })} ${spotlight.rating}</span>
              </a>
            </section>
          ` : ''}
          <div class="pp-side-footer"><span>PAWPRINT · NAIROBI</span><a href="/community" data-route="/community">A community for every paw ${icon('arrow-right', 13)}</a></div>
        </aside>
      </div>
    `;

    // Follow / unfollow authors from the feed
    container.querySelectorAll('.js-follow-user').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { Follows } = await import('../components/follows.js');
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

    // Love / vote interactions (likes are persisted per-user; toggles on/off)
    container.querySelectorAll('.js-love').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.getAttribute('data-id'));
        const { dbGet } = await import('../db.js');
        const post = await dbGet('posts', id);
        if (!post) return;
        const result = await Likes.toggle(user.id, post);
        btn.classList.toggle('is-liked', result.liked);
        btn.setAttribute('aria-pressed', String(result.liked));
        btn.innerHTML = `${icon('heart', 18, result.liked ? { fill: 'currentColor' } : {})} Like`;
        const row = btn.closest('.pp-post').querySelector('.pp-post-reactions span');
        if (row) row.innerHTML = `${icon('heart', 15, { fill: 'currentColor' })} ${result.count} friends like this`;
        if (result.liked) window.showToast('Liked 💛');
      });
    });

    // Vote demo for non-love posts (still a counter demo)
    container.querySelectorAll('.js-vote-post').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.getAttribute('data-id'));
        const { dbGet, dbPut } = await import('../db.js');
        const post = await dbGet('posts', id);
        if (!post) return;
        post.comments = (post.comments || 0) + 1;
        await dbPut('posts', post);
        window.showToast('Comment coming soon');
      });
    });

    // Inline comments
    container.querySelectorAll('.js-toggle-comments').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const slot = btn.closest('.pp-post').querySelector('.pp-comments-slot');
        const postId = Number(btn.getAttribute('data-id'));
        if (slot.hidden) {
          slot.hidden = false;
          const { Comments } = await import('../components/comments.js');
          const { dbGet } = await import('../db.js');
          const post = await dbGet('posts', postId);
          await Comments.render(slot, post);
        } else {
          slot.hidden = true;
          slot.innerHTML = '';
        }
      });
    });

    // Report
    container.querySelectorAll('.js-report').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { reportTarget } = await import('../components/report.js');
        const { dbGet } = await import('../db.js');
        const post = await dbGet('posts', Number(btn.getAttribute('data-id')));
        reportTarget({
          targetType: 'post',
          targetId: post.id,
          preview: (post.text || '').slice(0, 80),
        });
      });
    });

    // Event RSVPs (doc: attend a verified event earns PawPoints on check-in)
    container.querySelectorAll('.js-rsvp').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const eventId = Number(btn.getAttribute('data-id'));
        const { dbGet, dbGetByIndex, dbPut, dbDelete } = await import('../db.js');
        const event = await dbGet('events', eventId);
        if (!event) return;

        const mine = await dbGetByIndex('eventRsvps', 'userId', user.id);
        const existing = mine.find((r) => r.eventId === eventId);

        if (existing) {
          await dbDelete('eventRsvps', existing.id);
          event.registrations = Math.max(0, (event.registrations || 1) - 1);
          await dbPut('events', event);
          window.showToast('RSVP cancelled');
        } else {
          if (event.capacity && (event.registrations || 0) >= event.capacity) {
            window.showToast('This event is full.');
            return;
          }
          await dbPut('eventRsvps', { eventId, userId: user.id, createdAt: new Date().toISOString() });
          event.registrations = (event.registrations || 0) + 1;
          await dbPut('events', event);
          window.showToast(`You're going to ${event.title} 🐾`);
        }
        const { navigateTo } = await import('../router.js');
        navigateTo('/');
      });
    });

    // Update document title
    document.title = `${greeting}, ${first} — PawPrint`;
  },
};
