// ============================================================================
// PawPrint — Rewards catalogue + PawPoints redemption (doc §5.23)
// Lifecycle: browse → redeem (spendPoints) → voucher code issued → redemption
// record → provider notified → business confirms at visit.
// ============================================================================

import { icon } from '../components/icons.js';
import { escapeHtml } from '../components/sanitize.js';

const TYPE_ICONS = { discount: 'sparkles', service: 'check', voucher: 'star' };

function voucherCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return `PP-${out}`;
}

function relative(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const RewardsPage = {
  pageTitle: 'Rewards',

  async render(container) {
    const user = window.Auth.user;
    const { dbGetAll, dbGetByIndex } = await import('../db.js');
    const { getPointsBalance, getExpiringSoon } = await import('../components/points.js');

    const [rewards, balance, expiringSoon] = await Promise.all([
      dbGetAll('rewards'),
      getPointsBalance(user.id),
      getExpiringSoon(user.id, 30),
    ]);
    const available = rewards.filter((r) => r.available !== false);
    const myRedemptions = await dbGetByIndex('redemptions', 'userId', user.id);
    myRedemptions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    container.innerHTML = `
      <div class="pp-standard-page">
        <div class="pp-page-heading">
          <div>
            <div class="pp-eyebrow"><span></span>PAWPOINTS REWARDS</div>
            <h1>Rewards <span>store.</span></h1>
            <p>Turn your PawPoints into treats, services and discounts from Nairobi businesses.</p>
          </div>
        </div>

        <section class="pp-rewards-hero">
          <div class="pp-rewards-balance">
            <span class="pp-rewards-balance-icon">${icon('sparkles', 22)}</span>
            <div>
              <strong>${balance.toLocaleString()}</strong>
              <small>PawPoints available</small>
              ${expiringSoon > 0 ? `<small class="pp-expiry-inline">${expiringSoon} expire in 30 days</small>` : ''}
            </div>
          </div>
          <div class="pp-rewards-hero-stats">
            <span><strong>${available.length}</strong><small>Rewards open</small></span>
            <span><strong>${myRedemptions.length}</strong><small>Redeemed by you</small></span>
          </div>
        </section>

        <div class="pp-community-feed-title">
          <h2>Catalogue</h2>
          <span class="pp-finalist-count">${available.length} REWARDS</span>
        </div>
        <div class="pp-rewards-grid">
          ${available.map((r) => {
            const affordable = balance >= r.cost;
            const icon_name = TYPE_ICONS[r.type] || 'sparkles';
            return `
            <article class="pp-reward-card">
              <div class="pp-reward-head">
                <span class="pp-reward-icon">${icon(icon_name, 18)}</span>
                <span class="pp-reward-type">${r.type}</span>
              </div>
              <h3>${escapeHtml(r.title)}</h3>
              <p>${escapeHtml(r.description || '')}</p>
              <span class="pp-reward-provider">${icon('map-pin', 12)} ${escapeHtml(r.provider)}</span>
              <div class="pp-reward-foot">
                <span class="pp-reward-cost">${icon('sparkles', 13)} ${r.cost} pts</span>
                <button class="pp-btn pp-btn-sm ${affordable ? 'pp-btn-solid' : 'pp-btn-ghost'} js-redeem" data-id="${r.id}" ${affordable ? '' : 'disabled'}>
                  ${affordable ? 'Redeem' : `Need ${r.cost - balance} more`}
                </button>
              </div>
            </article>`;
          }).join('')}
        </div>

        <div class="pp-community-feed-title">
          <h2>Your redemptions</h2>
          <span class="pp-finalist-count">${myRedemptions.length} TOTAL</span>
        </div>
        <div id="redemption-list">
          ${myRedemptions.length ? myRedemptions.map((r) => `
            <article class="pp-redemption-row">
              <span class="pp-redemption-icon">${icon('star', 16)}</span>
              <div class="pp-redemption-copy">
                <strong>${escapeHtml(r.rewardTitle)}</strong>
                <small>${escapeHtml(r.provider)} · ${relative(r.createdAt)}</small>
              </div>
              <div class="pp-redemption-meta">
                <code>${r.voucherCode}</code>
                <span class="pp-redemption-status ${r.status === 'confirmed' ? 'is-confirmed' : ''}">${r.status}</span>
              </div>
            </article>
          `).join('') : '<p class="pp-empty-state">No redemptions yet — pick a reward above and treat your pet. 🐾</p>'}
        </div>

        <p class="pp-demo-note">How it works: redeem → a voucher code is issued → show it at the business → they confirm your reward (doc §5.23).</p>
      </div>
      <div id="redeem-modal-root"></div>
    `;

    container.querySelectorAll('.js-redeem').forEach((btn) => {
      btn.addEventListener('click', () => {
        const reward = available.find((r) => r.id === Number(btn.getAttribute('data-id')));
        if (reward) this._openRedeemModal(container, reward, balance);
      });
    });
  },

  async _openRedeemModal(container, reward, balance) {
    const user = window.Auth.user;
    const root = container.querySelector('#redeem-modal-root');

    root.innerHTML = `
      <div class="pp-modal-overlay" id="redeem-modal">
        <div class="pp-modal">
          <div class="pp-modal-head"><h3>Redeem reward</h3><button class="pp-modal-close" aria-label="Close">✕</button></div>
          <form id="redeem-form" class="pp-modal-form">
            <div class="pp-reward-summary">
              <strong>${escapeHtml(reward.title)}</strong>
              <small>${escapeHtml(reward.provider)}</small>
            </div>
            <div class="pp-reward-balance-check">
              <span>Balance</span><span>${balance} pts</span>
              <span>Cost</span><span>−${reward.cost} pts</span>
              <span class="pp-reward-after">After</span><span class="pp-reward-after">${balance - reward.cost} pts</span>
            </div>
            <p class="pp-demo-note">Confirming spends <strong>${reward.cost} PawPoints</strong> and issues a voucher code to show at the business.</p>
            <div class="pp-modal-actions">
              <button type="submit" class="pp-btn pp-btn-solid pp-btn-md">${icon('sparkles', 15)} Redeem for ${reward.cost} pts</button>
              <button type="button" class="pp-btn pp-btn-ghost pp-btn-md pp-modal-dismiss">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => { root.innerHTML = ''; };
    root.querySelectorAll('.pp-modal-close, .pp-modal-dismiss').forEach((b) => b.addEventListener('click', closeModal));
    root.querySelector('.pp-modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    root.querySelector('#redeem-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const { dbGetAll, dbPut } = await import('../db.js');
      const { spendPoints } = await import('../components/points.js');
      const { pushNotification } = await import('../components/notify.js');

      const result = await spendPoints({
        userId: user.id,
        amount: reward.cost,
        source: `Redeem reward — ${reward.title}`,
        referenceId: `reward_${reward.id}_${Date.now()}`,
      });
      if (!result.spent) {
        window.showToast('Not enough PawPoints for this reward.');
        return;
      }

      const code = voucherCode();
      const businesses = await dbGetAll('businesses');
      const business = businesses.find((b) => b.name === reward.provider);

      await dbPut('redemptions', {
        rewardId: reward.id,
        rewardTitle: reward.title,
        userId: user.id,
        userName: user.name,
        businessId: business ? business.id : null,
        provider: reward.provider,
        cost: reward.cost,
        status: 'pending',
        voucherCode: code,
        createdAt: new Date().toISOString(),
      });

      if (business && business.ownerId) {
        await pushNotification({
          userId: business.ownerId,
          title: 'Reward redemption',
          body: `${user.name} redeemed "${reward.title}" — voucher ${code}. Confirm at their visit.`,
          type: 'reward',
          link: `/dashboard`,
        });
      }

      closeModal();
      window.showToast(`Voucher ${code} issued — show it at ${reward.provider} 💛`, business ? {
        action: 'View business',
        onAction: async () => {
          const { navigateTo } = await import('../router.js');
          navigateTo(`/business/${business.id}`);
        },
      } : undefined);
      const { navigateTo } = await import('../router.js');
      navigateTo('/rewards');
    });
  },
};
