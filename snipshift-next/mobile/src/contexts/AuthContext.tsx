import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useApolloClient } from '@apollo/client';
import { clearApolloCache } from '../config/apollo';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  profileImage?: string;
  roles: string[];
  currentRole?: string;
  isVerified: boolean;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (tokens: AuthTokens, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const apolloClient = useApolloClient();

  // Secure storage keys
  const TOKEN_KEY = 'auth_token';
  const REFRESH_TOKEN_KEY = 'refresh_token';
  const USER_KEY = 'user_data';

  // Load stored authentication data on app start
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const [token, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);

        if (token && storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          // Token is already set in Apollo Client via auth link
        }
      } catch (error) {
        console.error('Error loading stored auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  const login = async (tokens: AuthTokens, userData: User) => {
    try {
      // Store tokens securely
      await Promise.all([
        SecureStore.setItemAsync(TOKEN_KEY, tokens.token),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(userData)),
      ]);

      setUser(userData);

      // Clear Apollo cache to ensure fresh data
      await clearApolloCache();

    } catch (error) {
      console.error('Error during login:', error);
      throw new Error('Failed to save authentication data');
    }
  };

  const logout = async () => {
    try {
      // Clear all stored authentication data
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);

      setUser(null);

      // Clear Apollo cache
      await clearApolloCache();

    } catch (error) {
      console.error('Error during logout:', error);
      // Still set user to null even if clearing storage fails
      setUser(null);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    // Update stored user data
    AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser)).catch(error => {
      console.error('Error updating stored user data:', error);
    });
  };

  const refreshAuth = async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Here you would call your refresh token mutation
      // For now, we'll just check if we have valid stored data
      const [token, storedUser] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (token && storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } else {
        throw new Error('No valid authentication data');
      }
    } catch (error) {
      console.error('Error refreshing auth:', error);
      // If refresh fails, logout
      await logout();
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
