// ============================================================================
// PawPrint — Post media (images & videos)
// Media is stored as data URLs on the post record (demo/offline-first;
// a real backend would upload to object storage instead).
// ============================================================================

import { icon } from './icons.js';
import { escapeHtml } from './sanitize.js';

export const POST_MEDIA = {
  maxFiles: 3,
  maxBytes: 6 * 1024 * 1024, // 6 MB per file
};

/** Read a File into a { type, url, name } media object, with validation. */
export function readMediaFile(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(file.type) && !/^video\//.test(file.type)) {
      reject(new Error('Only images and videos can be attached.'));
      return;
    }
    if (file.size > POST_MEDIA.maxBytes) {
      reject(new Error(`"${file.name}" is too large — files must be under 6 MB.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ type: file.type.startsWith('video') ? 'video' : 'image', url: reader.result, name: file.name });
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

/** Render a media strip for a post (used by all feeds). */
export function postMediaHtml(post) {
  const media = Array.isArray(post.photos) ? post.photos.filter((m) => m && typeof m === 'object' && m.url) : [];
  if (!media.length) return '';
  const gridClass = media.length === 1 ? 'pp-post-media is-single' : 'pp-post-media';
  return `
    <div class="${gridClass}">
      ${media.map((m) => m.type === 'video'
        ? `<video class="pp-media-video" src="${m.url}" controls preload="metadata" aria-label="Attached video"></video>`
        : `<img class="pp-media-image" src="${m.url}" alt="${escapeHtml(m.name || 'Post image')}" loading="lazy" data-lightbox="post-${post.id}" data-lightbox-src="${m.url}" data-lightbox-caption="${escapeHtml(m.name || 'Post image')}" />`
      ).join('')}
    </div>
  `;
}

/**
 * Wire a hidden <input type="file"> + preview area + state tracker to a
 * composer. Returns everything the composer needs to attach media to posts.
 */
export function wireComposerMedia(scope, { inputSelector, previewSelector, buttonSelector }) {
  const input = scope.querySelector(inputSelector);
  const preview = scope.querySelector(previewSelector);
  const files = [];

  const renderPreview = () => {
    if (!preview) return;
    preview.innerHTML = files.map((m, i) => `
      <span class="pp-compose-media-item">
        ${m.type === 'video'
          ? `<video src="${m.url}" muted preload="metadata"></video><em>${icon('video', 11)} Video</em>`
          : `<img src="${m.url}" alt="${escapeHtml(m.name || '')}" />`}
        <button type="button" class="pp-compose-media-remove" data-index="${i}" aria-label="Remove ${escapeHtml(m.name || 'attachment')}">✕</button>
      </span>
    `).join('');
    preview.querySelectorAll('.pp-compose-media-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        files.splice(Number(btn.getAttribute('data-index')), 1);
        renderPreview();
      });
    });
    preview.hidden = files.length === 0;
  };

  if (input) {
    input.addEventListener('change', async () => {
      const selected = Array.from(input.files || []);
      for (const file of selected) {
        if (files.length >= POST_MEDIA.maxFiles) {
          window.showToast(`Attach up to ${POST_MEDIA.maxFiles} files per post.`);
          break;
        }
        try {
          files.push(await readMediaFile(file));
        } catch (err) {
          window.showToast(err.message);
        }
      }
      input.value = '';
      renderPreview();
    });
  }

  const button = scope.querySelector(buttonSelector);
  if (button && input) button.addEventListener('click', () => input.click());

  return {
    /** Media objects to persist on the post. */
    files: () => files.slice(),
    clear: () => { files.length = 0; renderPreview(); },
  };
}
