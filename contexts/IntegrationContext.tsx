import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { IntegrationName, IntegrationSummary } from '../types';
import * as apiService from '../services/apiService';
import { useAuth } from './AuthContext';

interface IntegrationContextValue {
  integrations: IntegrationSummary[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  connect: (integration: IntegrationName) => Promise<void>;
  disconnect: (integration: IntegrationName) => Promise<void>;
  getWebhookSecret: () => Promise<string>;
}

const IntegrationContext = createContext<IntegrationContextValue | undefined>(undefined);

export const IntegrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authState } = useAuth();
  const [integrations, setIntegrations] = useState<IntegrationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!authState.isAuthenticated) {
      setIntegrations([]);
      return;
    }
    setIsLoading(true);
    try {
      const { integrations } = await apiService.getIntegrations();
      setIntegrations(integrations);
    } finally {
      setIsLoading(false);
    }
  }, [authState.isAuthenticated]);

  const connect = useCallback(async (integration: IntegrationName) => {
    await apiService.connectIntegration(integration);
    await refresh();
  }, [refresh]);

  const disconnect = useCallback(async (integration: IntegrationName) => {
    await apiService.disconnectIntegration(integration);
    await refresh();
  }, [refresh]);

  const getWebhookSecret = useCallback(async () => {
    const { secret } = await apiService.getWebhookSecret();
    return secret;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ integrations, isLoading, refresh, connect, disconnect, getWebhookSecret }),
    [integrations, isLoading, refresh, connect, disconnect, getWebhookSecret]
  );

  return <IntegrationContext.Provider value={value}>{children}</IntegrationContext.Provider>;
};

export const useIntegrations = () => {
  const context = useContext(IntegrationContext);
  if (!context) {
    throw new Error('useIntegrations must be used within an IntegrationProvider');
  }
  return context;
};
