// ============================================================================
// PawPrint — Feature Tour Slides (onboarding, shown once after auth)
// ============================================================================

import { icon } from './icons.js';

const TOUR_KEY = 'pawprint_tour_completed';

export const FeatureTour = {
  isCompleted() {
    try { return localStorage.getItem(TOUR_KEY) === 'true'; } catch (e) { return false; }
  },

  markCompleted() {
    try { localStorage.setItem(TOUR_KEY, 'true'); } catch (e) { /* ignore */ }
  },

  slides: [
    { title: 'Discover pet businesses', body: 'Find veterinary clinics, grooming salons, pet shops and pet-friendly places near you in Nairobi — search, filter by category, and save your favourites.', icon: 'compass' },
    { title: 'Create pet profiles', body: 'Build a digital identity for each of your pets — breed, personality, achievements and more. Your first pet profile earns you 50 PawPoints.', icon: 'paw-print' },
    { title: 'Enter the Arena', body: 'Enter your pets into competitions — some are free, some cost a few PawPoints. Vote for your favourites and follow the leaderboard as Nairobi votes.', icon: 'trophy' },
    { title: 'Connect with the community', body: 'Share moments, meet local packs in your neighbourhood, and follow the pets and people you love.', icon: 'users' },
    { title: 'What are PawPoints?', body: 'PawPoints are PawPrint\'s reward currency. Earn them for pet profiles (+50), reviews (+30), challenges (+100) and referring friends (+100). Spend them on competition entries, discounts and rewards from local businesses.', icon: 'sparkles' },
    { title: 'You\'re all set', body: 'That\'s the tour! Check your profile for your referral code, and tap the bell anytime to see votes, rewards and competition updates.', icon: 'check' },
  ],

  render(container, onComplete) {
    let current = 0;

    container.innerHTML = `
      <div class="tour-overlay">
        <div class="tour-container">
          <button class="tour-skip" id="tour-skip">Skip tour</button>
          <div class="tour-slide">
            <div class="tour-icon" id="tour-icon"></div>
            <h2 class="tour-title" id="tour-title"></h2>
            <p class="tour-body" id="tour-body"></p>
            <div class="tour-progress" id="tour-dots"></div>
          </div>
          <div class="tour-controls">
            <button class="pp-btn pp-btn-ghost pp-btn-md" id="tour-prev">Previous</button>
            <button class="pp-btn pp-btn-solid pp-btn-md" id="tour-next">Next</button>
          </div>
        </div>
      </div>
    `;

    const iconEl = container.querySelector('#tour-icon');
    const titleEl = container.querySelector('#tour-title');
    const bodyEl = container.querySelector('#tour-body');
    const dotsEl = container.querySelector('#tour-dots');
    const prevBtn = container.querySelector('#tour-prev');
    const nextBtn = container.querySelector('#tour-next');

    const finish = () => {
      this.markCompleted();
      container.innerHTML = '';
      container.style.display = 'none';
      if (onComplete) onComplete();
    };

    const update = () => {
      const slide = this.slides[current];
      iconEl.innerHTML = icon(slide.icon, 34);
      titleEl.textContent = slide.title;
      bodyEl.textContent = slide.body;
      dotsEl.innerHTML = this.slides.map((_, i) => `<div class="tour-dot${i === current ? ' active' : ''}"></div>`).join('');
      prevBtn.disabled = current === 0;
      prevBtn.style.opacity = current === 0 ? '0.35' : '1';
      nextBtn.innerHTML = current === this.slides.length - 1
        ? `Get started ${icon('arrow-right', 14)}`
        : `Next ${icon('arrow-right', 14)}`;
    };

    container.querySelector('#tour-skip').addEventListener('click', finish);
    prevBtn.addEventListener('click', () => { if (current > 0) { current--; update(); } });
    nextBtn.addEventListener('click', () => {
      if (current < this.slides.length - 1) { current++; update(); }
      else finish();
    });

    update();
  },
};
