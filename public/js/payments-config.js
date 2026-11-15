// ============================================================================
// PawPrint — Payment configuration
// Sandbox (test) mode by default. Swap in live keys when going to production.
//
// GET YOUR KEYS:
// 1. Sign up at https://dashboard.paystack.com
// 2. Go to Settings → API Keys & Webhooks
// 3. Copy the test public key (pk_test_*) for sandbox testing
// 4. Paste it below, replacing SANDBOX_PUBLIC_KEY
// 5. For production, set LIVE_PUBLIC_KEY and flip USE_SANDBOX to false
//
// NOTE: Test public keys only charge real money in test mode. Never commit
// a live SECRET key (sk_live_*) to client-side code — this is a browser app.
// ============================================================================

// Set true to use test keys; false for production
export const USE_SANDBOX = true;

// Test mode (safe to commit — charges nothing real)
// Paystack provides public test keys; paste yours here
export const SANDBOX_PUBLIC_KEY = 'pk_test_replace_with_your_paystack_sandbox_public_key';

// Production (paste only when you're ready to go live)
export const LIVE_PUBLIC_KEY = 'pk_live_paste_only_when_going_to_production';

export const PAYSTACK_PUBLIC_KEY = USE_SANDBOX ? SANDBOX_PUBLIC_KEY : LIVE_PUBLIC_KEY;

// Subscription plans (KES per month)
export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Basic business listing with your details and contact info.',
    features: ['Business listing', 'Contact details & hours', 'Basic reviews'],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 1000,
    description: 'Enhanced visibility — more reviews surfaced, booking requests and rank boosts.',
    features: ['Everything in Free', 'Booking enquiries dashboard', 'Review responses', 'Quarterly ranking report'],
    highlight: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 5000,
    description: 'Everything in Standard plus priority support, analytics and featured placement.',
    features: ['Everything in Standard', 'Priority customer support', 'Analytics dashboard', 'Featured placement rotation'],
  },
];

// Competition entry fees in KES (real-money alternative to PawPoints)
export const COMPETITION_MONEY_FEES = {
  1: 0,   // Cutest Pet — free
  2: 50,  // Dog of the Week — KES 50 entry
  3: 100, // Pet of the Month — KES 100 entry
};
