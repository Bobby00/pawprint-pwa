// ============================================================================
// PawPrint — Client-side router
// ============================================================================

import { Auth } from './auth.js';
import { LoginPage } from './pages/login.js';
import { Nav } from './components/nav.js';

// Expose Auth globally so pages can use window.Auth
window.Auth = Auth;

// Route handlers: path -> { render(container, params) }
const routes = {};

export function registerRoute(path, handler) {
  routes[path] = handler;
}

function matchRoute(pathname) {
  // Exact match first
  if (routes[pathname]) return { handler: routes[pathname], params: {} };

  // Param match (e.g. /pet/:id)
  for (const [pattern, handler] of Object.entries(routes)) {
    const regex = patternToRegex(pattern);
    const match = pathname.match(regex);
    if (match) {
      const paramNames = pattern.match(/:(\w+)/g) || [];
      const params = {};
      paramNames.forEach((pn, i) => {
        params[pn.slice(1)] = match[i + 1];
      });
      return { handler, params };
    }
  }
  return null;
}

function patternToRegex(pattern) {
  // '/business/:id' -> /^\/business\/([^/]+)$/ (simple capture groups)
  const regexPattern = pattern.replace(/:(\w+)/g, '([^/]+)');
  return new RegExp(`^${regexPattern}$`);
}

export async function navigateTo(path) {
  window.history.pushState({}, '', path);
  await renderRoute(path);
}

export async function renderRoute(pathname) {
  const shell = document.getElementById('shell');
  const main = document.getElementById('app-main');
  const authRoot = document.getElementById('auth-root');
  const pageTitle = document.getElementById('page-title');

  // Public routes (login / register) always render standalone — no shell,
  // even for logged-in users (so signing up doesn't mix with another account)
  const publicRoutes = ['/login', '/register'];
  const isPublic = publicRoutes.includes(pathname);

  if (isPublic) {
    shell.classList.add('hidden');
    authRoot.innerHTML = '';
    const handler = routes[pathname];
    if (pathname === '/login') {
      handler.render(authRoot, { onLogin: () => { if (window.__onAuthed) window.__onAuthed(); } });
    } else {
      handler.render(authRoot, { onRegister: () => { if (window.__onAuthed) window.__onAuthed(); } });
    }
    Nav.updateActiveRoute('/login');
    return;
  }

  if (!Auth.isAuthenticated()) {
    // Not signed in on a protected route — show the auth screen
    shell.classList.add('hidden');
    authRoot.innerHTML = '';
    LoginPage.render(authRoot, { onLogin: () => {
      if (window.__onAuthed) window.__onAuthed();
    }});
    Nav.updateActiveRoute('/login');
    return;
  }

  authRoot.innerHTML = '';
  shell.classList.remove('hidden');

  const match = matchRoute(pathname);
  if (!match) {
    main.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😕</div>
        <div class="empty-title">Page not found</div>
        <div class="empty-desc">The page you\'re looking for doesn\'t exist.</div>
      </div>
    `;
    Nav.updateActiveRoute(pathname);
    if (pageTitle) pageTitle.textContent = 'Not found — PawPrint';
    return;
  }

  main.innerHTML = '';
  await match.handler.render(main, match.params);
  Nav.updateActiveRoute(pathname);

  if (pageTitle) {
    if (match.handler.pageTitle) {
      pageTitle.textContent = `${match.handler.pageTitle} — PawPrint`;
    } else {
      pageTitle.textContent = 'PawPrint';
    }
  }
}

export function startRouter() {
  window.addEventListener('popstate', () => renderRoute(window.location.pathname));
  window.addEventListener('routechange', (e) => renderRoute(e.detail.route));
  renderRoute(window.location.pathname);
}
