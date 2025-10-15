import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  password: string;
  roles: Array<'client' | 'hub' | 'professional' | 'brand' | 'admin'>;
  currentRole: 'client' | 'hub' | 'professional' | 'brand' | 'admin' | null;
  provider?: 'google' | 'email';
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
  displayName?: string;
  profileImage?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  setCurrentRole: (role: NonNullable<User['currentRole']>) => void;
  hasRole: (role: NonNullable<User['currentRole']>) => boolean;
  updateRoles: (roles: User['roles']) => void;
  setRolesAndCurrentRole: (roles: User['roles'], currentRole: NonNullable<User['currentRole']>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function syncUserFromServer(userId: string) {
    try {
      const res = await fetch(`/api/users/${userId}`, { credentials: 'include' });
      if (!res.ok) return;
      const serverUser = await res.json();
      setUser((prev) => {
        if (!prev) return prev;
        const merged: User = {
          ...prev,
          roles: Array.from(new Set([...(prev.roles || []), ...((serverUser.roles as string[]) || [])])) as any,
          currentRole: (serverUser.currentRole ?? prev.currentRole) as any,
          displayName: serverUser.displayName ?? prev.displayName,
          updatedAt: new Date(),
        };
        localStorage.setItem('currentUser', JSON.stringify(merged));
        return merged;
      });
    } catch {}
  }

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    // Initialize immediately for better test compatibility
    const initAuth = () => {
      try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          // Convert date strings back to Date objects
          parsedUser.createdAt = new Date(parsedUser.createdAt);
          parsedUser.updatedAt = new Date(parsedUser.updatedAt);
          setUser(parsedUser);
          // Refresh roles/currentRole from server to avoid stale local cache
          if (parsedUser?.id) {
            syncUserFromServer(parsedUser.id);
          }
        }
      } catch (error) {
        console.error('Error loading user from localStorage:', error);
        localStorage.removeItem('currentUser');
      } finally {
        setIsLoading(false);
      }
    };

    // Initialize immediately for better test compatibility
    initAuth();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('currentUser', JSON.stringify(userData));
    // Background sync to pull latest roles/currentRole from server after login
    if (userData?.id) {
      syncUserFromServer(userData.id);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', headers: { 'X-Snipshift-CSRF': '1' }, credentials: 'include' });
    } catch (e) {
      // ignore network errors on logout
    } finally {
      setUser(null);
      localStorage.removeItem('currentUser');
    }
  };

  const setCurrentRole = (role: NonNullable<User['currentRole']>) => {
    if (user) {
      const roles = Array.isArray(user.roles) ? user.roles : [];
      const nextRoles = roles.includes(role) ? roles : [...roles, role];
      const updatedUser = { ...user, roles: nextRoles, currentRole: role, updatedAt: new Date() };
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
  };

  const updateRoles = (roles: User['roles']) => {
    if (user) {
      const uniqueRoles = Array.from(new Set(roles));
      const updatedUser = { ...user, roles: uniqueRoles, updatedAt: new Date() };
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
  };

  const setRolesAndCurrentRole = (roles: User['roles'], currentRole: NonNullable<User['currentRole']>) => {
    if (user) {
      const uniqueRoles = Array.from(new Set(roles.concat(currentRole as any)));
      const updatedUser = { ...user, roles: uniqueRoles as any, currentRole, updatedAt: new Date() };
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
  };

  const hasRole = (role: NonNullable<User['currentRole']>) => {
    return !!user && Array.isArray(user.roles) && user.roles.includes(role);
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    setCurrentRole,
    hasRole,
    updateRoles,
    setRolesAndCurrentRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}