// snipshift/snipshift-next/web/src/hooks/useAuthStorage.ts
import { useState, useEffect } from 'react';

const AUTH_KEY = 'snipshift_auth_token';
const USER_KEY = 'currentUser';

interface User {
  id: string;
  email: string;
  name: string;
  credits?: number;
}

export const useAuthStorage = () => {
  const [token, setToken] = useState<string | null>(() => {
    // SSR-safe: check if window is available
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(AUTH_KEY);
    }
    return null;
  });

  const [user, setUser] = useState<User | null>(() => {
    // SSR-safe: check if window is available
    if (typeof window !== 'undefined') {
      const userStr = window.localStorage.getItem(USER_KEY);
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (token) {
        window.localStorage.setItem(AUTH_KEY, token);
      } else {
        window.localStorage.removeItem(AUTH_KEY);
      }
    }
  }, [token]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (user) {
        window.localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(USER_KEY);
      }
    }
  }, [user]);

  // Sync with localStorage on mount (for cases where token/user is set before component mounts, e.g., Cypress tests)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check localStorage immediately after mount to catch any token set before mount
    const storedToken = window.localStorage.getItem(AUTH_KEY);
    if (storedToken !== token) {
      setToken(storedToken);
    }

    // Check for user data in localStorage
    const storedUserStr = window.localStorage.getItem(USER_KEY);
    if (storedUserStr) {
      try {
        const storedUser = JSON.parse(storedUserStr);
        if (JSON.stringify(storedUser) !== JSON.stringify(user)) {
          setUser(storedUser);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, []); // Run only on mount

  const login = (newToken: string, userData?: User) => {
    setToken(newToken);
    if (userData) {
      setUser(userData);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return {
    token,
    user,
    login,
    logout,
    isAuthenticated: !!token,
  };
};

