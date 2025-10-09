import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Subscription, SubscriptionPlan, UsageRecord, SubscriptionTier } from '../types';
import * as apiService from '../services/apiService';
import { useAuth } from './AuthContext';

interface SubscriptionContextValue {
  plans: SubscriptionPlan[];
  subscription: Subscription | null;
  usage: UsageRecord | null;
  withinAllowance: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  selectPlan: (planId: SubscriptionTier) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authState } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageRecord | null>(null);
  const [withinAllowance, setWithinAllowance] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!authState.isAuthenticated) {
      setSubscription(null);
      setUsage(null);
      setWithinAllowance(true);
      return;
    }
    setIsLoading(true);
    try {
      const [plansResponse, subscriptionResponse, usageResponse] = await Promise.all([
        apiService.getBillingPlans(),
        apiService.getSubscription(),
        apiService.getUsage(),
      ]);
      setPlans(plansResponse);
      setSubscription(subscriptionResponse.subscription);
      setUsage(usageResponse.usage);
      setWithinAllowance(usageResponse.withinAllowance);
    } finally {
      setIsLoading(false);
    }
  }, [authState.isAuthenticated]);

  const selectPlan = useCallback(
    async (planId: SubscriptionTier) => {
      const response = await apiService.updateSubscription(planId);
      setSubscription(response.subscription);
      setWithinAllowance(true);
    },
    []
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ plans, subscription, usage, withinAllowance, isLoading, refresh, selectPlan }),
    [plans, subscription, usage, withinAllowance, isLoading, refresh, selectPlan]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
