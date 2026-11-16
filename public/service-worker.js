// ============================================================================
// PawPrint Service Worker
// Offline-first caching strategy for the PawPrint PWA
// ============================================================================

const CACHE_NAME = 'pawprint-v30';
const STATIC_CACHE = 'pawprint-static-v30';
const IMAGE_CACHE = 'pawprint-images-v30';
const API_CACHE = 'pawprint-api-v30';

// Static assets to cache on install (app shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/app.js',
  '/js/router.js',
  '/js/db.js',
  '/js/auth.js',
  '/js/components/nav.js',
  '/js/components/notification.js',
  '/js/components/feature-tour.js',
  '/js/components/icons.js',
  '/js/components/auth-form.js',
  '/js/components/points.js',
  '/js/components/notify.js',
  '/js/components/sanitize.js',
  '/js/components/otp.js',
  '/js/components/verification.js',
  '/js/components/favourites.js',
  '/js/components/theme.js',
  '/js/components/comments.js',
  '/js/components/report.js',
  '/js/components/media.js',
  '/js/components/follows.js',
  '/js/components/ranking.js',
  '/js/components/audit.js',
  '/js/components/avatar.js',
  '/js/components/share.js',
  '/js/components/payments.js',
  '/js/components/likes.js',
  '/js/pages/home.js',
  '/js/pages/discover.js',
  '/js/pages/arena.js',
  '/js/pages/community.js',
  '/js/pages/profile.js',
  '/js/pages/login.js',
  '/js/pages/register.js',
  '/js/pages/pet-profile.js',
  '/js/pages/business-profile.js',
  '/js/pages/admin.js',
  '/js/pages/rewards.js',
  '/js/pages/dashboard.js',
  '/js/pages/public-profile.js',
  '/js/components/lightbox.js',
  '/js/pages/community-detail.js',
  '/js/pages/challenges.js',
  '/js/pages/settings.js',
  '/js/pages/messages.js',
  '/js/pages/adopt.js',
  '/js/payments-config.js',
  '/images/pawprint-dog-park.jpg',
  '/images/pawprint-cat-profile.jpg',
  '/images/pawprint-vet-clinic.jpg',
  '/images/pawprint-arena-dog.jpg',
  '/icons/pawprint-192.png',
  '/icons/pawprint-512.png',
  '/icons/apple-touch-icon.png',
];

// Image URL patterns to cache
const IMAGE_PATTERNS = [
  /\.(png|jpg|jpeg|svg|gif|webp)$/i,
];

// API patterns that should be cached (read-only GET requests)
const CACHEABLE_API_PATTERNS = [
  /\/api\/businesses/i,
  /\/api\/categories/i,
  /\/api\/competitions/i,
  /\/api\/leaderboard/i,
];

// ---------------------------------------------------------------------------
// Install: cache the app shell
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some static assets failed to cache:', err);
      });
    })
  );
});

// ---------------------------------------------------------------------------
// Activate: clean up old caches and claim clients
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => {
          return name !== STATIC_CACHE && name !== IMAGE_CACHE && name !== API_CACHE;
        }).map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// Fetch: serve cached content with network updates
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Ignore non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // --- HTML: network-first, fallback to cache ---
  if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(new Request(request, { cache: 'reload' })).then((response) => {
        const cloned = response.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, cloned));
        return response;
      }).catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // --- Static assets: network-first with cache fallback (fresh code every load) ---
  if (STATIC_ASSETS.includes(url.pathname) || /\.(css|js)$/i.test(url.pathname)) {
    event.respondWith(
      fetch(new Request(request, { cache: 'reload' })).then((response) => {
        if (response.ok) {
          const cloned = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, cloned));
        }
        return response;
      }).catch(() => caches.match(request).then((cached) => cached || Response.error()))
    );
    return;
  }

  // --- Images: cache-first with network fallback ---
  if (IMAGE_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => cache.put(request, cloned));
          }
          return response;
        }).catch(() => {
          // Return a placeholder SVG for missing images when offline
          return caches.match('/icons/placeholder.svg');
        });
      })
    );
    return;
  }

  // --- Read-only API GETs: network-first, cache fallback ---
  if (CACHEABLE_API_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const cloned = response.clone();
          caches.open(API_CACHE).then((cache) => cache.put(request, cloned));
        }
        return response;
      }).catch(() => caches.match(request).then((cached) => cached || new Response(JSON.stringify({ error: 'offline', cached: false }), { status: 503, headers: { 'Content-Type': 'application/json' } })))
    );
    return;
  }

  // --- Everything else: network-first ---
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ---------------------------------------------------------------------------
// Message: skip waiting when told to update
// ---------------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
