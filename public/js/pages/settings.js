// ============================================================================
// PawPrint — Account settings (doc §5.1 / §6.1)
// Notification preferences (per category, per account), change password,
// and account deactivation (doc: delete or deactivate accounts).
// ============================================================================

import { icon } from '../components/icons.js';

const PREF_CATEGORIES = [
  { key: 'competition', label: 'Competitions & challenges', desc: 'Entries, votes, results, challenge nudges' },
  { key: 'community', label: 'Community', desc: 'Comments, mentions and new pack announcements' },
  { key: 'business', label: 'Business & bookings', desc: 'Reviews, booking updates and replies' },
  { key: 'rewards', label: 'Rewards', desc: 'PawPoints earned and redemption updates' },
  { key: 'marketing', label: 'Marketing', desc: 'Offers, campaigns and sponsored content' },
];

function prefKey(userId) {
  return `pawprint_notif_prefs_${userId}`;
}

function loadPrefs(userId) {
  try { return JSON.parse(localStorage.getItem(prefKey(userId))) || {}; } catch (e) { return {}; }
}

function savePrefs(userId, prefs) {
  try { localStorage.setItem(prefKey(userId), JSON.stringify(prefs)); } catch (e) { /* ignore */ }
}

export const SettingsPage = {
  pageTitle: 'Settings',

  async render(container) {
    const user = window.Auth.user;
    const prefs = loadPrefs(user.id);

    container.innerHTML = `
      <div class="pp-standard-page">
        <a href="/profile" class="pp-back-link" data-route="/profile">${icon('chevron-right', 14)} Back to profile</a>

        <div class="pp-page-heading"><div><div class="pp-eyebrow"><span></span>YOUR ACCOUNT</div><h1>Settings<span>.</span></h1></div></div>

        <section class="pp-details-card">
          <h3>${icon('bell', 15)} Notifications</h3>
          <p class="pp-settings-sub">Choose what PawPrint may notify you about. Essential account and transaction alerts always stay on.</p>
          <div class="pp-settings-list">
            ${PREF_CATEGORIES.map(({ key, label, desc }) => `
              <label class="pp-setting-row">
                <span class="pp-setting-copy"><strong>${label}</strong><small>${desc}</small></span>
                <span class="pp-toggle ${prefs[key] !== false ? 'is-on' : ''}" role="switch" aria-checked="${prefs[key] !== false}" tabindex="0" data-key="${key}"><span></span></span>
              </label>
            `).join('')}
          </div>
          <small class="pp-demo-note">Saved instantly on this device. Signing in on another device re-reads the defaults until it syncs.</small>
        </section>

        <section class="pp-details-card">
          <h3>${icon('shield-check', 15)} Change password</h3>
          <form id="change-password-form" class="pp-modal-form">
            <span class="pp-form-field"><label for="cp-current">Current password</label><input class="pp-input" id="cp-current" type="password" required autocomplete="current-password"></span>
            <div class="pp-form-row">
              <span class="pp-form-field"><label for="cp-new">New password</label><input class="pp-input" id="cp-new" type="password" minlength="6" required autocomplete="new-password"></span>
              <span class="pp-form-field"><label for="cp-confirm">Confirm new</label><input class="pp-input" id="cp-confirm" type="password" minlength="6" required autocomplete="new-password"></span>
            </div>
            <div class="pp-modal-actions">
              <button type="submit" class="pp-btn pp-btn-solid pp-btn-md">${icon('check', 15)} Update password</button>
            </div>
          </form>
        </section>

        <section class="pp-details-card pp-danger-card">
          <h3>${icon('logout', 15)} Deactivate account</h3>
          <p class="pp-settings-sub">Deactivation hides your profile, pets and posts and stops sign-in. An administrator can restore your account later — nothing is permanently deleted yet (full deletion ships with the production release).</p>
          <button class="pp-btn pp-btn-outline pp-btn-md" id="deactivate-account-btn">${icon('logout', 15)} Deactivate my account</button>
        </section>
      </div>
    `;

    this._bind(container);
  },

  async _bind(container) {
    const user = window.Auth.user;

    // Notification preference toggles
    container.querySelectorAll('.pp-toggle').forEach((toggle) => {
      const flip = () => {
        const prefs = loadPrefs(user.id);
        const key = toggle.getAttribute('data-key');
        const enabled = toggle.classList.toggle('is-on');
        prefs[key] = enabled;
        toggle.setAttribute('aria-checked', String(enabled));
        savePrefs(user.id, prefs);
        window.showToast(enabled ? 'Notifications turned on 🔔' : 'Notifications muted 🔕');
      };
      toggle.addEventListener('click', flip);
      toggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
      });
    });

    // Change password
    const form = container.querySelector('#change-password-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const current = container.querySelector('#cp-current').value;
      const next = container.querySelector('#cp-new').value;
      const confirm = container.querySelector('#cp-confirm').value;
      if (next !== confirm) { window.showToast('New passwords do not match.'); return; }
      const { dbGet, dbPut } = await import('../db.js');
      const record = await dbGet('users', user.id);
      if (record.password !== current) { window.showToast('Current password is incorrect.'); return; }
      record.password = next;
      await dbPut('users', record);
      form.reset();
      window.showToast('Password updated ✓');
    });

    // Deactivate account
    const deactivate = container.querySelector('#deactivate-account-btn');
    deactivate.addEventListener('click', async () => {
      if (!window.confirm('Deactivate your account? You will be signed out and your profile will be hidden. An admin can restore you later.')) return;
      const { dbGet, dbPut } = await import('../db.js');
      const record = await dbGet('users', user.id);
      record.suspended = true;
      await dbPut('users', record);
      window.Auth.logout();
      window.showToast('Account deactivated. An admin can restore you anytime.');
      window.location.href = '/login';
    });
  },
};
