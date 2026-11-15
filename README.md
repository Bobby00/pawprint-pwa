# PawPrint 🐾

> **The world around your pet.**
> Mobile-first PWA for pet owners and pet businesses in Nairobi, Kenya — discovery, community, competition and commerce in one place.

![PWA](https://img.shields.io/badge/PWA-installable-0f0)
![Stack](https://img.shields.io/badge/Stack-Vanilla%20JS%20%2B%20IndexedDB-orange)
![Payments](https://img.shields.io/badge/Payments-Paystack%20%28M--Pesa%20%2B%20Cards%29-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## About the project

PawPrint is a **progressive web app** built as a mobile-first social discovery and commerce platform for the Nairobi pet ecosystem. It combines four product surfaces into one offline-capable experience:

| Surface | What it does |
|---|---|
| **Home** | Personalised feed — events, community posts, arena highlights, PawPoints balance |
| **Discover** | Business directory — search, categories, distance sort, map view, reviews, favourites, booking |
| **Arena** | Pet competitions with voting, leaderboards, share, entry fees (PawPoints or cash) |
| **Community** | Packs (shared activity groups), posts with likes/photos/comments, follow other users |

Plus a **business dashboard**, an **admin operations console**, a **rewards store**, **adoption & foster flow**, and a **PawPoints loyalty engine** with a full ledger.

Everything works offline (service-worker precache + IndexedDB persistence) because connectivity in Nairobi is never guaranteed.

### Why it exists

Nairobi's pet economy is fragmented — owners rely on Instagram DMs and word of mouth to find vets, groomers and trainers. PawPrint gives them a single place to:

- Discover verified pet businesses with reviews and rankings
- Show off their pets in competitions and earn rewards
- Find adopted pets, lost-and-found alerts and community events

…and gives **businesses** a cheap, measurable channel to acquire and retain customers.

---

## Current features (what's built)

### Core
- ✅ Mobile-first PWA — installable, offline, bottom-nav, responsive
- ✅ Mocked verification flow — email/phone OTP with SMS/WhatsApp channel picker, attempt limits, 30s resend cooldown; post-verification redirects to onboarding slides
- ✅ Auth — email sign-in + Google/Apple mock social sign-in; role-gated routes (pet_owner / business_owner / admin)
- ✅ Notifications system — in-app bell + unread badge, role-targeted broadcasts, deep-links, notification preferences (mute competition/community/business/reward categories)
- ✅ Dark / light theme — full `oklch` token system with warm-brand dark palette, no flash on load, persisted, system-preference aware

### Community
- ✅ Posts with media upload (photos & video), like button (persisted), inline comments with owner notification
- ✅ Edit / delete / **share** posts; pinned posts in pack detail pages
- ✅ Like/bookmark (saved) state — full persistence across refreshes
- ✅ Local packs — create, join/leave, pinned spotlight, follow authors
- ✅ Follow system — user follows boost your feed; business follow with live follower count
- ✅ Direct messages — two-pane inbox, unread badge, thread view (doc §5.9)

### Discovery & Commerce
- ✅ Business directory — search, category filter, distance sort, **map view** (inline SVG, fully offline)
- ✅ Business profile — gallery, hours, phone/email tap-to-contact, social chips, awards, rankings
- ✅ Reviews with photo attachments — real verified-visit badge (tied to completed bookings), owner replies
- ✅ Booking requests — confirm / decline / complete lifecycle, notifications to user, +50 PawPoints on completion
- ✅ Save/unsave businesses (favourites) — persisted IndexedDB
- ✅ Business dashboard — bookings inbox, review replies, listing editor, analytics (profile views / contact clicks / enquiries), plan upgrade flow

### Competitions (The Arena)
- ✅ Entry modal — pick your pet, description, photo attach, character limit
- ✅ Free or PawPoints-paid entries; **real-money entry option** alongside PawPoints
- ✅ Real `photos[]` persisted on entries — shown on finalists grid
- ✅ Voting with per-user de-duplication, approved entries only (admin moderation)
- ✅ Leaderboard with pet names, vote counts, share button
- ✅ Business Showdown — time-limited 1v1 with public voting and live bar chart

### Challenges
- ✅ 30-Day Walking (self-report), Teach Your Dog Tricks (evidence), Explore Places (self-report)
- ✅ Progress tracking with bars, self-reported or admin-verified (+100 PawPoints on verification)
- ✅ Participant leaderboards

### Adoption & Rescue
- ✅ Animal listing directory with filters
- ✅ Application submission with adoption queue, admin review and approval; marks animal adopted, notifies applicant
- ✅ Verified-rescue-org profile modal (bio, badge, stats, photos)
- ✅ RSVP/visit-then-apply UX flow

### Rewards & PawPoints
- ✅ Full ledger with 12-month expiry on new awards
- ✅ Rewards catalogue (5 seeded rewards) with redeem modal, voucher code generation, owner-side handoff (partner confirms)
- ✅ PawPoints balance visible in topbar pill, ledger on profile with Show all / Show less toggle
- ✅ "Expiring soon" banners for near-expiry points
- ✅ Reward reversal tool (admin)

### Admin console
- ✅ 12 tabs: Overview, Competitions, Entries, Businesses, Content, Reports, Challenges, Adoption, Applications, Communities, Users, Events & posts
- ✅ Business applications (apply → admin approve → listing created, role upgraded)
- ✅ Entry moderation (pending/approve/reject)
- ✅ Adoption application pipeline
- ✅ User management — search filter, suspend/restore
- ✅ Reward reversal + audit log viewer
- ✅ Business verification / unverify

### Payments (Paystack, sandbox-ready)
- ✅ Three payment methods — **M-Pesa STK push**, **card** (Visa/MC/Amex), **bank transfer** (with reference)
- ✅ Plans page for business subscriptions (Free / Standard KES 1,000 / Premium KES 5,000)
- ✅ Competition entry with real-money option (in addition to PawPoints)
- ✅ `payments` IndexedDB store — full transaction ledger
- ✅ Sandbox-vs-live toggle — paste `pk_test_*` or `pk_live_*` in `public/js/payments-config.js`
- ✅ Test-mode simulate button (so the demo completes without keys)

### Technical
- ✅ Vanilla JS SPA — no framework, no build step, no npm dependencies
- ✅ IndexedDB offline-first — 18 stores, versioned (`DB_VERSION = 10`)
- ✅ Service worker (precache + runtime cache + network-first) — `pawprint-v27`
- ✅ Installable PWA — manifest, icons, offline fallback, theme-color switching with dark mode
- ✅ Seed-once demo data — 4 demo users (pet owner, business owner, admin, Google demo), 3 businesses, 2 active competitions, 3 challenges, etc.
- ✅ Modular routing with standalone public-route handling

---

## Versions

| Component | Version |
|---|---|
| `pawprint-pwa` | **1.0.0** |
| IndexedDB schema | `DB_VERSION = 10` |
| Service worker cache | `pawprint-v27` |
| Paystack integration | sandbox-ready (`USE_SANDBOX = true`) |
| Node | ≥ 18 (no dependencies) |
| Browser support | Chrome/Edge/Safari (evergreen) |

### Release history (condensed)

| Tag | What landed |
|---|---|
| v1.0.0-mvp | Core SPA, auth, feed, arena, profile, businesses, challenges |
| v1.0.0 | + OTP verification, dark mode, follows, comments, communities, reports, challenges, rewards, adoption, entries |
| v1.1.0 | + payments (Paystack), subscription upgrade flow, competition photo uploads, review photos, verified-visit badges |

---

## Running it

```bash
# Prerequisites
node --version   # need ≥ 18

# Start the dev server
npm start
# or
node server.js

# Open http://localhost:8080 in your browser
```

Then sign in with any demo account:

| Email | Password | Role |
|---|---|---|
| `amina@example.com` | `password123` | Pet owner |
| `james@pawclinic.co.ke` | `password123` | Business owner |
| `admin@pawprint.co.ke` | `password123` | Admin |

### Enabling real payments (Paystack)

```js
// public/js/payments-config.js
export const USE_SANDBOX = false;       // flip to false for production
export const SANDBOX_PUBLIC_KEY = 'pk_test_…';  // test mode
export const LIVE_PUBLIC_KEY    = 'pk_live_…';  // live mode
```

Get keys at [dashboard.paystack.com](https://dashboard.paystack.com) → Settings → API Keys & Webhooks. The sandbox payment dialog includes a **"Simulate successful test payment"** button so you can test the full flow without keys.

---

## What's pending

### Blocked on decisions

- **Real Paystack webhook** — flip `pending_clearance` → `success` automatically for bank transfers. Needs a small backend endpoint + deployment target.
- **Email receipts** — plug into the same webhook; outbound email (SendGrid/Mailgun/Resend).
- **M-Pesa paybill or till** — to collect subscription renewals; Paystack STK push works for one-offs today. For recurring, choose between Paystack Recurring API or manual monthly invoice cycle.
- **Competition entry fee model finalisation** — PawPoints entry vs cash entry both work today; you need to decide the "competition entry fee" UX you want to ship.

### Nice next chunks

- **Competition lifecycle admin workflow** — Draft → Scheduled → Entry → Voting → Completed → Archived as an explicit state machine (we have status but not the full pipeline).
- **Tie-breaking** for competition results (votes then submission time).
- **Business owner KPI dashboard** — weekly trend charts (profile views, contact clicks) rather than all-time totals.
- **Business subscription renewals** — webhook-driven monthly charge or dunning.
- **Adoption organisation dashboard** — org-side view with application pipeline and fulfilment workflow.
- **Multi-role accounts** — "Amina" is both pet owner *and* business owner; UI doesn't expose dual-role navigation yet.
- **Data model audit** — several entities are shaped for demo; production needs real schema review (e.g. PostGIS for locations).

### Known quirks

- **IndexedDB-only data layer** — every user has their own browser-local copy. Two users on different phones do not see the same posts, entries or businesses. A real backend (Postgres + Node/Express) is needed for a true multi-user product.
- **OTP is a mock** — codes generated client-side and shown on screen for demo. Swap in an API key from a real SMS/WhatsApp provider for production.
- **Photos stored as data URLs in IndexedDB** — works offline but inflates the DB. Production should store binary in object storage and URLs in Postgres.
- **Payments sandbox banner** — shows until `pk_test_*` is replaced with a real key.

---

## Project structure

```
.
├─ server.js                     # Node static server (manifest + SW cache headers)
├─ package.json                  # Zero runtime dependencies
├─ public/
│  ├─ index.html                 # SPA shell (manifest, icons, theme pre-applied)
│  ├─ manifest.json              # PWA manifest (offline-capable)
│  ├─ service-worker.js          # Precaching + runtime caching
│  ├─ css/style.css              # Design system — `pp-*` classes, oklch tokens
│  ├─ js/
│  │  ├─ app.js                  # Entry point, route registration, seed + init
│  │  ├─ db.js                   # IndexedDB layer (v10) + demo data
│  │  ├─ router.js               # Tiny SPA router (hash-free)
│  │  ├─ auth.js                 # Session + role management
│  │  ├─ payments-config.js      # Paystack keys + subscription plans + entry fees
│  │  ├─ components/             # Reusable UI engines
│  │  │  ├─ payments.js          # Paystack inline checkout (3 tabs)
│  │  │  ├─ points.js            # PawPoints ledger + showPointsAnimation
│  │  │  ├─ notify.js            # Unified notifications
│  │  │  ├─ comments.js, likes.js, follows.js, share.js
│  │  │  ├─ verification.js      # OTP screens (SMS / WhatsApp)
│  │  │  ├─ ranking.js           # Business reputation score
│  │  │  └─ …
│  │  └─ pages/                  # 20 screens (home, discover, arena, profile…)
│  └─ images/                    # Demo photography (4 images)
└─ README.md
```

---

## Architecture notes

**Vanilla, no-framework, no-build-step.** That's intentional for this MVP — it keeps the install surface tiny (1.3 MB including images) and the learning curve shallow. When you need TypeScript or a framework, the component structure is already modular (each `components/*.js` is a self-contained module with named exports).

**Offline-first.** The data layer (IndexedDB) and the network layer (service worker) are both cache/read-friendly. Connectivity drops degrade gracefully: cached pages stay readable, new writes queue in IndexedDB with `pending_sync` markers (full sync engine is a v1.x task).

**Audit first.** Every significant action (reward reversal, business approval, moderation) writes to the `auditLogs` store with actor/action/target/timestamp — ready to surface in an admin view.

---

## License

MIT — see `LICENSE` (forthcoming) or treat the source as open until you set one explicitly.

---

## Credits

Design language adapted from the approved PawPrint design system (`pp-*` class family, `oklch` warm-toned palette, Outfit + Figtree typefaces).
