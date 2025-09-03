import { User } from "@shared/firebase-schema";

let currentUser: User | null = null;

export const authService = {
  async initialize() {
    // Load user from localStorage if available
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        currentUser = JSON.parse(stored);
      } catch {
        localStorage.removeItem('user');
        currentUser = null;
      }
    }
  },

  login: (user: User) => {
    currentUser = user;
    localStorage.setItem('user', JSON.stringify(user));
  },
  
  async logout() {
    currentUser = null;
    localStorage.removeItem('user');
  },
  
  getCurrentUser: (): User | null => {
    if (currentUser) return currentUser;
    
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        currentUser = JSON.parse(stored);
      } catch {
        localStorage.removeItem('user');
        currentUser = null;
      }
    }
    
    return currentUser;
  },
  
  isAuthenticated: (): boolean => {
    return !!authService.getCurrentUser();
  }
};
