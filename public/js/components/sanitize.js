// ============================================================================
// PawPrint — Shared rendering helpers
// ============================================================================

/** Escape untrusted text before inserting into innerHTML templates. */
export function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
