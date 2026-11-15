// ============================================================================
// PawPrint — Challenge Arena (doc §5.15)
// Structured community activities: join, track progress, submit evidence.
// Self-reported challenges complete automatically; evidence challenges are
// verified by PawPrint moderators before rewards unlock. Completion and
// verification are clearly distinguished on every card.
// ============================================================================

import { icon } from '../components/icons.js';
import { escapeHtml } from '../components/sanitize.js';
import { POINT_SCHEDULE } from '../components/points.js';

function dateRange(isoStart, isoEnd) {
  const fmt = (s) => new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(isoStart)} – ${fmt(isoEnd)}`;
}

function participantLabel(p) {
  if (p.status === 'completed') {
    return p.verified ? { text: '✓ Verified', cls: 'is-verified' } : { text: 'Awaiting verification', cls: 'is-pending' };
  }
  return { text: `${p.progress}/${p.target || 1}`, cls: '' };
}

export const ChallengesPage = {
  pageTitle: 'Challenges',

  async render(container) {
    const user = window.Auth.user;
    const { dbGetAll } = await import('../db.js');
    const [challenges, participations, users] = await Promise.all([
      dbGetAll('challenges'),
      dbGetAll('challengeParticipations'),
      dbGetAll('users'),
    ]);
    challenges.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    const myParts = participations.filter((p) => p.userId === user.id);
    const partFor = (cid) => myParts.find((p) => p.challengeId === cid);
    const countFor = (cid) => participations.filter((p) => p.challengeId === cid).length;
    const nameFor = (id) => (users.find((u) => u.id === id) || {}).name || 'Member';
    const userCount = (cid) => participations.filter((p) => p.challengeId === cid).length;

    const now = Date.now();
    const isLive = (c) => now >= new Date(c.startDate).getTime() && now <= new Date(c.endDate).getTime();
    const live = challenges.filter(isLive);
    const upcoming = challenges.filter((c) => new Date(c.startDate).getTime() > now);
    const ended = challenges.filter((c) => new Date(c.endDate).getTime() < now);

    const cards = [...live, ...upcoming, ...ended].map((c) => {
      const part = partFor(c.id);
      const mine = participations.filter((p) => p.challengeId === c.id);
      const verifiedCount = mine.filter((p) => p.status === 'completed' && p.verified).length;
      const label = part ? participantLabel({ ...part, target: c.completionTarget }) : null;
      const top = [...mine].sort((a, b) => (b.progress || 0) - (a.progress || 0)).slice(0, 3);
      const liveNow = isLive(c);
      const endedNow = new Date(c.endDate).getTime() < now;
      const progressPct = part && c.completionTarget
        ? Math.min(100, Math.round(((part.progress || 0) / c.completionTarget) * 100))
        : 0;

      return `
        <article class="pp-challenge-card ${endedNow ? 'is-ended' : ''}">
          <div class="pp-challenge-head">
            <span class="pp-challenge-icon">${icon('vote', 17)}</span>
            <div>
              <h3>${escapeHtml(c.name)}</h3>
              <small>${dateRange(c.startDate, c.endDate)}${c.sponsor ? ` · Sponsored by ${escapeHtml(c.sponsor)}` : ''}</small>
            </div>
            <span class="pp-challenge-count">${icon('users', 12)} ${countFor(c.id)}</span>
          </div>
          <p class="pp-challenge-desc">${escapeHtml(c.description)}</p>
          <div class="pp-challenge-meta">
            <span>${icon('check', 12)} ${escapeHtml(c.completionCriteria)}</span>
            <span>${icon('sparkles', 12)} ${escapeHtml(c.rewards)}</span>
            <span>${c.evidenceRequired ? `${icon('shield-check', 12)} Evidence required` : `${icon('menu', 12)} Self-reported`}</span>
          </div>
          ${part ? `
            <div class="pp-challenge-progress">
              <div class="pp-progress-track"><span style="width:${progressPct}%"></span></div>
              <div class="pp-challenge-progress-foot">
                <span>${label ? escapeHtml(label.text) : ''} progress</span>
                ${part.status === 'completed' ? `<span class="pp-challenge-badge ${label.cls}">${label.text}</span>` : ''}
              </div>
            </div>
          ` : ''}
          ${top.length ? `
            <div class="pp-challenge-leaderboard">
              <small>TOP CAPS</small>
              <span>${top.map((p, i) => `${i + 1}. ${escapeHtml(nameFor(p.userId).split(' ')[0])} (${p.progress || 0})`).join(' · ')}</span>
            </div>
          ` : ''}
          <div class="pp-challenge-actions">
            ${!part
              ? (endedNow
                ? `<span class="pp-demo-note">This challenge has ended.</span>`
                : `<button class="pp-btn pp-btn-solid pp-btn-md js-join-challenge" data-id="${c.id}">${icon('plus', 15)} Join challenge</button>`)
              : part.status === 'completed'
                ? (part.verified
                    ? `<span class="pp-challenge-badge is-verified">✓ Verified completion — nice work!</span>`
                    : `<span class="pp-challenge-badge is-pending">Awaiting moderator verification</span>`)
                : c.evidenceRequired
                  ? `
                    <form class="pp-evidence-form" data-id="${c.id}">
                      <input class="pp-input" type="text" name="evidence" placeholder="Describe your three tricks or share a link…" required maxlength="240">
                      <button type="submit" class="pp-btn pp-btn-solid pp-btn-sm">${icon('check', 13)} Submit evidence</button>
                    </form>
                    <button class="pp-btn pp-btn-ghost pp-btn-sm js-leave-challenge" data-id="${c.id}">Leave</button>
                  `
                  : `
                    <button class="pp-btn pp-btn-solid pp-btn-md js-log-progress" data-id="${c.id}">${icon('plus', 15)} Log +1 ${escapeHtml(c.unit || 'step')}</button>
                    <button class="pp-btn pp-btn-ghost pp-btn-sm js-leave-challenge" data-id="${c.id}">Leave</button>
                  `}
          </div>
        </article>
      `;
    }).join('');

    container.innerHTML = `
      <div class="pp-standard-page">
        <div class="pp-page-heading">
          <div>
            <div class="pp-eyebrow"><span></span>THE ARENA, EVERYDAY</div>
            <h1>Challenges<span>.</span></h1>
            <p>Structured ways to show up for your pet — finish, earn PawPoints, get recognised.</p>
          </div>
        </div>
        <div class="pp-challenge-list">${cards || '<p class="pp-empty-state">No challenges yet — check back soon.</p>'}</div>
        <p class="pp-demo-note">Self-reported progress is instant. Evidence-based challenges are verified by PawPrint moderators — rewards unlock on verification (doc §5.15).</p>
      </div>
    `;

    this._bind(container, challenges, myParts);
  },

  async _bind(container, challenges, myParts) {
    const user = window.Auth.user;
    const { dbGet, dbPut, dbDelete } = await import('../db.js');

    const partRecord = (cid) => myParts.find((p) => p.challengeId === Number(cid));
    const challengeOf = (cid) => challenges.find((c) => c.id === Number(cid));

    // Join
    container.querySelectorAll('.js-join-challenge').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const c = challengeOf(btn.getAttribute('data-id'));
        await dbPut('challengeParticipations', {
          challengeId: c.id,
          userId: user.id,
          progress: 0,
          status: 'joined',
          verified: !c.evidenceRequired,
          evidence: null,
          joinedAt: new Date().toISOString(),
        });
        window.showToast(`You're in — ${c.name} 🐾`);
        const { navigateTo } = await import('../router.js');
        navigateTo('/challenges');
      });
    });

    // Leave
    container.querySelectorAll('.js-leave-challenge').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const record = partRecord(btn.getAttribute('data-id'));
        if (record) await dbDelete('challengeParticipations', record.id);
        window.showToast('Left the challenge.');
        const { navigateTo } = await import('../router.js');
        navigateTo('/challenges');
      });
    });

    // Log progress (self-reported)
    container.querySelectorAll('.js-log-progress').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const c = challengeOf(btn.getAttribute('data-id'));
        const record = partRecord(c.id);
        if (!record || record.status !== 'joined') return;
        record.progress = (record.progress || 0) + 1;
        if (record.progress >= (c.completionTarget || 1)) {
          record.status = 'completed';
          record.completedAt = new Date().toISOString();
          record.verified = true; // self-reported completions are accepted for the demo
          await dbPut('challengeParticipations', record);

          const { awardPoints, POINT_SCHEDULE: sched } = await import('../components/points.js');
          await awardPoints({
            userId: user.id,
            amount: sched.completeChallenge.amount,
            source: sched.completeChallenge.source,
            referenceId: `challenge_${c.id}_${user.id}`,
          });
          const { pushNotification } = await import('../components/notify.js');
          await pushNotification({
            userId: user.id,
            title: 'Challenge complete! 🏆',
            body: `You finished "${c.name}" — +${sched.completeChallenge.amount} PawPoints.`,
            type: 'competition',
            link: '/challenges',
          });
          window.showToast(`Challenge complete — +${sched.completeChallenge.amount} PawPoints! 🎉`);
        } else {
          await dbPut('challengeParticipations', record);
          window.showToast(`Progress logged — ${record.progress}/${c.completionTarget} ✓`);
        }
        const { navigateTo } = await import('../router.js');
        navigateTo('/challenges');
      });
    });

    // Submit evidence (moderator verifies before the reward unlocks)
    container.querySelectorAll('.pp-evidence-form').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const c = challengeOf(form.getAttribute('data-id'));
        const record = partRecord(c.id);
        const evidence = form.querySelector('input[name="evidence"]').value.trim();
        if (!record || !evidence) return;
        record.status = 'completed';
        record.evidence = evidence;
        record.completedAt = new Date().toISOString();
        record.verified = false;
        await dbPut('challengeParticipations', record);

        const { notifyRole } = await import('../components/notify.js');
        await notifyRole('admin', {
          title: 'Challenge evidence to review',
          body: `${user.name} submitted evidence for "${c.name}".`,
          type: 'moderation',
          link: '/admin',
        });
        window.showToast('Evidence submitted — moderators will verify it soon ✓');
        const { navigateTo } = await import('../router.js');
        navigateTo('/challenges');
      });
    });
  },
};
