// ============================================================================
// PawPrint — OTP verification screen (mock SMS / WhatsApp delivery)
// Shown after signup or first login until the account is verified.
// On success the account is marked verified and onboarding continues.
// ============================================================================

import { icon, brandMarkSolid } from './icons.js';
import { Otp } from './otp.js';

export function renderVerification(container, user, onVerified) {
  let channel = 'sms';
  const code = Otp.send(user, channel);
  let expiry = Date.now() + 5 * 60 * 1000;

  container.innerHTML = `
    <div class="pp-auth-layout">
      <section class="pp-auth-left">
        <a href="/" class="pp-brand pp-auth-brand" data-route="/">
          <span class="pp-brand-mark">${brandMarkSolid(24)}</span>
          <span>pawprint<span class="pp-brand-period">.</span></span>
        </a>
        <span class="pp-auth-index">A HAPPIER WAY TO BE A PET PARENT</span>
        <div class="pp-auth-story">
          <span class="pp-auth-sticker">${icon('shield-check', 16)} KEEP YOUR ACCOUNT SAFE</span>
          <h1>One quick<br />check, then<br /><span>you're in.</span></h1>
          <p>We send a 6-digit code to confirm it's really you. In this demo the message is previewed right here instead of being delivered.</p>
          <div class="pp-mock-phone">
            <div class="pp-mock-phone-head">
              <span class="pp-mock-app">${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}</span>
              <span>PawPrint · now</span>
            </div>
            <div class="pp-mock-bubble">
              <strong>PawPrint</strong>
              <p>Your PawPrint verification code is <em id="mock-code">${code}</em>. Valid for 5 minutes. Karibu!</p>
            </div>
            <div class="pp-mock-foot">Demo delivery — no real SMS/WhatsApp is sent.</div>
          </div>
        </div>
        <span class="pp-auth-left-foot">PAWPRINT · NAIROBI, KENYA</span>
      </section>

      <section class="pp-auth-right">
        <div class="pp-auth-form-wrap">
          <div class="pp-auth-heading">
            <span class="pp-eyebrow"><span></span> ALMOST THERE</span>
            <h2>Verify your account.</h2>
            <p>We sent a 6-digit code to <strong>${user.email || user.phone || 'your contact'}</strong>.</p>
          </div>

          <div class="pp-otp-channels" role="radiogroup" aria-label="Delivery channel">
            <button type="button" class="pp-otp-channel is-active" data-channel="sms">SMS</button>
            <button type="button" class="pp-otp-channel" data-channel="whatsapp">WhatsApp</button>
          </div>

          <form id="otp-form" class="pp-otp-form">
            <span class="pp-form-field">
              <label for="otp-input">Enter the 6-digit code</label>
              <input class="pp-input pp-otp-input" id="otp-input" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••" required>
            </span>
            <button type="submit" class="pp-btn pp-btn-solid pp-auth-submit">${icon('shield-check', 15)} Verify &amp; continue</button>
            <button type="button" class="pp-btn pp-btn-ghost pp-btn-md" id="otp-resend" disabled>Resend code in <span id="otp-count">30</span>s</button>
            <p class="pp-otp-error" id="otp-error"></p>
          </form>

          <div class="pp-otp-demo">
            <strong>Demo code: <em>${code}</em></strong>
            <small>Anything sent here stays on your device — no real message goes out.</small>
          </div>
          <a href="/" class="pp-auth-back" data-route="/">Back to Nairobi feed</a>
        </div>
      </section>
    </div>
    <button class="pp-theme-float js-theme-toggle" aria-label="Toggle dark mode"></button>
  `;

  const mockLabel = container.querySelector('.pp-mock-app');
  const mockCode = container.querySelector('#mock-code');
  const input = container.querySelector('#otp-input');
  const form = container.querySelector('#otp-form');
  const errorEl = container.querySelector('#otp-error');
  const resendBtn = container.querySelector('#otp-resend');
  const countEl = container.querySelector('#otp-count');

  // Resend cooldown (30s)
  let seconds = 30;
  resendBtn.disabled = true;
  const timer = setInterval(() => {
    seconds -= 1;
    if (seconds <= 0) {
      clearInterval(timer);
      resendBtn.disabled = false;
      resendBtn.textContent = 'Resend code';
    } else if (countEl.parentNode) {
      countEl.textContent = String(seconds);
    }
  }, 1000);

  container.querySelectorAll('.pp-otp-channel').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.pp-otp-channel').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      channel = btn.getAttribute('data-channel');
      const newCode = Otp.send(user, channel);
      expiry = Date.now() + 5 * 60 * 1000;
      mockCode.textContent = newCode;
      mockLabel.textContent = channel === 'whatsapp' ? 'WhatsApp' : 'SMS';
      input.value = '';
      errorEl.textContent = '';
      input.focus();
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (value.length !== 6) { errorEl.textContent = 'Enter all 6 digits.'; return; }

    const result = Otp.verify(user, value);
    if (!result.ok) {
      errorEl.textContent = result.error;
      input.value = '';
      input.focus();
      return;
    }

    clearInterval(timer);
    await Otp.markVerified(user);
    window.showToast('Account verified ✓');
    onVerified();
  });

  input.focus();
}
