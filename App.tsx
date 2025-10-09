import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import ProfileModal from './components/ProfileModal';
import AuthModal from './components/AuthModal';
import Dashboard from './pages/Dashboard';
import IntegrationsPage from './pages/Integrations';
import BillingPage from './pages/Billing';
import SettingsPage from './pages/Settings';
import { AppView, ChatMessage, IntegrationName, LLMProvider, MessageAuthor, ProfileSource, StyleProfile, SubscriptionTier } from './types';
import * as apiService from './services/apiService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { IntegrationProvider, useIntegrations } from './contexts/IntegrationContext';
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext';

const initialBotMessage: ChatMessage = {
  author: MessageAuthor.BOT,
  text: "Welcome to Scribe! Connect a source or paste writing samples so I can adapt to your voice.",
};

const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <SubscriptionProvider>
      <IntegrationProvider>{children}</IntegrationProvider>
    </SubscriptionProvider>
  </AuthProvider>
);

const AppShell: React.FC = () => {
  const { authState, refresh: refreshAuth } = useAuth();
  const { integrations, connect, disconnect, getWebhookSecret, refresh: refreshIntegrations } = useIntegrations();
  const {
    plans,
    subscription,
    usage,
    withinAllowance,
    selectPlan,
    isLoading: isBillingLoading,
    refresh: refreshBilling,
  } = useSubscription();

  const [profiles, setProfiles] = useState<StyleProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([initialBotMessage]);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(LLMProvider.GEMINI);

  const hasActiveSubscription = useMemo(() => {
    if (!subscription) return false;
    return subscription.status === 'active' || subscription.status === 'trialing';
  }, [subscription]);

  const loadProfiles = useCallback(async () => {
    if (!authState.isAuthenticated) return;
    const fetchedProfiles = await apiService.getProfiles();
    setProfiles(fetchedProfiles);
    if (fetchedProfiles.length > 0) {
      const newActiveId = activeProfileId || fetchedProfiles[0].id;
      if (newActiveId !== activeProfileId) {
        setActiveProfileId(newActiveId);
        await apiService.setActiveProfile(newActiveId);
      }
    }
  }, [authState.isAuthenticated, activeProfileId]);

  useEffect(() => {
    if (authState.isAuthenticated) {
      loadProfiles();
      setMessages((prev) =>
        prev.length === 1 && prev[0] === initialBotMessage
          ? [
              {
                author: MessageAuthor.BOT,
                text: "Welcome back! I'm ready whenever you are.",
              },
            ]
          : prev
      );
    } else {
      setProfiles([]);
      setActiveProfileId(null);
      setMessages([initialBotMessage]);
    }
  }, [authState.isAuthenticated, loadProfiles]);

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!authState.isAuthenticated) {
        setAuthModalOpen(true);
        return;
      }
      if (!hasActiveSubscription) {
        setActiveView('billing');
        setMessages((prev) => [
          ...prev,
          {
            author: MessageAuthor.SYSTEM,
            text: 'An active subscription is required to draft new content. Choose a plan from the Billing tab.',
          },
        ]);
        return;
      }

      const userMessage: ChatMessage = { author: MessageAuthor.USER, text };
      const currentMessages = [...messages, userMessage];
      setMessages(currentMessages);
      setIsLoading(true);

      try {
        const response = await apiService.continueConversation({
          prompt: text,
          history: messages,
          context: { activeProfileId },
          provider: selectedProvider,
        });
        if (response.text?.includes('created a new style profile')) {
          await loadProfiles();
        }
        setMessages([...currentMessages, response]);
      } catch (error) {
        const status = error instanceof Error && (error as any).status ? (error as any).status : undefined;
        if (status === 402) {
          setActiveView('billing');
        }
        const errorMessage: ChatMessage = {
          author: MessageAuthor.SYSTEM,
          text: error instanceof Error ? error.message : 'Something went wrong while contacting the model.',
        };
        setMessages([...currentMessages, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [authState.isAuthenticated, hasActiveSubscription, messages, activeProfileId, selectedProvider, loadProfiles]
  );

  const handleEditMessage = useCallback(
    (index: number, newText: string) => {
      const historyUpToIndex = messages.slice(0, index);
      const userMessageToResend: ChatMessage = { author: MessageAuthor.USER, text: newText };
      setMessages([...historyUpToIndex, userMessageToResend]);
      setIsLoading(true);
      apiService
        .continueConversation({
          prompt: newText,
          history: historyUpToIndex,
          context: { activeProfileId },
          provider: selectedProvider,
        })
        .then(async (response) => {
          if (response.text?.includes('created a new style profile')) {
            await loadProfiles();
          }
          setMessages([...historyUpToIndex, userMessageToResend, response]);
        })
        .catch((error) => {
          const errorMessage: ChatMessage = {
            author: MessageAuthor.SYSTEM,
            text: error instanceof Error ? error.message : 'An unknown error occurred.',
          };
          setMessages([...historyUpToIndex, userMessageToResend, errorMessage]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [messages, activeProfileId, selectedProvider, loadProfiles]
  );

  const handleProfileSelect = useCallback(
    async (id: string) => {
      setActiveProfileId(id);
      await apiService.setActiveProfile(id);
      const profileName = profiles.find((profile) => profile.id === id)?.name;
      if (profileName) {
        setMessages((prev) => [
          ...prev,
          {
            author: MessageAuthor.SYSTEM,
            text: `Style profile "${profileName}" is now active.`,
          },
        ]);
      }
    },
    [profiles]
  );

  const handleCreateProfile = useCallback(
    async (name: string, source: ProfileSource) => {
      setProfileModalOpen(false);
      setMessages((prev) => [
        ...prev,
        {
          author: MessageAuthor.SYSTEM,
          text: `Creating new profile "${name}" from ${source.type}. This may take a moment.`,
        },
      ]);
      await handleSendMessage(
        source.type === 'text'
          ? `Create a new writing style profile for me named "${name}". Analyse this text: """${source.content}""".`
          : `Create a new writing style profile named "${name}" by analysing my connected ${source.type} account.`
      );
    },
    [handleSendMessage]
  );

  const handleLogout = useCallback(async () => {
    await apiService.logout();
    await refreshAuth();
    await Promise.all([refreshIntegrations(), refreshBilling()]);
    setProfiles([]);
    setActiveProfileId(null);
    setMessages([initialBotMessage, { author: MessageAuthor.SYSTEM, text: 'You have been logged out.' }]);
  }, [refreshAuth, refreshIntegrations, refreshBilling]);

  const handleIntegrationConnect = useCallback(
    async (integration: IntegrationName) => {
      if (integration === 'google' || integration === 'facebook') {
        window.location.href = `/auth/${integration}`;
        return;
      }
      await connect(integration);
      await Promise.all([refreshIntegrations(), refreshAuth()]);
    },
    [connect, refreshIntegrations, refreshAuth]
  );

  const handleIntegrationDisconnect = useCallback(
    async (integration: IntegrationName) => {
      await disconnect(integration);
      await Promise.all([refreshIntegrations(), refreshAuth()]);
      setMessages((prev) => [
        ...prev,
        {
          author: MessageAuthor.SYSTEM,
          text: `${integration.toString().charAt(0).toUpperCase() + integration.toString().slice(1)} has been disconnected.`,
        },
      ]);
    },
    [disconnect, refreshIntegrations, refreshAuth]
  );

  const handlePlanSelection = useCallback(
    async (planId: SubscriptionTier) => {
      await selectPlan(planId);
      await refreshBilling();
      setMessages((prev) => [
        ...prev,
        {
          author: MessageAuthor.SYSTEM,
          text: `Subscription updated to ${planId.toUpperCase()} plan.`,
        },
      ]);
    },
    [selectPlan, refreshBilling]
  );

  const activeContent = useMemo(() => {
    switch (activeView) {
      case 'integrations':
        return (
          <IntegrationsPage
            integrations={integrations}
            onConnect={handleIntegrationConnect}
            onDisconnect={handleIntegrationDisconnect}
            onRevealWebhookSecret={getWebhookSecret}
          />
        );
      case 'billing':
        return (
          <BillingPage
            plans={plans}
            subscription={subscription}
            usage={usage}
            withinAllowance={withinAllowance}
            onSelectPlan={handlePlanSelection}
            isLoading={isBillingLoading}
          />
        );
      case 'settings':
        return (
          <SettingsPage profiles={profiles} activeProfileId={activeProfileId} onSelectProfile={handleProfileSelect} />
        );
      default:
        return (
          <Dashboard
            authState={authState}
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            selectedProvider={selectedProvider}
            onProviderChange={setSelectedProvider}
            hasActiveSubscription={hasActiveSubscription}
          />
        );
    }
  }, [activeView, integrations, handleIntegrationConnect, handleIntegrationDisconnect, getWebhookSecret, plans, subscription, usage, withinAllowance, handlePlanSelection, isBillingLoading, profiles, activeProfileId, handleProfileSelect, authState, messages, isLoading, handleSendMessage, handleEditMessage, selectedProvider, hasActiveSubscription]);

  return (
    <div className="h-screen w-screen bg-slate-900 text-slate-200 flex font-sans">
      <Sidebar
        authState={authState}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onProfileSelect={handleProfileSelect}
        onProfileCreate={() => (authState.isAuthenticated ? setProfileModalOpen(true) : setAuthModalOpen(true))}
        onLogout={handleLogout}
        integrations={integrations}
        onConnect={handleIntegrationConnect}
        onDisconnect={handleIntegrationDisconnect}
        activeView={activeView}
        onNavigate={setActiveView}
      />
      {activeContent}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onCreate={handleCreateProfile}
        isLoading={isLoading}
        authState={authState}
      />
      {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />}
    </div>
  );
};

const App: React.FC = () => (
  <AppProviders>
    <AppShell />
  </AppProviders>
);

export default App;
