// ============================================================================
// PawPrint — Admin console (doc §7.1)
// Tabbed operations dashboard: overview stats, competitions (create + publish
// results, free or PawPoints entry), business verification, content
// moderation, user management, events + announcements. Admin role required.
// ============================================================================

import { icon } from '../components/icons.js';
import { escapeHtml } from '../components/sanitize.js';
import { audit } from '../components/audit.js';

export const AdminPage = {
  pageTitle: 'Admin',

  async render(container) {
    const user = window.Auth.user;

    if (user.role !== 'admin') {
      container.innerHTML = `
        <div class="pp-standard-page">
          <div class="pp-page-heading"><div><div class="pp-eyebrow"><span></span>RESTRICTED AREA</div><h1>Admin <span>console.</span></h1></div></div>
          <p class="pp-empty-state"><span class="empty-icon">${icon('shield-check', 40)}</span><span class="empty-title">Admin access required</span><span class="empty-desc">This area is for PawPrint platform administrators. Sign in with an admin account to manage users, businesses, competitions and content.</span></p>
        </div>
      `;
      return;
    }

    const { dbGetAll } = await import('../db.js');
    const [users, businesses, competitions, posts, reviews, entries, events, ledger, reports, auditLogs, participations, challenges, communities, applications, adoptionApplications] = await Promise.all([
      dbGetAll('users'), dbGetAll('businesses'), dbGetAll('competitions'),
      dbGetAll('posts'), dbGetAll('reviews'), dbGetAll('entries'), dbGetAll('events'), dbGetAll('pointsLedger'),
      dbGetAll('reports'), dbGetAll('auditLogs'), dbGetAll('challengeParticipations'), dbGetAll('challenges'),
      dbGetAll('communities'), dbGetAll('businessApplications'), dbGetAll('adoptionApplications'),
    ]);

    const pendingAdoptions = adoptionApplications.filter((a) => a.status === 'submitted');

    const pendingApplications = applications.filter((a) => a.status === 'pending');

    const pendingVerifications = participations.filter((p) => p.status === 'completed' && !p.verified);

    auditLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recentAudit = auditLogs.slice(0, 6);
    const recentEarns = ledger
      .filter((t) => t.type === 'earn' && t.status !== 'reversed')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6);

    const pointsIssued = ledger.filter((t) => t.type === 'earn' && t.status !== 'reversed').reduce((s, t) => s + t.amount, 0);
    const activeComps = competitions.filter((c) => c.status === 'active').length;
    const openReports = reports.filter((r) => r.status === 'open');

    container.innerHTML = `
      <div class="pp-standard-page">
        <div class="pp-page-heading">
          <div><div class="pp-eyebrow"><span></span>PLATFORM OPERATIONS</div><h1>Admin <span>console.</span></h1></div>
          <span class="pp-admin-badge">${icon('shield-check', 14)} ADMIN</span>
        </div>

        <div class="pp-admin-tabs" role="tablist">
          <button class="pp-admin-tab is-active" data-tab="overview">${icon('compass', 15)} Overview</button>
          <button class="pp-admin-tab" data-tab="competitions">${icon('trophy', 15)} Competitions <span class="pp-tab-count">${activeComps}</span></button>
          <button class="pp-admin-tab" data-tab="businesses">${icon('star', 15)} Businesses <span class="pp-tab-count">${businesses.length}</span></button>
          <button class="pp-admin-tab" data-tab="content">${icon('message-circle', 15)} Content <span class="pp-tab-count">${posts.length + reviews.length}</span></button>
          <button class="pp-admin-tab" data-tab="reports">${icon('circle-help', 15)} Reports <span class="pp-tab-count">${openReports.length}</span></button>
          <button class="pp-admin-tab" data-tab="challenges">${icon('check', 15)} Challenges <span class="pp-tab-count">${pendingVerifications.length}</span></button>
          <button class="pp-admin-tab" data-tab="communities">${icon('users', 15)} Communities <span class="pp-tab-count">${communities.length}</span></button>
          <button class="pp-admin-tab" data-tab="applications">${icon('shield-check', 15)} Applications <span class="pp-tab-count">${pendingApplications.length}</span></button>
          <button class="pp-admin-tab" data-tab="adoption">${icon('heart', 15)} Adoption <span class="pp-tab-count">${pendingAdoptions.length}</span></button>
          <button class="pp-admin-tab" data-tab="entries">${icon('vote', 15)} Entries <span class="pp-tab-count">${entries.filter((e) => e.status === 'pending').length}</span></button>
          <button class="pp-admin-tab" data-tab="users">${icon('users', 15)} Users <span class="pp-tab-count">${users.length}</span></button>
          <button class="pp-admin-tab" data-tab="outreach">${icon('bell', 15)} Events &amp; posts</button>
        </div>

        <!-- ======================= OVERVIEW ======================= -->
        <section class="pp-admin-panel" data-panel="overview">
          <div class="pp-stat-grid">
            ${this._statCard(icon('users', 17), users.length, 'Registered users', `${users.filter((u) => u.suspended).length} suspended`)}
            ${this._statCard(icon('star', 17), businesses.length, 'Businesses', `${businesses.filter((b) => b.verification === 'verified').length} verified`)}
            ${this._statCard(icon('trophy', 17), activeComps, 'Live competitions', `${competitions.length} total`)}
            ${this._statCard(icon('vote', 17), entries.length, 'Competition entries', '')}
            ${this._statCard(icon('message-circle', 17), posts.length, 'Community posts', `${reviews.length} reviews`)}
            ${this._statCard(icon('sparkles', 17), pointsIssued, 'PawPoints issued', 'ledger total')}
          </div>
          <div class="pp-admin-note">${icon('sparkles', 14)} ${openReports.length ? `<strong>${openReports.length} open report${openReports.length === 1 ? '' : 's'}</strong> waiting in the moderation queue.` : 'Moderation queue is clear.'} Competitions, listings and content are within community guidelines.</div>

          <div class="pp-admin-split">
            <div class="pp-admin-mini">
              <h3>Recent admin actions</h3>
              ${recentAudit.length ? recentAudit.map((a) => `
                <div class="pp-audit-row">
                  <span><strong>${escapeHtml(a.action.replace(/_/g, ' '))}</strong><small>${escapeHtml(a.target)}</small></span>
                  <small>${escapeHtml((a.actorName || 'Admin').split(' ')[0])} · ${new Date(a.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small>
                </div>
              `).join('') : '<p class="pp-empty-state">No admin actions logged yet.</p>'}
            </div>
            <div class="pp-admin-mini">
              <h3>Recent rewards — reverse erroneous</h3>
              ${recentEarns.length ? recentEarns.map((t) => `
                <div class="pp-audit-row">
                  <span><strong>+${t.amount} pts</strong><small>${escapeHtml(t.source)} · user #${t.userId}</small></span>
                  <button class="pp-btn pp-btn-ghost pp-btn-sm js-reverse-tx" data-tx="${t.id}">Reverse</button>
                </div>
              `).join('') : '<p class="pp-empty-state">No recent awards.</p>'}
            </div>
          </div>
        </section>

        <!-- ======================= COMPETITIONS ======================= -->
        <section class="pp-admin-panel hidden" data-panel="competitions">
          <div class="pp-panel-head">
            <h2>Competitions</h2>
            <button class="pp-btn pp-btn-solid pp-btn-md" id="new-comp-btn">${icon('plus', 15)} New competition</button>
          </div>
          <div id="new-comp-slot"></div>
          <div class="pp-points-ledger">
            ${competitions.map((c) => `
              <div class="pp-side-event">
                <span class="pp-event-date ${c.status === 'active' ? '' : 'is-yellow'}"><strong>${c.status === 'active' ? 'ON' : 'END'}</strong><small>${c.status.toUpperCase()}</small></span>
                <span class="pp-event-info"><strong>${escapeHtml(c.name)}</strong><small>${icon('trophy', 12)} Voting ends ${new Date(c.votingEnd).toLocaleDateString()} · ${entries.filter((e) => e.competitionId === c.id).length} entries · ${c.entryType === 'points' ? `${c.entryCost} pts entry` : 'free entry'}</small></span>
                <span class="pp-admin-actions">
                  ${c.status === 'active' ? `<button class="pp-btn pp-btn-outline pp-btn-sm js-publish" data-comp="${c.id}">${icon('check', 13)} Publish results</button>` : '<span class="pp-votes">Completed</span>'}
                </span>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- ======================= BUSINESSES ======================= -->
        <section class="pp-admin-panel hidden" data-panel="businesses">
          <div class="pp-panel-head"><h2>Businesses</h2><span class="pp-finalist-count">${businesses.filter((b) => b.verification === 'verified').length} VERIFIED</span></div>
          <div class="pp-points-ledger">
            ${businesses.map((b) => `
              <div class="pp-side-event">
                <span class="pp-event-date"><strong>${b.rating}</strong><small>STAR</small></span>
                <span class="pp-event-info"><strong>${escapeHtml(b.name)}</strong><small>${icon('map-pin', 12)} ${escapeHtml(b.address.split(',')[0])} · ${escapeHtml(b.category)}</small></span>
                <span class="pp-admin-actions">
                  <button class="pp-btn pp-btn-outline pp-btn-sm js-verify" data-business="${b.id}">${icon('shield-check', 13)} ${b.verification === 'verified' ? 'Verified' : 'Verify'}</button>
                </span>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- ======================= CONTENT ======================= -->
        <section class="pp-admin-panel hidden" data-panel="content">
          <div class="pp-panel-head"><h2>Content moderation</h2><span class="pp-finalist-count">${posts.length} POSTS · ${reviews.length} REVIEWS</span></div>
          <div class="pp-points-ledger">
            ${posts.map((p) => `
              <div class="pp-side-event">
                <span class="pp-event-date"><strong>${(p.authorName || 'U').charAt(0)}</strong><small>POST</small></span>
                <span class="pp-event-info"><strong>${escapeHtml(p.authorName || 'Unknown')}</strong><small>${escapeHtml((p.text || '').slice(0, 70))}</small></span>
                <span class="pp-admin-actions"><button class="pp-btn pp-btn-outline pp-btn-sm js-delete-post" data-post="${p.id}">Remove</button></span>
              </div>
            `).join('')}
            ${reviews.map((r) => `
              <div class="pp-side-event">
                <span class="pp-event-date is-yellow"><strong>${r.rating}</strong><small>STAR</small></span>
                <span class="pp-event-info"><strong>Review of business #${r.businessId}</strong><small>${escapeHtml((r.comment || '').slice(0, 70))}</small></span>
                <span class="pp-admin-actions"><button class="pp-btn pp-btn-outline pp-btn-sm js-delete-review" data-review="${r.id}">Remove</button></span>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- ======================= REPORTS ======================= -->
        <section class="pp-admin-panel hidden" data-panel="reports">
          <div class="pp-panel-head"><h2>Moderation reports</h2><span class="pp-finalist-count">${openReports.length} OPEN · ${reports.length} TOTAL</span></div>
          <div class="pp-points-ledger">
            ${reports.length ? reports.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((r) => `
              <div class="pp-side-event">
                <span class="pp-event-date is-yellow"><strong>${r.targetType === 'post' ? 'P' : 'R'}</strong><small>${r.targetType.toUpperCase()}</small></span>
                <span class="pp-event-info"><strong>${escapeHtml(r.reason)}</strong><small>Reported by ${escapeHtml(r.reporterName || 'Member')} · ${escapeHtml(r.preview || '')}${r.detail ? ` · “${escapeHtml(r.detail)}”` : ''}</small></span>
                <span class="pp-admin-actions">
                  ${r.status === 'open' ? `
                    <button class="pp-btn pp-btn-outline pp-btn-sm js-report-remove" data-report="${r.id}" data-type="${r.targetType}" data-target="${r.targetId}">${icon('settings', 13)} Remove content</button>
                    <button class="pp-btn pp-btn-ghost pp-btn-sm js-report-dismiss" data-report="${r.id}">Dismiss</button>
                  ` : `<span class="pp-votes">${r.status}</span>`}
                </span>
              </div>
            `).join('') : '<p class="pp-empty-state">No reports — the community is behaving. 🐾</p>'}
          </div>
        </section>

        <!-- ======================= CHALLENGES ======================= -->
        <section class="pp-admin-panel hidden" data-panel="challenges">
          <div class="pp-panel-head"><h2>Challenge verifications</h2><span class="pp-finalist-count">${pendingVerifications.length} PENDING</span></div>
          <div class="pp-points-ledger">
            ${pendingVerifications.length ? pendingVerifications.map((p) => {
              const submitter = users.find((u) => u.id === p.userId);
              const challenge = challenges.find((c) => c.id === p.challengeId) || { name: 'Challenge' };
              return `
              <div class="pp-side-event">
                <span class="pp-event-date is-yellow"><strong>${icon('vote', 14)}</strong><small>PROOF</small></span>
                <span class="pp-event-info"><strong>${escapeHtml(submitter?.name || 'Member')} — ${escapeHtml(challenge.name)}</strong><small>“${escapeHtml(p.evidence || 'Submitted evidence')}”</small></span>
                <span class="pp-admin-actions">
                  <button class="pp-btn pp-btn-outline pp-btn-sm js-verify-challenge" data-part="${p.id}" data-user="${p.userId}" data-challenge="${escapeHtml(challenge.name)}">${icon('shield-check', 13)} Verify (+100)</button>
                </span>
              </div>`;
            }).join('') : '<p class="pp-empty-state">No evidence waiting — self-reported challenges complete instantly. 🐾</p>'}
          </div>
        </section>

        <!-- ======================= COMMUNITIES ======================= -->
        <section class="pp-admin-panel hidden" data-panel="communities">
          <div class="pp-panel-head">
            <h2>Communities</h2>
            <button class="pp-btn pp-btn-solid pp-btn-md" id="new-community-btn">${icon('plus', 15)} New community</button>
          </div>
          <div id="new-community-slot"></div>
          <div class="pp-points-ledger">
            ${communities.map((c) => `
              <div class="pp-side-event">
                <span class="pp-event-date"><strong>${c.membersBase || 0}</strong><small>MEMBERS</small></span>
                <span class="pp-event-info"><strong>${escapeHtml(c.name)}</strong><small>${icon('map-pin', 12)} ${escapeHtml(c.location)}</small></span>
                <span class="pp-admin-actions"><a class="pp-btn pp-btn-outline pp-btn-sm" href="/community/${c.id}" data-route="/community/${c.id}">${icon('users', 13)} View pack</a></span>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- ======================= ENTRIES ======================= -->
        <section class="pp-admin-panel hidden" data-panel="entries">
          <div class="pp-panel-head"><h2>Entries awaiting review</h2><span class="pp-finalist-count">${entries.filter((e) => e.status === 'pending').length} PENDING</span></div>
          <div class="pp-points-ledger">
            ${entries.filter((e) => e.status === 'pending').length ? entries.filter((e) => e.status === 'pending').map((e) => {
              const pet = null; const comp = competitions.find((c) => c.id === e.competitionId);
              return `
              <div class="pp-side-event">
                <span class="pp-event-date"><strong>${e.entryFee ? e.entryFee : 'FREE'}</strong><small>${e.entryFee ? 'PTS' : 'ENTRY'}</small></span>
                <span class="pp-event-info"><strong>${escapeHtml(comp?.name || 'Competition')}</strong><small>Owner #${e.ownerId} · Pet #${e.petId} · “${escapeHtml((e.description || '').slice(0, 70))}”</small></span>
                <span class="pp-admin-actions">
                  <button class="pp-btn pp-btn-outline pp-btn-sm js-approve-entry" data-entry="${e.id}">${icon('check', 13)} Approve</button>
                  <button class="pp-btn pp-btn-ghost pp-btn-sm js-reject-entry" data-entry="${e.id}">Reject</button>
                </span>
              </div>`;
            }).join('') : '<p class="pp-empty-state">No pending entries — the arena is clean. 🐾</p>'}
          </div>
        </section>

        <!-- ======================= ADOPTION ======================= -->
        <section class="pp-admin-panel hidden" data-panel="adoption">
          <div class="pp-panel-head"><h2>Adoption applications</h2><span class="pp-finalist-count">${pendingAdoptions.length} PENDING</span></div>
          <div class="pp-points-ledger">
            ${adoptionApplications.length ? adoptionApplications.slice().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).map((a) => `
              <div class="pp-side-event">
                <span class="pp-event-date"><strong>${escapeHtml((a.animalName || '?').charAt(0).toUpperCase())}</strong><small>ADOPT</small></span>
                <span class="pp-event-info"><strong>${escapeHtml(a.animalName || 'Animal')} — ${escapeHtml(a.applicantName || '')}</strong><small>“${escapeHtml((a.note || '').slice(0, 80))}” · ${escapeHtml(a.phone || '')}</small></span>
                <span class="pp-admin-actions">
                  ${a.status === 'submitted' ? `
                    <button class="pp-btn pp-btn-outline pp-btn-sm js-approve-adoption" data-id="${a.id}">${icon('check', 13)} Approve adoption</button>
                    <button class="pp-btn pp-btn-ghost pp-btn-sm js-reject-adoption" data-id="${a.id}">Reject</button>
                  ` : `<span class="pp-votes">${a.status}</span>`}
                </span>
              </div>
            `).join('') : '<p class="pp-empty-state">No adoption applications yet — animals wait in the rescue queue. 🐾</p>'}
          </div>
        </section>

        <!-- ======================= APPLICATIONS ======================= -->
        <section class="pp-admin-panel hidden" data-panel="applications">
          <div class="pp-panel-head"><h2>Business applications</h2><span class="pp-finalist-count">${pendingApplications.length} PENDING</span></div>
          <div class="pp-points-ledger">
            ${applications.length ? applications.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((a) => `
              <div class="pp-side-event">
                <span class="pp-event-date"><strong>${escapeHtml((a.name || '?').charAt(0).toUpperCase())}</strong><small>BIZ</small></span>
                <span class="pp-event-info"><strong>${escapeHtml(a.name)}</strong><small>${escapeHtml(a.category)} · ${escapeHtml(a.address || '')}${a.services?.length ? ` · ${escapeHtml(a.services.join(', '))}` : ''}${a.phone ? ` · ${escapeHtml(a.phone)}` : ''}</small></span>
                <span class="pp-admin-actions">
                  ${a.status === 'pending' ? `
                    <button class="pp-btn pp-btn-outline pp-btn-sm js-approve-application" data-id="${a.id}">${icon('check', 13)} Approve</button>
                    <button class="pp-btn pp-btn-ghost pp-btn-sm js-reject-application" data-id="${a.id}">Reject</button>
                  ` : `<span class="pp-votes">${a.status}</span>`}
                </span>
              </div>
            `).join('') : '<p class="pp-empty-state">No business applications yet — share the registration link.</p>'}
          </div>
        </section>

        <!-- ======================= USERS ======================= -->
        <section class="pp-admin-panel hidden" data-panel="users">
          <div class="pp-panel-head"><h2>User accounts</h2><span class="pp-finalist-count">${users.filter((u) => u.suspended).length} SUSPENDED</span></div>
          <div class="pp-admin-search"><span>${icon('search', 15)}</span><input id="admin-user-search" type="text" placeholder="Search by name or email…" aria-label="Search users"></div>
          <div class="pp-points-ledger" id="admin-users-list">
            ${users.map((u) => `
              <div class="pp-side-event pp-searchable" data-search="${escapeHtml(`${u.name} ${u.email}`.toLowerCase())}">
                <span class="pp-event-date"><strong>${u.name.charAt(0)}</strong><small>USER</small></span>
                <span class="pp-event-info"><strong>${escapeHtml(u.name)}</strong><small>${escapeHtml(u.email)} · ${u.role.replace('_', ' ')}${u.suspended ? ' · suspended' : ''}</small></span>
                <span class="pp-admin-actions">
                  ${u.role !== 'admin' ? `<button class="pp-btn pp-btn-outline pp-btn-sm js-toggle-suspend" data-user="${u.id}">${u.suspended ? 'Restore' : 'Suspend'}</button>` : '<span class="pp-votes">Admin</span>'}
                </span>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- ======================= EVENTS & POSTS ======================= -->
        <section class="pp-admin-panel hidden" data-panel="outreach">
          <div class="pp-panel-head"><h2>Events &amp; announcements</h2><span class="pp-finalist-count">${events.length} EVENTS</span></div>
          <div class="pp-admin-forms">
            <form id="new-event-form" class="pp-admin-form">
              <span class="pp-eyebrow"><span></span> CREATE EVENT</span>
              <div class="pp-form-row">
                <span class="pp-form-field"><label for="ev-title">Event title *</label><input class="pp-input" id="ev-title" type="text" placeholder="Nairobi Pet Meetup" required></span>
                <span class="pp-form-field"><label for="ev-location">Location *</label><input class="pp-input" id="ev-location" type="text" placeholder="Uhuru Park, Nairobi" required></span>
              </div>
              <span class="pp-form-field"><label for="ev-desc">Description</label><input class="pp-input" id="ev-desc" type="text" placeholder="Monthly meetup for pet owners"></span>
              <div class="pp-form-row">
                <span class="pp-form-field"><label for="ev-date">Date (days from now)</label><input class="pp-input" id="ev-date" type="number" min="1" value="7"></span>
                <span class="pp-form-field"><label for="ev-capacity">Capacity</label><input class="pp-input" id="ev-capacity" type="number" min="1" value="50"></span>
              </div>
              <button type="submit" class="pp-btn pp-btn-solid pp-btn-md">${icon('plus', 15)} Publish event</button>
            </form>
            <form id="new-announcement-form" class="pp-admin-form">
              <span class="pp-eyebrow"><span></span> POST ANNOUNCEMENT</span>
              <textarea class="pp-input" id="ann-text" rows="2" placeholder="Share a platform-wide update with the community…" required></textarea>
              <button type="submit" class="pp-btn pp-btn-ink pp-btn-md">${icon('message-circle', 15)} Post as PawPrint</button>
            </form>
          </div>
          <div class="pp-points-ledger">
            ${events.map((ev) => `
              <div class="pp-side-event">
                <span class="pp-event-date"><strong>${new Date(ev.date).getDate()}</strong><small>${new Date(ev.date).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</small></span>
                <span class="pp-event-info"><strong>${escapeHtml(ev.title)}</strong><small>${icon('map-pin', 12)} ${escapeHtml(ev.location)} · ${ev.registrations || 0}/${ev.capacity} registered</small></span>
                <span class="pp-admin-actions"><button class="pp-btn pp-btn-outline pp-btn-sm js-checkins" data-event="${ev.id}">${icon('users', 13)} Check-ins</button></span>
              </div>
              <div class="pp-event-checkins" data-checkins="${ev.id}" hidden></div>
            `).join('')}
          </div>
        </section>
      </div>
    `;

    this._bindTabs(container);
    this._bindAdminActions(container);
    this._bindOutreachForms(container);
  },

  _statCard(iconSvg, value, label, sub) {
    return `
      <div class="pp-stat-card">
        <span class="pp-stat-icon">${iconSvg}</span>
        <strong class="pp-stat-value">${value}</strong>
        <span class="pp-stat-label">${label}</span>
        ${sub ? `<small class="pp-stat-sub">${sub}</small>` : ''}
      </div>
    `;
  },

  _bindTabs(container) {
    const tabs = container.querySelectorAll('.pp-admin-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        container.querySelectorAll('.pp-admin-panel').forEach((panel) => {
          panel.classList.toggle('hidden', panel.getAttribute('data-panel') !== tab.getAttribute('data-tab'));
        });
      });
    });
  },

  _bindAdminActions(container) {
    container.querySelectorAll('.js-verify').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { dbGet, dbPut } = await import('../db.js');
        const business = await dbGet('businesses', Number(btn.getAttribute('data-business')));
        business.verification = business.verification === 'verified' ? 'pending' : 'verified';
        await dbPut('businesses', business);
        await audit(window.Auth.user, business.verification === 'verified' ? 'verify_business' : 'unverify_business', business.name);
        window.showToast(business.verification === 'verified'
          ? `${business.name} verified ✓`
          : `${business.name} verification revoked`);
        this._rerender();
      });
    });

    container.querySelectorAll('.js-delete-post').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { dbDelete, dbGet } = await import('../db.js');
        const post = await dbGet('posts', Number(btn.getAttribute('data-post')));
        if (!post) return;
        if (!window.confirm(`Remove this post by ${post.authorName}?`)) return;
        await dbDelete('posts', post.id);
        await audit(window.Auth.user, 'remove_post', `${post.authorName || 'Unknown'} — ${(post.text || '').slice(0, 40)}`);
        window.showToast('Post removed from the community feed.');
        this._rerender();
      });
    });

    container.querySelectorAll('.js-delete-review').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { dbDelete } = await import('../db.js');
        if (!window.confirm('Remove this review?')) return;
        await dbDelete('reviews', Number(btn.getAttribute('data-review')));
        await audit(window.Auth.user, 'remove_review', btn.getAttribute('data-review'));
        window.showToast('Review removed.');
        this._rerender();
      });
    });

    // Challenge evidence verification (doc §5.15) — unlocks the reward
    container.querySelectorAll('.js-verify-challenge').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { dbGet, dbPut } = await import('../db.js');
        const { awardPoints, POINT_SCHEDULE } = await import('../components/points.js');
        const participation = await dbGet('challengeParticipations', Number(btn.getAttribute('data-part')));
        if (!participation || participation.verified) return;
        const submitterId = Number(btn.getAttribute('data-user'));
        participation.verified = true;
        participation.verifiedAt = new Date().toISOString();
        await dbPut('challengeParticipations', participation);

        await awardPoints({
          userId: submitterId,
          amount: POINT_SCHEDULE.completeChallenge.amount,
          source: POINT_SCHEDULE.completeChallenge.source,
          referenceId: `challenge_${participation.challengeId}_${submitterId}`,
        });

        await (await import('../components/notify.js')).pushNotification({
          userId: submitterId,
          title: 'Challenge verified ✓',
          body: `Your evidence for "${btn.getAttribute('data-challenge')}" was verified — +${POINT_SCHEDULE.completeChallenge.amount} PawPoints.`,
          type: 'competition',
          link: '/challenges',
        });

        await audit(window.Auth.user, 'verify_challenge_evidence', `${btn.getAttribute('data-challenge')}`);
        window.showToast('Challenge verified — reward unlocked ✓');
        this._rerender();
      });
    });

    // Business applications (doc §3.3): approve → live listing, role upgrade
    container.querySelectorAll('.js-approve-application').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { dbGet, dbPut } = await import('../db.js');
        const application = await dbGet('businessApplications', Number(btn.getAttribute('data-id')));
        if (!application || application.status !== 'pending') return;

        application.status = 'approved';
        await dbPut('businessApplications', application);

        // Create the listing, owned by the applicant
        const businessId = await dbPut('businesses', {
          ownerId: application.applicantId,
          name: application.name,
          category: application.category,
          description: application.description,
          address: application.address,
          lat: -1.2633,
          lng: 36.8120,
          phone: application.phone,
          email: application.email,
          website: application.website,
          hours: application.hours || 'Ask for hours',
          services: application.services || [],
          products: [],
          priceInfo: 'Ask for pricing',
          verification: 'verified',
          rating: 0,
          reviewsCount: 0,
          socials: {},
          booking: true,
          awards: [],
          ranking: { position: 99, movement: 'steady', score: 0 },
          logo: null,
          cover: null,
          createdAt: new Date().toISOString(),
        });

        // Upgrade the applicant to business_owner so they get the dashboard
        const applicant = await dbGet('users', application.applicantId);
        if (applicant) {
          applicant.role = 'business_owner';
          await dbPut('users', applicant);
          const { password: _pw, ...safe } = applicant;
          if (window.Auth.user && window.Auth.user.id === applicant.id) window.Auth.user = safe;
        }

        await (await import('../components/notify.js')).pushNotification({
          userId: application.applicantId,
          title: 'Your business is live! 🎉',
          body: `${application.name} was approved and listed on PawPrint.`,
          type: 'business',
          link: `/business/${businessId}`,
        });

        await audit(window.Auth.user, 'approve_business_application', application.name);
        window.showToast(`${application.name} approved and listed ✓`);
        this._rerender();
      });
    });

    container.querySelectorAll('.js-reject-application').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { dbGet, dbPut } = await import('../db.js');
        const application = await dbGet('businessApplications', Number(btn.getAttribute('data-id')));
        if (!application || application.status !== 'pending') return;
        application.status = 'rejected';
        await dbPut('businessApplications', application);

        await (await import('../components/notify.js')).pushNotification({
          userId: application.applicantId,
          title: 'Application update',
          body: `PawPrint could not verify ${application.name} just yet. Add more detail and apply again.`,
          type: 'business',
        });

        await audit(window.Auth.user, 'reject_business_application', application.name);
        window.showToast('Application rejected — applicant notified.');
        this._rerender();
      });
    });

    // Adoption application review (doc §5.29) — approve/reject + animal status
    container.querySelectorAll('.js-approve-adoption').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { dbGet, dbPut } = await import('../db.js');
        const application = await dbGet('adoptionApplications', Number(btn.getAttribute('data-id')));
        if (!application || application.status !== 'submitted') return;

        application.status = 'approved';
        await dbPut('adoptionApplications', application);

        const animal = await dbGet('adoptions', application.animalId);
        if (animal) {
          animal.status = 'adopted';
          animal.adoptedAt = new Date().toISOString();
          await dbPut('adoptions', animal);
        }

        await (await import('../components/notify.js')).pushNotification({
          userId: application.applicantId,
          title: `Welcome home, ${application.animalName}! 💛`,
          body: `Your application was approved — ${animal?.org || 'the rescue'} will contact you to arrange the pick-up.`,
          type: 'business',
          link: '/adopt',
        });

        await audit(window.Auth.user, 'approve_adoption', `${application.animalName} → ${application.applicantName}`);
        window.showToast(`Adoption approved for ${application.animalName} ✓`);
        this._rerender();
      });
    });

    container.querySelectorAll('.js-reject-adoption').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { dbGet, dbPut } = await import('../db.js');
        const application = await dbGet('adoptionApplications', Number(btn.getAttribute('data-id')));
        if (!application || application.status !== 'submitted') return;
        application.status = 'rejected';
        await dbPut('adoptionApplications', application);

        await (await import('../components/notify.js')).pushNotification({
          userId: application.applicantId,
          title: 'Adoption application update',
          body: 'The rescue could not approve this match right now. They may contact you about a different animal.',
          type: 'business',
        });

        await audit(window.Auth.user, 'reject_adoption', `${application.animalName} → ${application.applicantName}`);
        window.showToast('Application rejected — applicant notified.');
        this._rerender();
      });
    });

    // Entry moderation (doc §5.12): approve/reject competition submissions
    container.querySelectorAll('.js-approve-entry').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { dbGet, dbPut } = await import('../db.js');
        const entry = await dbGet('entries', Number(btn.getAttribute('data-entry')));
        if (!entry || entry.status !== 'pending') return;
        entry.status = 'approved';
        entry.approvedAt = new Date().toISOString();
        await dbPut('entries', entry);
        await (await import('../components/notify.js')).pushNotification({
          userId: entry.ownerId,
          title: 'Entry approved! 🎉',
          body: 'Your competition entry was approved — it is now visible to voters.',
          type: 'competition',
          link: '/arena',
        });
        await audit(window.Auth.user, 'approve_entry', `Entry #${entry.id}`);
        window.showToast('Entry approved ✓');
        this._rerender();
      });
    });

    container.querySelectorAll('.js-reject-entry').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { dbGet, dbPut } = await import('../db.js');
        const entry = await dbGet('entries', Number(btn.getAttribute('data-entry')));
        if (!entry || entry.status !== 'pending') return;
        entry.status = 'rejected';
        entry.rejectedAt = new Date().toISOString();
        await dbPut('entries', entry);
        await (await import('../components/notify.js')).pushNotification({
          userId: entry.ownerId,
          title: 'Entry update',
          body: 'PawPrint reviewed your competition entry and could not approve it. Contact support if you believe this is wrong.',
          type: 'competition',
        });
        await audit(window.Auth.user, 'reject_entry', `Entry #${entry.id}`);
        window.showToast('Entry rejected — owner notified.');
        this._rerender();
      });
    });

    // Reverse an erroneous reward (doc §5.22)
    container.querySelectorAll('.js-reverse-tx').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { dbGet, dbPut } = await import('../db.js');
        const tx = await dbGet('pointsLedger', Number(btn.getAttribute('data-tx')));
        if (!tx) return;
        if (!window.confirm(`Reverse this +${tx.amount} PawPoints award to user #${tx.userId} (${tx.source})?`)) return;
        tx.status = 'reversed';
        tx.reversedAt = new Date().toISOString();
        tx.reversedBy = window.Auth.user.id;
        await dbPut('pointsLedger', tx);
        await audit(window.Auth.user, 'reverse_reward', `+${tx.amount} pts · ${tx.source} (user #${tx.userId})`);

        if (tx.userId) {
          await (await import('../components/notify.js')).pushNotification({
            userId: tx.userId,
            title: 'PawPoints adjusted',
            body: `A PawPoints award was reversed — ${tx.source}. Contact support if this looks wrong.`,
            type: 'moderation',
          });
        }

        window.showToast('Award reversed ✓');
        this._rerender();
      });
    });

    container.querySelectorAll('.js-report-dismiss').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { dbGet, dbPut } = await import('../db.js');
        const report = await dbGet('reports', Number(btn.getAttribute('data-report')));
        report.status = 'dismissed';
        await dbPut('reports', report);
        await audit(window.Auth.user, 'dismiss_report', report.targetType || 'content');
        window.showToast('Report dismissed — content kept.');
        this._rerender();
      });
    });

    container.querySelectorAll('.js-report-remove').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const type = btn.getAttribute('data-type');
        const targetId = Number(btn.getAttribute('data-target'));
        const { dbDelete, dbGet, dbPut } = await import('../db.js');
        if (!window.confirm(`Remove the reported ${type}? The reporter will be notified.`)) return;
        await dbDelete(type === 'post' ? 'posts' : 'reviews', targetId);
        const report = await dbGet('reports', Number(btn.getAttribute('data-report')));
        report.status = 'resolved';
        report.resolution = `Content removed`;
        await dbPut('reports', report);
        await audit(window.Auth.user, 'remove_reported_content', report.targetType || 'content');

        if (report.reporterId) {
          await (await import('../components/notify.js')).pushNotification({
            userId: report.reporterId,
            title: 'Report reviewed',
            body: 'Moderators removed the content you reported. Thank you for keeping PawPrint kind.',
            type: 'moderation',
            link: '/community',
          });
        }

        window.showToast('Reported content removed.');
        this._rerender();
      });
    });

    container.querySelectorAll('.js-toggle-suspend').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { dbGet, dbPut } = await import('../db.js');
        const target = await dbGet('users', Number(btn.getAttribute('data-user')));
        target.suspended = !target.suspended;
        await dbPut('users', target);
        await audit(window.Auth.user, target.suspended ? 'suspend_user' : 'restore_user', target.name);
        window.showToast(target.suspended ? `${target.name} suspended.` : `${target.name} restored.`);
        this._rerender();
      });
    });

    container.querySelectorAll('.js-publish').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const compId = Number(btn.getAttribute('data-comp'));
        if (!window.confirm('Close voting and publish the final results?')) return;
        const { dbGet, dbPut, dbGetAll } = await import('../db.js');
        const { pushNotification } = await import('../components/notify.js');
        const comp = await dbGet('competitions', compId);
        const compEntries = (await dbGetAll('entries'))
          .filter((e) => e.competitionId === compId)
          .sort((a, b) => (b.votes || 0) - (a.votes || 0));

        comp.status = 'completed';
        await dbPut('competitions', comp);
        await audit(window.Auth.user, 'publish_results', comp.name);

        await Promise.all(compEntries.map((entry, index) => pushNotification({
          userId: entry.ownerId,
          title: index === 0 ? `🏆 ${comp.name} — your pet won!` : `${comp.name} results published`,
          body: index === 0
            ? `Congratulations! Your pet finished #1 with ${entry.votes || 0} votes.`
            : `Final results are in — your pet finished #${index + 1} with ${entry.votes || 0} votes.`,
          type: 'competition',
          link: '/arena',
        })));

        window.showToast(`Results published for "${comp.name}". Participants notified.`);
        this._rerender();
      });
    });

    const newCommunityBtn = container.querySelector('#new-community-btn');
    if (newCommunityBtn) newCommunityBtn.addEventListener('click', () => this._toggleNewCommunityForm(container));

    // Users search filter (doc §7.1: search users)
    const searchInput = container.querySelector('#admin-user-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        container.querySelectorAll('#admin-users-list .pp-searchable').forEach((row) => {
          row.hidden = q.length > 0 && !row.getAttribute('data-search').includes(q);
        });
      });
    }

    const newCompBtn = container.querySelector('#new-comp-btn');
    if (newCompBtn) newCompBtn.addEventListener('click', () => this._toggleNewCompetitionForm(container));
  },

  _toggleNewCommunityForm(container) {
    const slot = container.querySelector('#new-community-slot');
    if (slot.innerHTML.trim()) { slot.innerHTML = ''; return; }

    slot.innerHTML = `
      <form id="new-community-form" class="pp-admin-form">
        <span class="pp-eyebrow"><span></span> NEW COMMUNITY</span>
        <div class="pp-form-row">
          <span class="pp-form-field"><label for="nc2-name">Community name *</label><input class="pp-input" id="nc2-name" type="text" placeholder="Kilimani Cat Club" required></span>
          <span class="pp-form-field"><label for="nc2-location">Location *</label><input class="pp-input" id="nc2-location" type="text" placeholder="Kilimani, Nairobi" required></span>
        </div>
        <span class="pp-form-field"><label for="nc2-desc">Description</label><input class="pp-input" id="nc2-desc" type="text" placeholder="What this pack is about"></span>
        <span class="pp-form-field"><label for="nc2-image">Cover image</label>
          <select class="pp-input" id="nc2-image">
            <option value="/images/pawprint-dog-park.jpg">Dog park</option>
            <option value="/images/pawprint-cat-profile.jpg">Cat profile</option>
            <option value="/images/pawprint-vet-clinic.jpg">Vet clinic</option>
            <option value="/images/pawprint-arena-dog.jpg">Arena dog</option>
          </select>
        </span>
        <span class="pp-form-field"><label for="nc2-rules">Rules (one per line)</label><textarea class="pp-input" id="nc2-rules" rows="4" placeholder="Be kind to every pet.">Be kind to every pet.
Keep posts local and on-topic.
No buying or selling in the feed.</textarea></span>
        <div class="pp-modal-actions">
          <button type="submit" class="pp-btn pp-btn-solid pp-btn-md">${icon('users', 15)} Create community</button>
          <button type="button" class="pp-btn pp-btn-ghost pp-btn-md" id="nc2-cancel">Cancel</button>
        </div>
      </form>
    `;

    slot.querySelector('#nc2-cancel').addEventListener('click', () => { slot.innerHTML = ''; });
    slot.querySelector('#new-community-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const { dbPut } = await import('../db.js');
      const { notifyRole } = await import('../components/notify.js');
      const name = slot.querySelector('#nc2-name').value.trim();
      const location = slot.querySelector('#nc2-location').value.trim();
      const description = slot.querySelector('#nc2-desc').value.trim() || 'A pack for Nairobi pet people.';
      const image = slot.querySelector('#nc2-image').value;
      const rules = slot.querySelector('#nc2-rules').value.split('\n').map((r) => r.trim()).filter(Boolean);
      await dbPut('communities', {
        name,
        location,
        description,
        image,
        rules: rules.length ? rules : ['Be kind to every pet.'],
        ownerId: window.Auth.user.id,
        membersBase: 0,
        isPublic: true,
        createdAt: new Date().toISOString(),
      });
      await audit(window.Auth.user, 'create_community', name);
      await notifyRole('pet_owner', {
        title: 'New community',
        body: `${name} just launched — come meet the pack!`,
        type: 'community',
        link: '/community',
      });
      window.showToast(`${name} created — pet owners notified.`);
      this._rerender();
    });
  },

  _toggleNewCompetitionForm(container) {
    const slot = container.querySelector('#new-comp-slot');
    if (slot.innerHTML.trim()) { slot.innerHTML = ''; return; }

    slot.innerHTML = `
      <form id="new-comp-form" class="pp-admin-form">
        <span class="pp-eyebrow"><span></span> NEW COMPETITION</span>
        <div class="pp-form-row">
          <span class="pp-form-field"><label for="nc-name">Competition name *</label><input class="pp-input" id="nc-name" type="text" placeholder="Cat of the Month" required></span>
          <span class="pp-form-field"><label for="nc-category">Category</label><input class="pp-input" id="nc-category" type="text" placeholder="Cuteness"></span>
        </div>
        <span class="pp-form-field"><label for="nc-desc">Description *</label><input class="pp-input" id="nc-desc" type="text" placeholder="Show us your pet's best side!" required></span>
        <div class="pp-form-row">
          <span class="pp-form-field"><label for="nc-prize">Prize *</label><input class="pp-input" id="nc-prize" type="text" placeholder="KES 5,000 voucher" required></span>
          <span class="pp-form-field"><label for="nc-sponsor">Sponsor (optional)</label><input class="pp-input" id="nc-sponsor" type="text" placeholder="PetMart Kenya"></span>
        </div>
        <div class="pp-form-row">
          <span class="pp-form-field"><label for="nc-fee-type">Entry fee</label>
            <select class="pp-input" id="nc-fee-type">
              <option value="free">Free entry</option>
              <option value="points">PawPoints entry</option>
            </select>
          </span>
          <span class="pp-form-field"><label for="nc-fee-cost">PawPoints cost (if charged)</label><input class="pp-input" id="nc-fee-cost" type="number" min="0" value="20"></span>
        </div>
        <div class="pp-form-row">
          <span class="pp-form-field"><label for="nc-entry-end">Entries close (days from now)</label><input class="pp-input" id="nc-entry-end" type="number" min="1" value="7"></span>
          <span class="pp-form-field"><label for="nc-voting-end">Voting closes (days from now)</label><input class="pp-input" id="nc-voting-end" type="number" min="2" value="14"></span>
        </div>
        <span class="pp-form-field"><label for="nc-eligibility">Eligibility</label><input class="pp-input" id="nc-eligibility" type="text" placeholder="All pets in Nairobi"></span>
        <div class="pp-modal-actions">
          <button type="submit" class="pp-btn pp-btn-solid pp-btn-md">${icon('trophy', 15)} Launch competition</button>
          <button type="button" class="pp-btn pp-btn-ghost pp-btn-md" id="nc-cancel">Cancel</button>
        </div>
      </form>
    `;

    slot.querySelector('#nc-cancel').addEventListener('click', () => { slot.innerHTML = ''; });
    slot.querySelector('#new-comp-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const { dbPut } = await import('../db.js');
      const { notifyRole } = await import('../components/notify.js');

      const name = slot.querySelector('#nc-name').value.trim();
      const feeType = slot.querySelector('#nc-fee-type').value;
      const feeCost = Math.max(0, Number(slot.querySelector('#nc-fee-cost').value) || 0);
      const entryEnd = new Date(Date.now() + Math.max(1, Number(slot.querySelector('#nc-entry-end').value) || 7) * 86400000).toISOString();
      const votingEnd = new Date(Date.now() + Math.max(2, Number(slot.querySelector('#nc-voting-end').value) || 14) * 86400000).toISOString();
      const prize = slot.querySelector('#nc-prize').value.trim();

      await dbPut('competitions', {
        name,
        category: slot.querySelector('#nc-category').value.trim() || 'General',
        description: slot.querySelector('#nc-desc').value.trim(),
        entryStart: new Date().toISOString(),
        entryEnd,
        votingStart: new Date().toISOString(),
        votingEnd,
        eligibility: slot.querySelector('#nc-eligibility').value.trim() || 'All pets in Nairobi',
        votingRules: 'One vote per user',
        entryType: feeType,
        entryCost: feeType === 'points' ? feeCost : 0,
        prize,
        sponsor: slot.querySelector('#nc-sponsor').value.trim() || null,
        status: 'active',
        createdAt: new Date().toISOString(),
      });

      // Announce to eligible users (doc §6.1: "New competition" → eligible users)
      const feeNote = feeType === 'points' ? ` Entry: ${feeCost} PawPoints.` : ' Free entry.';
      const notified = await notifyRole('pet_owner', {
        title: 'New competition open',
        body: `"${name}" is now open for entries — prize: ${prize}.${feeNote}`,
        type: 'competition',
        link: '/arena',
      });

      slot.innerHTML = '';
      window.showToast(`"${name}" is live — ${notified} pet owners notified.`);
      this._rerender();
    });
  },

  _bindOutreachForms(container) {
    const eventForm = container.querySelector('#new-event-form');
    if (eventForm) {
      eventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { dbPut } = await import('../db.js');
        const { notifyRole } = await import('../components/notify.js');
        const title = container.querySelector('#ev-title').value.trim();
        const days = Math.max(1, Number(container.querySelector('#ev-date').value) || 7);

        await dbPut('events', {
          title,
          description: container.querySelector('#ev-desc').value.trim() || '',
          location: container.querySelector('#ev-location').value.trim(),
          date: new Date(Date.now() + days * 86400000).toISOString(),
          organiser: 'PawPrint',
          capacity: Math.max(1, Number(container.querySelector('#ev-capacity').value) || 50),
          registrations: 0,
          createdAt: new Date().toISOString(),
        });

        // Announce the upcoming event to pet owners (doc §6.1)
        const notified = await notifyRole('pet_owner', {
          title: 'Upcoming event',
          body: `${title} — ${new Date(Date.now() + days * 86400000).toLocaleDateString()} at ${container.querySelector('#ev-location').value.trim()}.`,
          type: 'event',
          link: '/discover',
        });

        await audit(window.Auth.user, 'create_event', title);

        window.showToast(`Event published — ${notified} pet owners notified.`);
        this._rerender();
      });
    }

    // Event check-ins — mark attendance, award +75 PawPoints (doc §5.22/5.28)
    container.querySelectorAll('.js-checkins').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const eventId = Number(btn.getAttribute('data-event'));
        const slot = container.querySelector(`[data-checkins="${eventId}"]`);
        if (!slot) return;
        if (!slot.hidden) { slot.hidden = true; return; }
        const { dbGetAll, dbGetByIndex } = await import('../db.js');
        const [users, rsvps] = await Promise.all([
          dbGetAll('users'),
          dbGetByIndex('eventRsvps', 'eventId', eventId),
        ]);
        slot.innerHTML = rsvps.length ? `
          <div class="pp-checkins-list">
            ${rsvps.map((r) => {
              const person = users.find((u) => u.id === r.userId);
              return `
                <div class="pp-checkin-row">
                  <span>${escapeHtml(person?.name || 'Member')} <small>${person?.phone || ''}</small></span>
                  <button class="pp-btn pp-btn-outline pp-btn-sm js-checkin" data-user="${r.userId}" data-event="${eventId}">${icon('check', 13)} Check in · +75</button>
                </div>`;
            }).join('')}
          </div>
        ` : '<p class="pp-empty-state">No RSVPs yet.</p>';
        slot.hidden = false;

        slot.querySelectorAll('.js-checkin').forEach((checkinBtn) => {
          checkinBtn.addEventListener('click', async () => {
            const attendeeId = Number(checkinBtn.getAttribute('data-user'));
            const { awardPoints, POINT_SCHEDULE } = await import('../components/points.js');
            const result = await awardPoints({
              userId: attendeeId,
              amount: POINT_SCHEDULE.attendEvent.amount,
              source: POINT_SCHEDULE.attendEvent.source,
              referenceId: `event_${eventId}`,
            });
            await audit(window.Auth.user, 'event_checkin', `event ${eventId} · user ${attendeeId}`);
            const { pushNotification } = await import('../components/notify.js');
            if (result.awarded) {
              await pushNotification({
                userId: attendeeId,
                title: 'Checked in! 🎉',
                body: `Welcome — +${POINT_SCHEDULE.attendEvent.amount} PawPoints for attending.`,
                type: 'reward',
              });
              window.showToast('Checked in — +75 PawPoints awarded ✓');
            } else {
              window.showToast('Already checked in for this event.');
            }
            checkinBtn.disabled = true;
            checkinBtn.innerHTML = '✓ Checked in';
          });
        });
      });
    });

    const annForm = container.querySelector('#new-announcement-form');
    if (annForm) {
      annForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { dbPut } = await import('../db.js');
        const text = container.querySelector('#ann-text').value.trim();
        if (!text) return;

        await dbPut('posts', {
          authorId: 0,
          authorName: 'PawPrint',
          text,
          type: 'announcement',
          photos: [],
          reactions: 0,
          comments: 0,
          createdAt: new Date().toISOString(),
        });

        container.querySelector('#ann-text').value = '';
        window.showToast('Announcement posted to the community feed.');
        this._rerender();
      });
    }
  },

  async _rerender() {
    const { navigateTo } = await import('../router.js');
    navigateTo('/admin');
  },
};
