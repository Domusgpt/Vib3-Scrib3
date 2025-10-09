import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

import { AuthState } from '../types';
import * as apiService from '../services/apiService';

interface AuthContextValue {
  auth: AuthState;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const defaultState: AuthState = { isAuthenticated: false, user: null, license: null };

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>(defaultState);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const state = await apiService.getAuthState();
      setAuth(state);
    } catch (error) {
      console.error('Failed to load auth state', error);
      setAuth(defaultState);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await apiService.logout();
    setAuth(defaultState);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ auth, isLoading, refresh, logout }), [auth, isLoading, refresh, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
