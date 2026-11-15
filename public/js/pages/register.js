// ============================================================================
// PawPrint — Register page
// ============================================================================

import { renderSignup } from '../components/auth-form.js';

export const RegisterPage = {
  pageTitle: 'Create account',

  render(container, { onRegister }) {
    renderSignup(container, onRegister);
  },
};
