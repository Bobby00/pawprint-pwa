// ============================================================================
// PawPrint — OTP verification (mock SMS / WhatsApp delivery, per doc §5.1)
// Codes are generated locally with a 5-minute expiry and a 5-attempt limit.
// Delivery is simulated: the "message" is shown in a chat-style preview card
// instead of actually being sent.
// ============================================================================

const OTP_PREFIX = 'pawprint_otp_';
const OTP_TTL = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function keyFor(userId) {
  return `${OTP_PREFIX}${userId}`;
}

export const Otp = {
  /** Generate + "send" a code. Returns the code (the mock transport displays it). */
  send(user, channel = 'sms') {
    if (typeof localStorage === 'undefined') return null;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const record = {
      code,
      channel,
      expiresAt: Date.now() + OTP_TTL,
      attempts: 0,
      sentAt: Date.now(),
    };
    localStorage.setItem(keyFor(user.id), JSON.stringify(record));
    return code;
  },

  /** Validate a code. Returns { ok: true } or { ok: false, error }. */
  verify(user, input) {
    let record = null;
    try { record = JSON.parse(localStorage.getItem(keyFor(user.id))); } catch (e) { /* ignore */ }
    if (!record) return { ok: false, error: 'No code was sent yet — tap Resend.' };
    if (Date.now() > record.expiresAt) {
      this.clear(user);
      return { ok: false, error: 'That code expired. Request a new one.' };
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      this.clear(user);
      return { ok: false, error: 'Too many attempts. Request a new code.' };
    }
    if (String(input).trim() !== record.code) {
      record.attempts += 1;
      try { localStorage.setItem(keyFor(user.id), JSON.stringify(record)); } catch (e) { /* ignore */ }
      const left = MAX_ATTEMPTS - record.attempts;
      return { ok: false, error: left > 0 ? `Wrong code — ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many attempts. Request a new code.' };
    }
    this.clear(user);
    return { ok: true };
  },

  /** Mark the account as verified in the database and refresh the session. */
  async markVerified(user) {
    const { dbGet, dbPut } = await import('../db.js');
    const record = await dbGet('users', user.id);
    if (record) {
      record.verified = true;
      await dbPut('users', record);
      const { password: _pw, ...safe } = record;
      const Auth = (await import('../auth.js')).Auth;
      Auth.user = safe;
      return safe;
    }
    return user;
  },

  clear(user) {
    try { localStorage.removeItem(keyFor(user.id)); } catch (e) { /* ignore */ }
  },
};
