// ============================================================================
// PawPrint — Authentication module
// ============================================================================

const AUTH_KEY = 'pawprint_auth';

/** Unique, human-friendly referral code, e.g. "AMINA-7K2F". */
async function generateReferralCode(name) {
  const { dbGetAll } = await import('./db.js');
  const users = await dbGetAll('users');
  const base = (name || 'paw').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5) || 'PAW';
  for (let attempt = 0; attempt < 20; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `${base}-${suffix}`;
    if (!users.some((u) => u.referralCode === code)) return code;
  }
  return `${base}-${Date.now().toString(36).toUpperCase()}`;
}

export const Auth = {
  // Current logged-in user
  get user() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
  set user(value) {
    if (value) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(value));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  },

  async login(emailOrPhone, password) {
    const users = await (await import('./db.js')).dbGetAll('users');
    const user = users.find(
      (u) => (u.email === emailOrPhone || u.phone === emailOrPhone) && u.password === password
    );
    if (!user) throw new Error('Invalid email/phone or password.');
    if (user.suspended) throw new Error('This account has been suspended. Contact support.');
    const { password: _, ...userWithoutPassword } = user;
    this.user = userWithoutPassword;
    return userWithoutPassword;
  },

  async register({ name, email, phone, password, role = 'pet_owner', location, referralCode }) {
    const users = await (await import('./db.js')).dbGetAll('users');
    if (users.find((u) => u.email === email)) throw new Error('Email already registered.');
    if (phone && users.find((u) => u.phone === phone)) throw new Error('Phone already registered.');

    // Resolve referral code (doc §5.22: refer a new activated pet owner → +100)
    let referredBy = null;
    const code = (referralCode || '').trim().toUpperCase();
    if (code) {
      const referrer = users.find((u) => u.referralCode === code);
      if (!referrer) throw new Error('That referral code doesn\'t look right. Check and try again.');
      referredBy = referrer.id;
    }

    const now = new Date().toISOString();
    const newUser = {
      name,
      email,
      phone: phone || null,
      password,
      role,
      location: location || null,
      avatar: null,
      referralCode: await generateReferralCode(name),
      referredBy,
      createdAt: now,
    };
    const id = await (await import('./db.js')).dbPut('users', newUser);
    newUser.id = id;
    const { password: _p, ...userWithoutPassword } = newUser;
    this.user = userWithoutPassword;
    return userWithoutPassword;
  },

  logout() {
    this.user = null;
  },

  /**
   * Mock social sign-in (Google / Apple): reuses the demo identity or creates
   * a verified one instantly. Real OAuth replaces this later.
   */
  async socialLogin(provider) {
    const { dbGetAll, dbPut } = await import('./db.js');
    const users = await dbGetAll('users');
    const email = `${provider}.user@pawprint.demo`;
    const existing = users.find((u) => u.email === email);

    if (existing) {
      if (existing.suspended) throw new Error('This account has been suspended.');
      const { password: _pw, ...safe } = existing;
      this.user = safe;
      return safe;
    }

    const label = provider === 'google' ? 'Google' : 'Apple';
    const now = new Date().toISOString();
    const created = {
      name: `${label} Demo User`,
      email,
      phone: null,
      password: null,
      role: 'pet_owner',
      location: 'Nairobi, Kenya',
      avatar: null,
      verified: true,
      provider,
      referralCode: await generateReferralCode(`${label} Demo`),
      createdAt: now,
    };
    const id = await dbPut('users', created);
    created.id = id;
    const { password: _pw, ...safe } = created;
    this.user = safe;
    return safe;
  },

  /** Every account has a referral code; generate + persist one if missing. */
  async ensureReferralCode() {
    const current = this.user;
    if (!current) return null;
    if (current.referralCode) return current.referralCode;
    const code = await generateReferralCode(current.name);
    const { dbGet, dbPut } = await import('./db.js');
    const record = await dbGet('users', current.id);
    if (record) {
      record.referralCode = code;
      await dbPut('users', record);
      const { password: _pw, ...safe } = record;
      this.user = safe;
    }
    return code;
  },

  isAuthenticated() {
    return !!this.user;
  },

  hasRole(role) {
    return this.user && this.user.role === role;
  },

  hasAnyRole(roles) {
    return this.user && roles.includes(this.user.role);
  },
};
