// Temporary compatibility shim: prefer useAuth from contexts/AuthContext
import type { User } from '@shared/types';

let currentUser: User | null = null;

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


