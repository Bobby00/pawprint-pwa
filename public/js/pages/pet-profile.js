// ============================================================================
// PawPrint — Pet profile page (create a pet)
// ============================================================================

import { icon } from '../components/icons.js';

export const PetProfilePage = {
  pageTitle: 'Add a pet',

  async render(container) {
    const user = window.Auth.user;

    if (user.role === 'admin') {
      container.innerHTML = `
        <div class="pp-standard-page">
          <div class="pp-page-heading"><div><div class="pp-eyebrow"><span></span>ADMIN ACCOUNT</div><h1>Pet <span>profiles.</span></h1></div></div>
          <p class="pp-empty-state"><span class="empty-icon">${icon('shield-check', 40)}</span><span class="empty-title">Admins manage the platform</span><span class="empty-desc">Pet profiles belong to pet owner accounts. Use the admin console to manage competitions, businesses, events and content.</span></p>
        </div>
      `;
      return;
    }

    const { dbPut, dbGetByIndex } = await import('../db.js');
    const pets = await dbGetByIndex('pets', 'ownerId', user.id);
    const alreadyAwarded = pets.length > 0;

    container.innerHTML = `
      <div class="pp-standard-page">
        <div class="pp-page-heading"><div><div class="pp-eyebrow"><span></span>A PAWPRINT PROFILE</div><h1>Add your <span>pet.</span></h1></div></div>
        <form id="pet-form" class="pp-auth-form pp-pet-form">
          <span class="pp-form-field"><label for="pet-name">Pet name *</label><input class="pp-input" id="pet-name" type="text" placeholder="Milo" required></span>
          <div class="pp-form-row">
            <span class="pp-form-field"><label for="pet-species">Species *</label>
              <select class="pp-input" id="pet-species" required>
                <option value="Dog">Dog</option><option value="Cat">Cat</option><option value="Bird">Bird</option><option value="Rabbit">Rabbit</option><option value="Other">Other</option>
              </select>
            </span>
            <span class="pp-form-field"><label for="pet-breed">Breed</label><input class="pp-input" id="pet-breed" type="text" placeholder="Labrador"></span>
          </div>
          <div class="pp-form-row">
            <span class="pp-form-field"><label for="pet-age">Age (years)</label><input class="pp-input" id="pet-age" type="number" min="0" placeholder="2"></span>
            <span class="pp-form-field"><label for="pet-gender">Gender</label>
              <select class="pp-input" id="pet-gender"><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select>
            </span>
          </div>
          <span class="pp-form-field"><label for="pet-personality">Personality</label><input class="pp-input" id="pet-personality" type="text" placeholder="The adventurer"></span>
          <span class="pp-form-field"><label for="pet-interests">Interests (comma separated)</label><input class="pp-input" id="pet-interests" type="text" placeholder="Trails, snacks, sunbeams"></span>
          <span class="pp-form-field"><label for="pet-bio">Biography</label><textarea class="pp-input" id="pet-bio" rows="3" placeholder="Tell Nairobi about your best friend…"></textarea></span>
          <button type="submit" class="pp-btn pp-btn-solid pp-btn-lg" id="pet-submit">${icon('plus', 16)} Create pet profile</button>
          <p class="pp-demo-note">${alreadyAwarded ? 'Adding another pet grows your pack.' : 'Finish your first profile to collect 50 PawPoints.'}</p>
        </form>
      </div>
    `;

    container.querySelector('#pet-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const interests = container.querySelector('#pet-interests').value.split(',').map((s) => s.trim()).filter(Boolean);
      const now = new Date().toISOString();
      const pet = {
        ownerId: user.id,
        name: container.querySelector('#pet-name').value.trim(),
        species: container.querySelector('#pet-species').value,
        breed: container.querySelector('#pet-breed').value.trim() || null,
        age: parseInt(container.querySelector('#pet-age').value) || null,
        gender: container.querySelector('#pet-gender').value || null,
        personality: container.querySelector('#pet-personality').value.trim() || null,
        interests,
        bio: container.querySelector('#pet-bio').value.trim() || null,
        photos: [],
        achievements: [],
        competitionHistory: [],
        visibility: 'public',
        createdAt: now,
      };
      if (!pet.name) { window.showToast('Give your pet a name first 🐾'); return; }
      await dbPut('pets', pet);

      // Award one-time PawPoints for completing a pet profile
      if (!alreadyAwarded) {
        const { awardPoints, POINT_SCHEDULE } = await import('../components/points.js');
        const schedule = POINT_SCHEDULE.completePetProfile;
        const result = await awardPoints({
          userId: user.id,
          amount: schedule.amount,
          source: schedule.source,
          referenceId: `first_pet_${user.id}`,
        });

        // Referral activation: the referrer earns +100 when a referred owner
        // completes their first pet profile (doc §5.22 "activated pet owner")
        if (user.referredBy) {
          const { dbGet } = await import('../db.js');
          const referrer = await dbGet('users', user.referredBy);
          if (referrer && !referrer.suspended) {
            await awardPoints({
              userId: referrer.id,
              amount: POINT_SCHEDULE.referActivatedOwner.amount,
              source: POINT_SCHEDULE.referActivatedOwner.source,
              referenceId: `ref_${user.id}`,
            });
            const { pushNotification } = await import('../components/notify.js');
            await pushNotification({
              userId: referrer.id,
              title: 'Referral reward unlocked',
              body: `${user.name} just activated their account — you earned 100 PawPoints.`,
              type: 'reward',
            });
          }
        }

        window.showToast(result.awarded ? 'Pet profile created — +50 PawPoints! 🐾' : 'Pet profile created 🐾');
      } else {
        window.showToast('Pet profile created 🐾');
      }
      const { navigateTo } = await import('../router.js');
      navigateTo('/profile');
    });
  },
};
