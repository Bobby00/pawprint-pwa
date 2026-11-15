// ============================================================================
// PawPrint — Login page
// ============================================================================

import { renderLogin } from '../components/auth-form.js';

export const LoginPage = {
  pageTitle: 'Sign in',

  render(container, { onLogin }) {
    renderLogin(container, onLogin);
  },
};
