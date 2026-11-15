// ============================================================================
// PawPrint — Content reporting (doc §5.9 / §15.3)
// Users flag posts or reviews with a reason; the record lands in the
// `reports` store for admin review (Reports tab in the admin console).
// ============================================================================

const REASONS = ['Spam or scam', 'Harassment or abuse', 'Inappropriate content', 'Misinformation', 'Something else'];

/**
 * Open the report modal for a target.
 * @param {object} opts
 * @param {'post'|'review'} opts.targetType
 * @param {number} opts.targetId
 * @param {string} [opts.preview] — short text preview for confirmation
 */
export function reportTarget({ targetType, targetId, preview = '' }) {
  const user = window.Auth.user;
  if (!user) return;

  const root = document.createElement('div');
  root.innerHTML = `
    <div class="pp-modal-overlay" id="report-modal">
      <div class="pp-modal">
        <div class="pp-modal-head"><h3>Report ${targetType}</h3><button class="pp-modal-close" aria-label="Close">✕</button></div>
        <form id="report-form" class="pp-modal-form">
          <p class="pp-modal-body">Why are you reporting this? Our moderators will review it${preview ? ` — “${preview.slice(0, 60)}${preview.length > 60 ? '…' : ''}”` : ''}.</p>
          <div class="pp-report-reasons">
            ${REASONS.map((r, i) => `
              <label class="pp-report-reason"><input type="radio" name="report-reason" value="${r}" ${i === 0 ? 'checked' : ''}> <span>${r}</span></label>
            `).join('')}
          </div>
          <textarea class="pp-input" id="report-detail" rows="2" placeholder="Add any detail for the moderators (optional)"></textarea>
          <div class="pp-modal-actions">
            <button type="submit" class="pp-btn pp-btn-solid pp-btn-md">Submit report</button>
            <button type="button" class="pp-btn pp-btn-ghost pp-btn-md pp-modal-dismiss">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const close = () => root.remove();
  root.querySelectorAll('.pp-modal-close, .pp-modal-dismiss').forEach((b) => b.addEventListener('click', close));
  root.querySelector('.pp-modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) close();
  });

  root.querySelector('#report-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { dbPut } = await import('../db.js');
    const reason = root.querySelector('input[name="report-reason"]:checked').value;
    const detail = root.querySelector('#report-detail').value.trim();

    await dbPut('reports', {
      targetType,
      targetId,
      reporterId: user.id,
      reporterName: user.name,
      reason,
      detail: detail || null,
      preview: preview.slice(0, 120),
      status: 'open',
      createdAt: new Date().toISOString(),
    });

    // Let the admin team know immediately
    const { notifyRole } = await import('./notify.js');
    await notifyRole('admin', {
      title: `New ${targetType} report`,
      body: `${user.name} reported a ${targetType} — ${reason}.`,
      type: 'moderation',
      link: '/admin',
    });

    close();
    window.showToast('Report sent to moderators — thank you 💛');
  });
}
