// ============================================================================
// PawPrint — Share (doc P0: shareable competition pages & pet profiles)
// Native Web Share API with a clipboard fallback.
// ============================================================================

/**
 * Share a PawPrint page/entry.
 * @param {object} opts
 * @param {string} opts.title — what the share is about
 * @param {string} opts.text — share message
 * @param {string} [opts.path] — app path (defaults to current page)
 */
export async function shareLink({ title, text, path } = {}) {
  const url = `${window.location.origin}${path || window.location.pathname}`;
  const payload = { title: title || 'PawPrint', text: text || title || 'PawPrint', url };
  try {
    if (navigator.share) {
      await navigator.share(payload);
      return true;
    }
    await navigator.clipboard.writeText(`${payload.text} ${payload.url}`);
    window.showToast('Link copied — share it anywhere 💛');
    return true;
  } catch (err) {
    if (err && err.name === 'AbortError') return false;
    try {
      await navigator.clipboard.writeText(payload.url);
      window.showToast('Link copied 💛');
      return true;
    } catch (e) {
      window.showToast('Could not copy the link — long-press and copy the URL.');
      return false;
    }
  }
}
