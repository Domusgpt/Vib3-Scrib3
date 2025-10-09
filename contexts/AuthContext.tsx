import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthState } from '../types';
import * as apiService from '../services/apiService';

interface AuthContextValue {
  authState: AuthState;
  refresh: () => Promise<void>;
  isLoading: boolean;
}

const defaultState: AuthState = { isAuthenticated: false, user: null, license: null, subscription: null };

const AuthContext = createContext<AuthContextValue>({
  authState: defaultState,
  refresh: async () => undefined,
  isLoading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(defaultState);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const state = await apiService.getAuthState();
      setAuthState(state);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ authState, refresh, isLoading }), [authState, refresh, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
