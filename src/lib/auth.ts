// Temporary compatibility shim: prefer useAuth from contexts/AuthContext
import type { User } from '@shared/firebase-schema';

let currentUser: User | null = null;

/**
 * Lazily loads and returns the Firebase Google provider with hardened parameters.
 *
 * We set `prompt: 'select_account'` to force the account picker and reduce the chance
 * of Google silently reusing stale/broken legacy sessions.
 */
export async function getGoogleProvider() {
  const { googleProvider } = await import('./firebase');
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  return googleProvider;
}

export const authService = {
  async initialize() {},
  login(user: User) {
    currentUser = user;
  },
  async logout() {
    currentUser = null;
  },
  getCurrentUser(): User | null {
    return currentUser;
  },
  isAuthenticated(): boolean {
    return !!currentUser;
  },
};


