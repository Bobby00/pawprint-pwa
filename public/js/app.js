// ============================================================================
// PawPrint — Main application entry point
// Registers routes, seeds demo data, wires the feature tour, starts router.
// ============================================================================

import { Nav } from './components/nav.js';
import { NotificationUI } from './components/notification.js';
import { FeatureTour } from './components/feature-tour.js';
import { Theme } from './components/theme.js';
import { seedIfEmpty } from './db.js';

// Pages
import { LoginPage } from './pages/login.js';
import { RegisterPage } from './pages/register.js';
import { HomePage } from './pages/home.js';
import { DiscoverPage } from './pages/discover.js';
import { ArenaPage } from './pages/arena.js';
import { CommunityPage } from './pages/community.js';
import { ProfilePage } from './pages/profile.js';
import { PetProfilePage } from './pages/pet-profile.js';
import { BusinessProfilePage } from './pages/business-profile.js';
import { AdminPage } from './pages/admin.js';
import { RewardsPage } from './pages/rewards.js';
import { DashboardPage } from './pages/dashboard.js';
import { CommunityDetailPage } from './pages/community-detail.js';
import { ChallengesPage } from './pages/challenges.js';
import { SettingsPage } from './pages/settings.js';
import { MessagesPage, refreshMessageBadge } from './pages/messages.js';
import { AdoptPage } from './pages/adopt.js';
import { RegisterBusinessPage } from './pages/register-business.js';

import { registerRoute, navigateTo, renderRoute, startRouter } from './router.js';

// Make helpers available globally
window.navigateTo = navigateTo;
window.renderRoute = renderRoute;
window.FeatureTour = FeatureTour;
window.__ppRouter = { renderRoute };

// Register all application routes
registerRoute('/', HomePage);
registerRoute('/login', LoginPage);
registerRoute('/register', RegisterPage);
registerRoute('/discover', DiscoverPage);
registerRoute('/arena', ArenaPage);
registerRoute('/community', CommunityPage);
registerRoute('/community/:id', CommunityDetailPage);
registerRoute('/challenges', ChallengesPage);
registerRoute('/settings', SettingsPage);
registerRoute('/messages', MessagesPage);
registerRoute('/messages/:userId', MessagesPage);
registerRoute('/adopt', AdoptPage);
registerRoute('/register-business', RegisterBusinessPage);
registerRoute('/profile', ProfilePage);
registerRoute('/pet-profile', PetProfilePage);
registerRoute('/business/:id', BusinessProfilePage);
registerRoute('/admin', AdminPage);
registerRoute('/rewards', RewardsPage);
registerRoute('/dashboard', DashboardPage);

// Show the one-time feature tour overlay
function showTourOnce() {
  if (!FeatureTour.isCompleted()) {
    const tourEl = document.getElementById('tour-root');
    tourEl.style.display = 'block';
    FeatureTour.render(tourEl, () => {
      tourEl.style.display = 'none';
    });
  }
}

// Called by the router after successful login or registration
window.__onAuthed = async () => {
  const shell = document.getElementById('shell');
  const authRoot = document.getElementById('auth-root');
  authRoot.innerHTML = '';
  shell.classList.remove('hidden');
  Nav.updateUser(window.Auth.user);
  await Nav.refreshPointsPill();
  await NotificationUI.refreshBadge();
  await renderRoute('/');
  showTourOnce();
};

async function init() {
  Theme.init();
  await seedIfEmpty();
  Nav.init();
  NotificationUI.init();
  await NotificationUI.refreshBadge();
  await refreshMessageBadge();
  await Nav.refreshPointsPill();
  if (window.Auth.isAuthenticated()) {
    Nav.updateUser(window.Auth.user);
    shellVisible();
  }
  startRouter();
}

function shellVisible() {
  document.getElementById('shell').classList.remove('hidden');
}

init().catch((err) => {
  console.error('[PawPrint] Init failed:', err);
  window.showToast('Failed to load app. Refresh to retry.', { action: 'Refresh', onAction: () => window.location.reload() });
});
