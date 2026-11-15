// ============================================================================
// PawPrint — Discover screen (business directory with search + categories)
// ============================================================================

import { icon } from '../components/icons.js';
import { Favourites } from '../components/favourites.js';
import { escapeHtml } from '../components/sanitize.js';

const NAIROBI_CENTRE = { lat: -1.2921, lng: 36.8219 };

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const DiscoverPage = {
  pageTitle: 'Discover',

  async render(container) {
    const user = window.Auth.user;
    const { dbGetAll } = await import('../db.js');
    const businesses = await dbGetAll('businesses');
    const images = ['/images/pawprint-dog-park.jpg', '/images/pawprint-cat-profile.jpg', '/images/pawprint-vet-clinic.jpg', '/images/pawprint-arena-dog.jpg'];
    const items = businesses.map((b, i) => ({ ...b, image: images[i % images.length] }));
    const savedIds = await Favourites.list(user.id);

    const categories = ['All', ...new Set(items.map((b) => b.category))];
    let query = '';
    let category = 'All';
    let sortBy = 'recommended';

    container.innerHTML = `
      <div class="pp-standard-page">
        <div class="pp-page-heading"><div><div class="pp-eyebrow"><span></span>YOUR NEIGHBOURHOOD, WITH MORE TAIL WAGS</div><h1>Good things are <span>close.</span></h1></div></div>
        <div class="pp-discover-search">
          <span class="pp-discover-search-icon">${icon('search', 19)}</span>
          <input id="discover-query" type="text" placeholder="Try vets, grooming, Karura Forest..." aria-label="Search Nairobi pet businesses and places">
          <button class="pp-btn pp-btn-outline pp-btn-icon" aria-label="Search filters">${icon('settings', 18)}</button>
        </div>
        <div class="pp-category-list" aria-label="Filter by category" id="discover-categories"></div>
        <div class="pp-discover-intro">
          <span>${icon('map-pin', 15)} NAIROBI, KENYA ${icon('chevron-right', 13)} NEAR YOU</span>
          <span class="pp-discover-intro-actions">
            <button class="pp-btn pp-btn-ghost pp-btn-sm" id="discover-sort">${icon('compass', 13)} <span id="discover-sort-label">Sort: nearest to me</span></button>
            <button class="pp-btn pp-btn-ghost pp-btn-sm" id="discover-view" aria-pressed="false">${icon('map-pin', 13)} <span id="discover-view-label">Map view</span></button>
          </span>
        </div>
        <div class="pp-discover-grid" id="discover-grid"></div>
        <div id="discover-map-slot" hidden></div>
        <a href="/register-business" class="pp-business-cta" data-route="/register-business">
          <span class="pp-business-cta-mark">${icon('sparkles', 20)}</span>
          <span><strong>Love your local pet business?</strong><small>List it on PawPrint — verified, visible and booked.</small></span>
          ${icon('arrow-right', 18)}
        </a>
      </div>
    `;

    const grid = container.querySelector('#discover-grid');
    const catList = container.querySelector('#discover-categories');
    const queryInput = container.querySelector('#discover-query');
    const mapSlot = container.querySelector('#discover-map-slot');

    const renderCats = () => {
      catList.innerHTML = categories.map((label) => `
        <button class="pp-btn pp-btn-sm pp-category-button${category === label ? ' is-selected' : ''}" data-cat="${label}">${label}</button>
      `).join('');
      catList.querySelectorAll('.pp-category-button').forEach((btn) => {
        btn.addEventListener('click', () => {
          category = btn.getAttribute('data-cat');
          renderCats();
          renderGrid();
        });
      });
    };

    const project = (lat, lng) => {
      // Simple linear projection over the Nairobi view box
      const minLat = -1.34, maxLat = -1.18, minLng = 36.68, maxLng = 36.92;
      return {
        x: Math.round(((lng - minLng) / (maxLng - minLng)) * 400 + 10),
        y: Math.round(((maxLat - lat) / (maxLat - minLat)) * 260 + 20),
      };
    };

    const renderMap = () => {
      const matches = items.filter((b) =>
        (category === 'All' || b.category === category) &&
        `${b.name} ${b.address} ${b.category} ${b.description || ''}`.toLowerCase().includes(query.toLowerCase())
      );
      const neighborhoods = [
        { name: 'KAREN', x: 88, y: 225, w: 105, h: 46 },
        { name: 'KIBERA', x: 158, y: 158, w: 55, h: 34 },
        { name: 'ST MARY POLIC', x: 205, y: 130, w: 70, h: 30 },
        { name: 'WESTLANDS', x: 205, y: 95, w: 78, h: 28 },
        { name: 'KILIMANI', x: 262, y: 128, w: 60, h: 26 },
        { name: 'CBD', x: 288, y: 155, w: 48, h: 28 },
        { name: 'EASTLEIGH', x: 342, y: 120, w: 60, h: 26 },
      ];
      const dots = matches.map((b) => {
        const { x, y } = project(b.lat || NAIROBI_CENTRE.lat, b.lng || NAIROBI_CENTRE.lng);
        return `
          <a href="/business/${b.id}" class="pp-map-dot" style="left:${x}px; top:${y}px" data-route="/business/${b.id}" aria-label="${escapeHtml(b.name)}">
            <span class="pp-map-dot-core">${icon('paw-print', 11, { strokeWidth: 2.6 })}</span>
            <span class="pp-map-dot-label">${escapeHtml(b.name)}</span>
          </a>`;
      }).join('');

      mapSlot.innerHTML = `
        <div class="pp-discover-map-card">
          <div class="pp-map-canvas" role="img" aria-label="Map of Nairobi pet businesses">
            <svg viewBox="0 0 420 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              <rect x="0" y="0" width="420" height="300" rx="10" fill="var(--pp-soft)"></rect>
              <polygon points="128,64 154,78 140,108 108,140 40,210 24,176 52,116" fill="color-mix(in oklch, var(--pp-green) 22%, var(--pp-soft))"></polygon>
              <polygon points="300,4 268,60 274,138 340,150 392,112 416,40" fill="color-mix(in oklch, var(--pp-green) 22%, var(--pp-soft))"></polygon>
              <line x1="0" y1="150" x2="420" y2="150" stroke="var(--pp-line)" stroke-width="6" stroke-linecap="round"></line>
              <line x1="210" y1="0" x2="300" y2="300" stroke="var(--pp-line)" stroke-width="3.5" stroke-linecap="round"></line>
              ${neighborhoods.map((n) => `<text x="${n.x}" y="${n.y}" class="pp-map-neighborhood" font-size="8" letter-spacing="1">${n.name}</text>`).join('')}
              <text x="70" y="92" class="pp-map-forest" font-size="8" letter-spacing="1.5">KARURA FOREST</text>
              <text x="330" y="54" class="pp-map-forest" font-size="8" letter-spacing="1.5">KARURA FOREST</text>
            </svg>
            ${dots}
          </div>
          <p class="pp-demo-note">${icon('map-pin', 11)} ${matches.length} business${matches.length === 1 ? '' : 'es'} on the map — tap a paw to open the listing.</p>
        </div>
      `;
    };

    const renderGrid = () => {
      const q = query.toLowerCase();
      const filtered = items.filter((b) =>
        (category === 'All' || b.category === category) &&
        `${b.name} ${b.address} ${b.category} ${b.description || ''}`.toLowerCase().includes(q)
      );
      const list = [...filtered];
      list.sort((a, b) => sortBy === 'distance'
        ? haversineKm(NAIROBI_CENTRE, { lat: a.lat || NAIROBI_CENTRE.lat, lng: a.lng || NAIROBI_CENTRE.lng }) - haversineKm(NAIROBI_CENTRE, { lat: b.lat || NAIROBI_CENTRE.lat, lng: b.lng || NAIROBI_CENTRE.lng })
        : (b.rating || 0) - (a.rating || 0));
      if (!list.length) {
        grid.innerHTML = '<p class="pp-empty-state">Nothing here yet. Try a different search or category.</p>';
        return;
      }
      grid.innerHTML = list.map((b) => `
        <a href="/business/${b.id}" class="pp-discovery-card" data-route="/business/${b.id}">
          <span class="pp-discovery-image">
            <img src="${b.image}" alt="${b.name}" loading="lazy" />
            <span class="pp-discovery-category">${b.category}</span>
            <button class="pp-save-button ${savedIds.includes(b.id) ? 'is-saved' : ''}" aria-label="Save ${b.name}">${icon('heart', 17)}</button>
          </span>
          <span class="pp-discovery-details">
            <span><strong>${b.name}</strong><span>${icon('map-pin', 13)} ${b.address.split(',')[0]} · ${haversineKm(NAIROBI_CENTRE, { lat: b.lat || NAIROBI_CENTRE.lat, lng: b.lng || NAIROBI_CENTRE.lng }).toFixed(1)} km · ${b.services[0] || b.category}</span></span>
            <span class="pp-rating">${icon('star', 13, { fill: 'currentColor' })} ${b.rating}</span>
          </span>
          <span class="pp-discovery-link">Explore listing ${icon('arrow-right', 14)}</span>
        </a>
      `).join('');
      grid.querySelectorAll('.pp-save-button').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const id = Number(btn.closest('.pp-discovery-card').getAttribute('href').split('/').pop());
          const nowSaved = await Favourites.toggle(user.id, id);
          btn.classList.toggle('is-saved', nowSaved);
          window.showToast(nowSaved ? 'Saved to favourites 💛' : 'Removed from favourites');
        });
      });
    };

    const sortBtn = container.querySelector('#discover-sort');
    const sortLabel = container.querySelector('#discover-sort-label');
    if (sortBtn && sortLabel) {
      sortBtn.addEventListener('click', () => {
        sortBy = sortBy === 'recommended' ? 'distance' : 'recommended';
        sortLabel.textContent = sortBy === 'distance' ? 'Sort: top rated' : 'Sort: nearest to me';
        renderGrid();
      });
    }

    // List ⇄ map view (inline SVG — fully offline)
    const viewBtn = container.querySelector('#discover-view');
    const viewLabel = container.querySelector('#discover-view-label');
    if (viewBtn) {
      viewBtn.addEventListener('click', () => {
        const showingMap = !mapSlot.hidden;
        mapSlot.hidden = showingMap;
        grid.hidden = !showingMap;
        viewBtn.setAttribute('aria-pressed', String(!showingMap));
        viewLabel.textContent = showingMap ? 'Map view' : 'List view';
        if (!showingMap) renderMap();
      });
    }

    queryInput.addEventListener('input', () => { query = queryInput.value; renderGrid(); });
    renderCats();
    renderGrid();
  },
};
