// ============================================================================
// PawPrint — Business registration (doc §3.2: businesses join the platform)
// Applicants fill a listing request; PawPrint reviews, verifies and approves.
// On approval the listing goes live and the applicant is notified.
// ============================================================================

import { icon } from '../components/icons.js';

const CATEGORIES = ['Veterinary services', 'Grooming', 'Pet shops', 'Pet food and supplies', 'Pet training', 'Pet boarding and daycare', 'Pet sitting', 'Pet-friendly cafés and restaurants', 'Pet photography', 'Pet transport', 'Animal shelters and rescue organisations', 'Other pet-related services'];

export const RegisterBusinessPage = {
  pageTitle: 'List your business',

  async render(container) {
    const user = window.Auth.user;

    container.innerHTML = `
      <div class="pp-standard-page">
        <div class="pp-page-heading"><div><div class="pp-eyebrow"><span></span>FOR PET BUSINESSES</div><h1>List your <span>business.</span></h1><p>Apply to join Nairobi's pet ecosystem — verified, visible and booked solid.</p></div></div>
        <form id="register-business-form" class="pp-admin-form pp-register-business-form">
          <div class="pp-form-row">
            <span class="pp-form-field"><label for="rb-name">Business name *</label><input class="pp-input" id="rb-name" type="text" placeholder="Pawsome Groomers" required></span>
            <span class="pp-form-field"><label for="rb-category">Category *</label>
              <select class="pp-input" id="rb-category">
                ${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </span>
          </div>
          <span class="pp-form-field"><label for="rb-desc">What makes you special?</label><textarea class="pp-input" id="rb-desc" rows="2" placeholder="What you do, who you serve, why pet parents love you…"></textarea></span>
          <div class="pp-form-row">
            <span class="pp-form-field"><label for="rb-address">Address *</label><input class="pp-input" id="rb-address" type="text" placeholder="Westlands, Nairobi" required></span>
            <span class="pp-form-field"><label for="rb-hours">Opening hours</label><input class="pp-input" id="rb-hours" type="text" placeholder="Mon–Sat 8am–6pm"></span>
          </div>
          <div class="pp-form-row">
            <span class="pp-form-field"><label for="rb-phone">Phone</label><input class="pp-input" id="rb-phone" type="tel" placeholder="+254 700 000 000"></span>
            <span class="pp-form-field"><label for="rb-email">Email</label><input class="pp-input" id="rb-email" type="email" placeholder="hello@yourbusiness.co.ke"></span>
          </div>
          <span class="pp-form-field"><label for="rb-website">Website (optional)</label><input class="pp-input" id="rb-website" type="url" placeholder="https://yourbusiness.co.ke"></span>
          <span class="pp-form-field"><label for="rb-services">Services (comma separated)</label><input class="pp-input" id="rb-services" type="text" placeholder="Grooming, Nail trim, Boarding"></span>
          <div class="pp-register-business-note">
            ${icon('shield-check', 15)}
            <span>PawPrint reviews every application before publishing. Verification is based on evidence — never payment.</span>
          </div>
          <button type="submit" id="rb-submit" class="pp-btn pp-btn-solid pp-btn-lg">${icon('check', 16)} Submit application</button>
        </form>
      </div>
    `;

    container.querySelector('#register-business-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = container.querySelector('#rb-name').value.trim();
      const services = container.querySelector('#rb-services').value.split(',').map((s) => s.trim()).filter(Boolean);
      const submitBtn = container.querySelector('#rb-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';

      const { dbPut } = await import('../db.js');
      await dbPut('businessApplications', {
        name,
        category: container.querySelector('#rb-category').value,
        description: container.querySelector('#rb-desc').value.trim() || '',
        address: container.querySelector('#rb-address').value.trim(),
        hours: container.querySelector('#rb-hours').value.trim() || 'Ask for hours',
        phone: container.querySelector('#rb-phone').value.trim() || null,
        email: container.querySelector('#rb-email').value.trim() || null,
        website: container.querySelector('#rb-website').value.trim() || null,
        services,
        applicantId: user.id,
        applicantName: user.name,
        applicantRole: user.role,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      const { notifyRole } = await import('../components/notify.js');
      await notifyRole('admin', {
        title: 'New business application',
        body: `${name} applied to join PawPrint.`,
        type: 'moderation',
        link: '/admin',
      });
      window.showToast('Application received — PawPrint will review it soon ✓');
      const { navigateTo } = await import('../router.js');
      navigateTo('/');
    });
  },
};
