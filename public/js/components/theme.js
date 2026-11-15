// ============================================================================
// PawPrint — Dark / light theme (design-system aware)
// The token block in style.css defines light values on :root and dark values
// on html.dark. This module persists the choice and keeps the toggle + meta
// theme-color in sync. First visit follows the system preference.
// ============================================================================

const STORAGE_KEY = 'pawprint_theme';

function systemPrefersDark() {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
}

export const Theme = {
  current: 'light',

  init() {
    let stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    this.current = stored === 'dark' || stored === 'light' ? stored : (systemPrefersDark() ? 'dark' : 'light');
    this.apply(this.current, { persist: false });

    // Event-delegated toggle so any .js-theme-toggle button works everywhere
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.js-theme-toggle');
      if (!btn) return;
      e.preventDefault();
      this.toggle();
    });

    // Screens that re-render their toggle button (auth pages) need re-painting
    window.addEventListener('routechange', () => setTimeout(() => this._decorate(), 60));
  },

  apply(theme, { persist = true } = {}) {
    this.current = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* ignore */ }
    }
    // Keep the browser UI colour in step (light: paper, dark: ink)
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#1b110d' : '#fefbf7');
    // Update every toggle button to show the theme you'd switch TO
    this._decorate();
  },

  toggle() {
    const next = this.current === 'dark' ? 'light' : 'dark';
    this.apply(next);
    window.showToast?.(next === 'dark' ? 'Dark mode on 🌙' : 'Light mode on ☀️');
  },

  /** Paint every .js-theme-toggle button with the icon of the OTHER theme. */
  _decorate() {
    import('./icons.js').then(({ icon }) => {
      document.querySelectorAll('.js-theme-toggle').forEach((btn) => {
        btn.innerHTML = icon(this.current === 'dark' ? 'sun' : 'moon', 19);
      });
    });
  },

  refreshButtons() {
    this._decorate();
  },
};
