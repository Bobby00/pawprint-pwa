// ============================================================================
// PawPrint — Payment engine (Paystack inline checkout)
// Sandbox mode: "test mode" banner, dummy reference scheme, zero real charges.
// Live mode: standard Paystack inline popup + STK push for M-Pesa.
// Every transaction is recorded in the `payments` store for auditability.
// ============================================================================

import { icon } from './icons.js';
import { USE_SANDBOX, PAYSTACK_PUBLIC_KEY, PLANS } from '../payments-config.js';
import { escapeHtml } from './sanitize.js';

export const isSandboxKeyPlaceholder = () => PAYSTACK_PUBLIC_KEY.includes('replace_with_your');

function refPrefix(purpose) {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PP-${purpose.slice(0, 3).toUpperCase()}-${ts}${rnd}`;
}

export const Payments = {
  plans: PLANS,

  isConfigured() {
    return !isSandboxKeyPlaceholder();
  },

  async recordPayment({ purpose, purposeId, amount, currency = 'KES', method, reference, status, userId, businessId = null, meta = {} }) {
    const { dbPut } = await import('../db.js');
    await dbPut('payments', {
      reference,
      purpose,
      purposeId,
      amount,
      currency,
      method,
      status,
      userId,
      businessId,
      ...meta,
      createdAt: new Date().toISOString(),
      paidAt: status === 'success' ? new Date().toISOString() : null,
    });
    return reference;
  },

  async getPaymentsForUser(userId) {
    const { dbGetByIndex } = await import('../db.js');
    return dbGetByIndex('payments', 'userId', userId);
  },

  async getPaymentsForBusiness(businessId) {
    const { dbGetByIndex } = await import('../db.js');
    return dbGetByIndex('payments', 'businessId', businessId);
  },

  /**
   * Open the checkout modal for a purchase.
   * opts: { purpose, purposeId, label, amount, currency, userId, businessId? }
   * Resolves when the payment completes or the user cancels.
   */
  openCheckout(opts) {
    return new Promise((resolve) => {
      const { purpose, purposeId, label, amount, currency = 'KES', userId, businessId = null } = opts;
      const root = document.createElement('div');
      root.innerHTML = `
        <div class="pp-modal-overlay" id="payment-modal">
          <div class="pp-modal">
            <div class="pp-modal-head">
              <h3>Pay — ${escapeHtml(label)}</h3>
              <button class="pp-modal-close" aria-label="Close">✕</button>
            </div>
            <div class="pp-payment-shell">
              ${USE_SANDBOX ? '<div class="pp-sandbox-banner">TEST MODE — no real money moves. Paste a Paystack test public key (pk_test_*) into payments-config.js to complete a test purchase.</div>' : ''}
              <div class="pp-payment-summary">
                <span>${icon('sparkles', 14)} Amount due</span>
                <strong>${currency} ${Number(amount).toLocaleString()}</strong>
              </div>
              <div class="pp-payment-tabs" role="tablist">
                <button class="pp-payment-tab is-active" data-method="mpesa" role="tab">${icon('message-circle', 16)} M-Pesa</button>
                <button class="pp-payment-tab" data-method="card" role="tab">${icon('star', 16)} Card</button>
                <button class="pp-payment-tab" data-method="bank" role="tab">${icon('compass', 16)} Bank transfer</button>
              </div>

              <section class="pp-payment-panel" data-panel="mpesa">
                <span class="pp-form-field"><label for="pay-phone">M-Pesa phone number</label><input class="pp-input" id="pay-phone" type="tel" placeholder="+254 722 000 000" autocomplete="off" required></span>
                <p class="pp-demo-note">Paystack sends an STK push to this phone — enter your M-Pesa PIN when you see it.</p>
                <button class="pp-btn pp-btn-solid pp-btn-md pp-full js-pay-now">${icon('arrow-right', 15)} Send STK push</button>
              </section>

              <section class="pp-payment-panel hidden" data-panel="card">
                <p class="pp-demo-note">Visa, Mastercard and Amex are accepted. Your card details go to Paystack's secure checkout — never to PawPrint.</p>
                <button class="pp-btn pp-btn-solid pp-btn-md pp-full js-pay-now">${icon('star', 15)} Continue with card</button>
              </section>

              <section class="pp-payment-panel hidden" data-panel="bank">
                <p class="pp-payment-bank-title">Transfer to the PawPrint account</p>
                <div class="pp-payment-bank-details">
                  <div><small>BANK</small><strong>KCB Group Plc</strong></div>
                  <div><small>ACCOUNT</small><strong>1234 5678 9012</strong></div>
                  <div><small>REFERENCE</small><strong id="pay-reference">${refPrefix(purpose)}</strong></div>
                </div>
                <p class="pp-demo-note">Use the reference above — our team matches the transfer within one working day. No automatic upgrade happens until funds clear.</p>
                <button class="pp-btn pp-btn-outline pp-btn-md pp-full js-pay-now">${icon('check', 15)} I've transferred — notify PawPrint</button>
              </section>

              ${USE_SANDBOX ? `
                <button class="pp-btn pp-btn-ghost pp-btn-md pp-full js-simulate-payment">${icon('check', 13)} Simulate successful test payment</button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(root);

      const close = (outcome = 'cancelled') => {
        root.remove();
        resolve(outcome);
      };

      root.querySelector('.pp-modal-close').addEventListener('click', () => close('cancelled'));
      root.querySelector('.pp-modal-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) close('cancelled');
      });

      // Tab switching
      const tabs = root.querySelectorAll('.pp-payment-tab');
      const panels = root.querySelectorAll('.pp-payment-panel');
      tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          tabs.forEach((t) => t.classList.remove('is-active'));
          panels.forEach((p) => p.classList.add('hidden'));
          tab.classList.add('is-active');
          const target = tab.getAttribute('data-method');
          root.querySelector(`[data-panel="${target}"]`).classList.remove('hidden');
        });
      });

      // Simulate a successful test payment (sandbox only — lets the demo flow complete without Paystack keys)
      root.querySelector('.js-simulate-payment')?.addEventListener('click', () => {
        const reference = refPrefix(purpose);
        const note = root.querySelector('#pay-reference');
        if (note) note.textContent = reference;
        this.recordPayment({
          purpose,
          purposeId,
          amount,
          currency,
          method: 'simulated_test',
          reference,
          status: 'success',
          userId,
          businessId,
        }).then(() => close('paid'));
      });

      // "Pay now" buttons (real flow once keys are in place)
      root.querySelectorAll('.js-pay-now').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const method = root.querySelector('.pp-payment-tab.is-active')?.getAttribute('data-method') || 'mpesa';
          const reference = refPrefix(purpose);

          if (USE_SANDBOX && !this.isConfigured()) {
            btn.disabled = true;
            btn.textContent = 'Paystack not configured — use Simulate';
            return;
          }

          if (method === 'bank') {
            await this.recordPayment({
              purpose,
              purposeId,
              amount,
              currency,
              method: 'bank_transfer',
              reference,
              status: 'pending_clearance',
              userId,
              businessId,
            });
            close('bank_pending');
            return;
          }

          if (!window.PaystackPop) {
            window.showToast('Paystack library is still loading — check your connection.', { action: 'OK' });
            return;
          }

          const email = window.Auth?.user?.email || 'customer@pawprint.demo';
          const baseConfig = {
            key: PAYSTACK_PUBLIC_KEY,
            email: email,
            amount: Math.round(Number(amount) * 100), // Paystack expects the smallest currency unit
            currency: currency,
            ref: reference,
            metadata: {
              purpose,
              purposeId,
              custom_fields: [
                { display_name: 'Purpose', variable_name: 'purpose', value: label },
              ],
            },
            callback: (response) => {
              this.recordPayment({
                purpose,
                purposeId,
                amount,
                currency,
                method: method === 'mpesa' ? 'mobile_money' : 'card',
                reference: response.reference || reference,
                status: 'success',
                userId,
                businessId,
              }).then(() => close('paid'));
            },
            onClose: () => {
              this.recordPayment({
                purpose,
                purposeId,
                amount,
                currency,
                method,
                reference,
                status: 'abandoned',
                userId,
                businessId,
              });
              close('cancelled');
            },
          };

          if (method === 'mpesa') {
            const phoneRaw = root.querySelector('#pay-phone');
            const phone = phoneRaw?.value.replace(/\D/g, '') || '';
            if (!phone || phone.length < 10) {
              window.showToast('Enter a valid M-Pesa phone number.', { action: 'OK' });
              return;
            }
            baseConfig.channels = ['mobile_money'];
            baseConfig.mobile_money = {
              phone,
              provider: 'mpesa',
            };
          } else {
            baseConfig.channels = ['card'];
          }

          try {
            const handler = window.PaystackPop.setup(baseConfig);
            handler.openIframe();
          } catch (err) {
            window.showToast('Could not reach Paystack: ' + (err?.message || 'unknown error'), { action: 'OK' });
          }
        });
      });
    });
  },

  /** The "Upgrade" box for business owners. */
  openPlanModal(business, onUpgraded) {
    const highlight = PLANS.find((p) => p.highlight);
    const planOptions = PLANS.map((p) => `
      <div class="pp-plan-card ${p.id === business.subscription ? 'is-current' : ''} ${p.highlight ? 'is-highlighted' : ''}">
        <div class="pp-plan-head"><strong>${p.name}</strong><span class="pp-plan-price">${p.price ? `KES ${p.price.toLocaleString()}/mo` : 'Free'}</span></div>
        <ul>${p.features.map((f) => `<li>${icon('check', 12)} ${f}</li>`).join('')}</ul>
        ${p.id === business.subscription ? '<span class="pp-plan-current">Current plan</span>' : `<button class="pp-btn pp-btn-solid pp-btn-sm js-choose-plan" data-plan="${p.id}">${p.price ? `Upgrade — KES ${p.price.toLocaleString()}` : 'Downgrade'}</button>`}
      </div>
    `).join('');

    const root = document.createElement('div');
    root.innerHTML = `
      <div class="pp-modal-overlay" id="plan-modal">
        <div class="pp-modal pp-modal-wide">
          <div class="pp-modal-head"><h3>Choose your plan</h3><button class="pp-modal-close" aria-label="Close">✕</button></div>
          <p class="pp-payment-plan-intro">Upgrade your reach. Plans renew monthly — cancel anytime. ${highlight ? `Most businesses pick Standard.` : ''}</p>
          <div class="pp-plans-grid">${planOptions}</div>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    const close = () => root.remove();
    root.querySelector('.pp-modal-close').addEventListener('click', close);
    root.querySelector('.pp-modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) close();
    });

    root.querySelectorAll('.js-choose-plan').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const planId = btn.getAttribute('data-plan');
        const plan = PLANS.find((p) => p.id === planId);

        if (plan.price === 0) {
          // Downgrade — no payment needed
          const { dbGet, dbPut } = await import('../db.js');
          const record = await dbGet('businesses', business.id);
          record.subscription = 'free';
          await dbPut('businesses', record);
          close();
          if (onUpgraded) onUpgraded('free');
          window.showToast?.('Switched to the Free plan.');
          return;
        }

        close();
        const outcome = await this.openCheckout({
          purpose: 'subscription',
          purposeId: `business_${business.id}_${plan.id}`,
          label: `Standard Subscription — ${plan.name}`,
          amount: plan.price,
          currency: 'KES',
          userId: window.Auth.user.id,
          businessId: business.id,
        });

        if (outcome === 'paid') {
          const { dbGet, dbPut } = await import('../db.js');
          const record = await dbGet('businesses', business.id);
          record.subscription = plan.id;
          record.subscriptionRenewsAt = new Date(Date.now() + 30 * 86400000).toISOString();
          await dbPut('businesses', record);
          if (onUpgraded) onUpgraded(plan.id);
          window.showToast?.(`Welcome to ${plan.name}!`);
        }
      });
    });
  },
};
