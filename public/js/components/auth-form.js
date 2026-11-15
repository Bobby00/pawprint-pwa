// ============================================================================
// PawPrint — Shared auth screens (login / signup) + OTP verification
// Split layout: yellow story panel (desktop) + form panel, per approved design.
// Social sign-in is mocked; OTP delivery is mocked via a chat preview card.
// ============================================================================

import { icon, brandMarkSolid } from './icons.js';

const APPLE_SVG = '<svg class="pp-apple-mark" viewBox="0 0 20 22" aria-hidden="true"><path d="M16.7 11.7c0-2.7 2.2-4 2.3-4.1a5 5 0 0 0-4-2.2c-1.7-.2-3.3 1-4.2 1-.9 0-2.3-1-3.8-1a5.6 5.6 0 0 0-4.7 2.9c-2 3.5-.5 8.7 1.5 11.5 1 1.4 2 2.8 3.4 2.7 1.4 0 1.9-.9 3.7-.9s2.2.9 3.7.8c1.5 0 2.4-1.4 3.3-2.8a12 12 0 0 0 1.5-3.2 4.7 4.7 0 0 1-2.7-4.7M13.9 3.6A4.8 4.8 0 0 0 15 0a5 5 0 0 0-3.2 1.7 4.6 4.6 0 0 0-1.2 3.5 4.2 4.2 0 0 0 3.3-1.6Z" transform="scale(.9) translate(1 1)"/></svg>';

function storyPanel(signup) {
  return `
    <section class="pp-auth-left">
      <a href="/" class="pp-brand pp-auth-brand" data-route="/">
        <span class="pp-brand-mark">${brandMarkSolid(24)}</span>
        <span>pawprint<span class="pp-brand-period">.</span></span>
      </a>
      <span class="pp-auth-index">A HAPPIER WAY TO BE A PET PARENT</span>
      <div class="pp-auth-story">
        <span class="pp-auth-sticker">${icon('paw-print', 16)} MADE FOR PET PEOPLE</span>
        <h1>${signup
          ? `Their whole<br />world starts<br />with <span>you.</span>`
          : `The world<br />around your<br /><span>pet.</span>`}</h1>
        <p>Find your people, discover your neighbourhood and celebrate every little pawprint along the way.</p>
        <div class="pp-auth-story-photo">
          <img src="/images/pawprint-dog-park.jpg" alt="A happy dog out exploring Nairobi" />
          <span><strong>Life is better in good company.</strong><small>Nairobi's pet community is waiting.</small></span>
        </div>
      </div>
      <span class="pp-auth-left-foot">PAWPRINT · NAIROBI, KENYA</span>
    </section>
  `;
}

/** Verify the just-created / just-logged-in account before entering the app. */
async function requireVerification(container, user, onAuthed) {
  if (user.verified) { onAuthed(); return; }
  const { renderVerification } = await import('./verification.js');
  renderVerification(container, user, onAuthed);
}

/** Mock social sign-in: creates or reuses a verified demo identity. */
async function socialSignIn(provider, onAuthed) {
  const Auth = window.Auth;
  await Auth.socialLogin(provider);
  window.showToast(`Signed in with ${provider === 'google' ? 'Google' : 'Apple'} (demo) 🐾`);
  onAuthed();
}

function renderAuth(container, { signup = false, onSubmit, onAuthed }) {
  const heading = signup
    ? { eyebrow: 'COME ON IN', title: 'Join the pack.', sub: 'Create your account. Your pet\u2019s people are here.' }
    : { eyebrow: 'GOOD TO SEE YOU AGAIN', title: 'Welcome back.', sub: 'Pick up right where you and your best friend left off.' };
  const toplink = signup
    ? { text: 'Already part of the pack?', label: 'Sign in', route: '/login' }
    : { text: 'New to PawPrint?', label: 'Join the pack', route: '/register' };

  container.innerHTML = `
    <div class="pp-auth-layout">
      ${storyPanel(signup)}
      <section class="pp-auth-right">
        <div class="pp-auth-form-wrap">
          <div class="pp-auth-toplink">
            <span>${toplink.text}</span>
            <a href="${toplink.route}" data-route="${toplink.route}">${toplink.label} ${icon('arrow-right', 14)}</a>
          </div>
          <span class="pp-auth-mobile-brand">
            <a href="/" class="pp-brand" data-route="/"><span class="pp-brand-mark">${brandMarkSolid(24)}</span><span>pawprint<span class="pp-brand-period">.</span></span></a>
          </span>
          <div class="pp-auth-heading">
            <span class="pp-eyebrow"><span></span> ${heading.eyebrow}</span>
            <h2>${heading.title}</h2>
            <p>${heading.sub}</p>
          </div>
          <div class="pp-auth-socials">
            <button type="button" class="pp-social-button js-social" data-provider="google"><span class="pp-google-g">G</span> Continue with Google</button>
            <button type="button" class="pp-social-button js-social" data-provider="apple">${APPLE_SVG} Continue with Apple</button>
          </div>
          <div class="pp-auth-divider"><span></span> <span>OR WITH EMAIL</span> <span /></div>
          <form id="pp-auth-form" class="pp-auth-form" autocomplete="on">
            ${signup ? `
              <span class="pp-form-field"><label for="pp-name">Full name</label><input class="pp-input" id="pp-name" type="text" placeholder="Amina Wanjiku" required autocomplete="name"></span>
              <span class="pp-form-field"><label for="pp-phone">Phone number</label><input class="pp-input" id="pp-phone" type="tel" placeholder="+254 700 000 000" required autocomplete="tel"></span>
              <span class="pp-form-field"><label for="pp-location">Neighbourhood</label><input class="pp-input" id="pp-location" type="text" placeholder="Westlands, Nairobi" autocomplete="address-level2"></span>
              <span class="pp-form-field"><label for="pp-role">I am a</label>
                <select class="pp-input" id="pp-role">
                  <option value="pet_owner">Pet owner</option>
                  <option value="business_owner">Business owner</option>
                </select>
              </span>
              <span class="pp-form-field"><label for="pp-referral">Referral code (optional)</label><input class="pp-input" id="pp-referral" type="text" placeholder="Friend's code — e.g. AMINA-PAW1" autocomplete="off"></span>
            ` : ''}
            <span class="pp-form-field"><label for="pp-email">Email</label><input class="pp-input" id="pp-email" type="email" placeholder="you@example.com" required autocomplete="email"></span>
            <span class="pp-form-field"><label for="pp-password">Password</label><input class="pp-input" id="pp-password" type="password" placeholder="••••••••" required autocomplete="${signup ? 'new-password' : 'current-password'}"></span>
            ${signup ? '' : `
              <div class="pp-auth-forgot"><span>Demo: amina@example.com · password123</span><button type="button" id="pp-forgot">Forgot?</button></div>
            `}
            <button type="submit" class="pp-btn pp-btn-solid pp-auth-submit" id="pp-auth-submit">${signup ? 'Create account' : 'Sign in'} ${icon('arrow-right', 14)}</button>
          </form>
          <p class="pp-auth-terms">By continuing you agree to PawPrint's <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.</p>
          <div class="pp-auth-points">
            <span class="pp-auth-points-icon">${icon('sparkles', 16)}</span>
            <span><strong>Start earning PawPoints</strong><small>${signup ? 'Get 50 points the moment you finish a pet profile.' : 'Points are waiting for you and your best friend.'}</small></span>
            ${icon('chevron-right', 16)}
          </div>
          <a href="/" class="pp-auth-back" data-route="/">Back to Nairobi feed</a>
        </div>
      </section>
    </div>
    <button class="pp-theme-float js-theme-toggle" aria-label="Toggle dark mode"></button>
  `;

  const form = container.querySelector('#pp-auth-form');
  const submit = container.querySelector('#pp-auth-submit');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const values = {
      email: container.querySelector('#pp-email').value.trim(),
      password: container.querySelector('#pp-password').value,
    };
    if (signup) {
      values.name = container.querySelector('#pp-name').value.trim();
      values.phone = container.querySelector('#pp-phone').value.trim();
      values.location = container.querySelector('#pp-location').value.trim();
      values.role = container.querySelector('#pp-role').value;
      values.referralCode = container.querySelector('#pp-referral').value.trim();
    }
    submit.disabled = true;
    const original = submit.innerHTML;
    submit.innerHTML = `${signup ? 'Creating…' : 'Signing in…'}`;
    try {
      const user = await onSubmit(values);
      await requireVerification(container, user, onAuthed);
    } catch (err) {
      window.showToast(err.message || 'Something went wrong', { action: 'OK' });
    } finally {
      submit.disabled = false;
      submit.innerHTML = original;
    }
  });

  container.querySelectorAll('.js-social').forEach((btn) => {
    btn.addEventListener('click', () => socialSignIn(btn.getAttribute('data-provider'), onAuthed));
  });

  const forgot = container.querySelector('#pp-forgot');
  if (forgot) forgot.addEventListener('click', () => this._openForgotPassword(container));
}

/** Mock password reset: email → OTP code → new password (doc §5.1). */
async function _openForgotPassword(container) {
  const { dbGetAll, dbPut } = await import('../db.js');
  const { Otp } = await import('./otp.js');

  const modalRoot = document.createElement('div');
  modalRoot.innerHTML = `
    <div class="pp-modal-overlay" id="forgot-modal">
      <div class="pp-modal">
        <div class="pp-modal-head"><h3>Reset password</h3><button class="pp-modal-close" aria-label="Close">✕</button></div>
        <form id="forgot-form" class="pp-modal-form">
          <span class="pp-form-field"><label for="fp-email">Account email</label><input class="pp-input" id="fp-email" type="email" placeholder="amina@example.com" required></span>
          <div class="pp-otp-demo" id="fp-code-box" hidden><strong>Demo code: <em id="fp-code"></em></strong><small>Mock delivery — shown here instead of being sent.</small></div>
          <span class="pp-form-field" id="fp-code-field" hidden><label for="fp-otp">6-digit code</label><input class="pp-input pp-otp-input" id="fp-otp" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••"></span>
          <span class="pp-form-field" id="fp-new-field" hidden><label for="fp-new">New password</label><input class="pp-input" id="fp-new" type="password" minlength="6" placeholder="At least 6 characters"></span>
          <p class="pp-otp-error" id="fp-error"></p>
          <div class="pp-modal-actions">
            <button type="submit" class="pp-btn pp-btn-solid pp-btn-md" id="fp-submit">${icon('arrow-right', 15)} Send code</button>
            <button type="button" class="pp-btn pp-btn-ghost pp-btn-md pp-modal-dismiss">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modalRoot);

  const close = () => modalRoot.remove();
  modalRoot.querySelectorAll('.pp-modal-close, .pp-modal-dismiss').forEach((b) => b.addEventListener('click', close));
  modalRoot.querySelector('.pp-modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) close();
  });

  const form = modalRoot.querySelector('#forgot-form');
  const submitBtn = modalRoot.querySelector('#fp-submit');
  const errorEl = modalRoot.querySelector('#fp-error');
  const codeBox = modalRoot.querySelector('#fp-code-box');
  const codeEl = modalRoot.querySelector('#fp-code');
  const codeField = modalRoot.querySelector('#fp-code-field');
  const newField = modalRoot.querySelector('#fp-new-field');
  let phase = 'email';
  let targetUser = null;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    if (phase === 'email') {
      const email = modalRoot.querySelector('#fp-email').value.trim().toLowerCase();
      const users = await dbGetAll('users');
      targetUser = users.find((u) => u.email === email);
      if (!targetUser) { errorEl.textContent = 'No account with that email.'; return; }
      const code = Otp.send(targetUser, 'sms');
      phase = 'code';
      codeEl.textContent = code;
      codeBox.hidden = false;
      codeField.hidden = false;
      submitBtn.innerHTML = `${icon('check', 15)} Verify code`;
      modalRoot.querySelector('#fp-otp').focus();
      return;
    }

    if (phase === 'code') {
      const result = Otp.verify(targetUser, modalRoot.querySelector('#fp-otp').value.trim());
      if (!result.ok) { errorEl.textContent = result.error; return; }
      phase = 'reset';
      newField.hidden = false;
      submitBtn.innerHTML = `${icon('check', 15)} Set new password`;
      modalRoot.querySelector('#fp-new').focus();
      return;
    }

    // reset
    const pw = modalRoot.querySelector('#fp-new').value;
    if (pw.length < 6) { errorEl.textContent = 'Use at least 6 characters.'; return; }
    const record = await dbGetAll('users');
    const fresh = record.find((u) => u.id === targetUser.id);
    fresh.password = pw;
    await dbPut('users', fresh);
    close();
    window.showToast('Password updated — sign in with your new password ✓');
  });
}

export function renderLogin(container, onAuthed) {
  renderAuth(container, {
    signup: false,
    onAuthed,
    onSubmit: async (values) => {
      const user = await window.Auth.login(values.email, values.password);
      window.showToast('Welcome back to the pack 🐾');
      return user;
    },
  });
  // Prefill the referral code from an invite link (?ref=CODE)
  try {
    const ref = new URLSearchParams(window.location.search).get('ref');
    const field = container.querySelector('#pp-referral');
    if (ref && field) field.value = ref.toUpperCase();
  } catch (e) { /* ignore */ }
}

export function renderSignup(container, onAuthed) {
  renderAuth(container, {
    signup: true,
    onAuthed,
    onSubmit: async (values) => {
      const user = await window.Auth.register(values);
      window.showToast('Account created — one quick check 🐾');
      return user;
    },
  });
  try {
    const ref = new URLSearchParams(window.location.search).get('ref');
    const field = container.querySelector('#pp-referral');
    if (ref && field) field.value = ref.toUpperCase();
  } catch (e) { /* ignore */ }
}
