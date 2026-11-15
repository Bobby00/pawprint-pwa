// ============================================================================
// PawPrint — Avatar helper: user photos with letter fallback
// ============================================================================

import { escapeHtml } from './sanitize.js';

/**
 * Render a user's avatar. Uses their uploaded photo when present, otherwise
 * a yellow initial tile. `cls` is the base class (e.g. 'pp-post-avatar').
 */
export function avatarHtml(field, cls = 'pp-post-avatar') {
  const name = (field && field.name) || '?';
  const initial = escapeHtml(name.charAt(0).toUpperCase());
  if (field && field.avatar) {
    return `<span class="${cls} pp-avatar-photo"><img class="pp-avatar-img" src="${field.avatar}" alt="${escapeHtml(name)}" /></span>`;
  }
  return `<span class="${cls} pp-post-avatar-fallback">${initial}</span>`;
}

/** Read an image file into a data URL, validating type and size. */
export function readAvatarFile(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(file.type)) { reject(new Error('Only image files work as photos.')); return; }
    if (file.size > 4 * 1024 * 1024) { reject(new Error('Photos must be under 4 MB — that one is huge!')); return; }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}
