import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

import { PlatformOverview } from '../types';
import { fetchOverview, createApiKey, revokeApiKey } from '../services/platformService';
import { useAuth } from './AuthProvider';

interface PlatformContextValue {
  overview: PlatformOverview | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  createKey: (label: string) => Promise<{ secret: string }>;
  revokeKey: (id: string) => Promise<void>;
}

const PlatformContext = createContext<PlatformContextValue | undefined>(undefined);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { auth } = useAuth();
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!auth.isAuthenticated) {
      setOverview(null);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchOverview();
      setOverview(data);
    } catch (error) {
      console.error('Failed to load platform overview', error);
      setOverview(null);
    } finally {
      setIsLoading(false);
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      refresh();
    } else {
      setOverview(null);
    }
  }, [auth.isAuthenticated, auth.user?.id, refresh]);

  const createKeyHandler = useCallback(async (label: string) => {
    const result = await createApiKey(label);
    await refresh();
    return { secret: result.secret as string };
  }, [refresh]);

  const revokeKeyHandler = useCallback(async (id: string) => {
    await revokeApiKey(id);
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ overview, isLoading, refresh, createKey: createKeyHandler, revokeKey: revokeKeyHandler }),
    [overview, isLoading, refresh, createKeyHandler, revokeKeyHandler]
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
};

export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
};
