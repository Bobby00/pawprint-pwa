// ============================================================================
// PawPrint — Lightbox (doc: tap any photo to view full-screen)
// Usage: render images with  data-lightbox="group" data-lightbox-src="..."
//                   data-lightbox-caption="..."
// Groups define which images cycle together when the user taps arrows.
// ============================================================================

import { escapeHtml } from './sanitize.js';

const LIGHTBOX_ID = 'pp-lightbox-root';

export const Lightbox = {
  open({ images, startIndex = 0 }) {
    if (!images || !images.length) return;
    let index = startIndex;
    const host = document.body;

    host.querySelector(`#${LIGHTBOX_ID}`)?.remove();

    const root = document.createElement('div');
    root.id = LIGHTBOX_ID;
    root.innerHTML = `
      <div class="pp-lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer">
        <button class="pp-lightbox-close" aria-label="Close">✕</button>
        <button class="pp-lightbox-nav pp-lightbox-prev" aria-label="Previous photo">‹</button>
        <figure class="pp-lightbox-frame">
          <img class="pp-lightbox-image" alt="" />
          <figcaption class="pp-lightbox-caption"></figcaption>
        </figure>
        <button class="pp-lightbox-nav pp-lightbox-next" aria-label="Next photo">›</button>
        <span class="pp-lightbox-counter"></span>
      </div>
    `;
    document.body.appendChild(root);

    const image = root.querySelector('.pp-lightbox-image');
    const caption = root.querySelector('.pp-lightbox-caption');
    const counter = root.querySelector('.pp-lightbox-counter');
    const prev = root.querySelector('.pp-lightbox-prev');
    const next = root.querySelector('.pp-lightbox-next');

    const render = () => {
      const item = images[index];
      image.src = item.src;
      image.alt = item.caption || `Photo ${index + 1}`;
      caption.textContent = item.caption || '';
      counter.textContent = `${index + 1} / ${images.length}`;
      const multi = images.length > 1;
      prev.style.visibility = multi ? 'visible' : 'hidden';
      next.style.visibility = multi ? 'visible' : 'hidden';
    };

    const step = (dir) => {
      index = (index + dir + images.length) % images.length;
      render();
    };

    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };

    function close() {
      root.remove();
      document.removeEventListener('keydown', onKey, true);
    }

    root.querySelector('.pp-lightbox-close').addEventListener('click', close);
    prev.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    root.querySelector('.pp-lightbox').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) close();
    });
    document.addEventListener('keydown', onKey, true);

    render();
  },
};

/**
 * One delegated listener on document — all lightbox triggers use
 * attribute-based wiring so any future page gets it for free.
 */
function initLightbox() {
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-lightbox-src]');
    if (!trigger) return;
    e.preventDefault();
    e.stopPropagation();

    const group = trigger.getAttribute('data-lightbox') || '';
    const groupImages = Array.from(document.querySelectorAll(`[data-lightbox="${group}"]`));
    const images = groupImages.map((el) => ({
      src: el.getAttribute('data-lightbox-src'),
      caption: el.getAttribute('data-lightbox-caption') || '',
    }));
    const startIndex = Math.max(0, groupImages.indexOf(trigger));
    Lightbox.open({ images, startIndex });
  });
}

if (typeof document !== 'undefined') initLightbox();
