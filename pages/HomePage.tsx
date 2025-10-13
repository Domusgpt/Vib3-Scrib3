import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatView from '../components/chat/ChatView';
import ChatInput from '../components/ChatInput';
import ProfileModal from '../components/ProfileModal';
import ConsoleScaffold from '../components/console/ConsoleScaffold';
import OnboardingChecklist, { OnboardingStep } from '../components/onboarding/OnboardingChecklist';
import { ChatMessage, IntegrationName, LLMProvider, MessageAuthor, ProfileSource } from '../types';
import * as apiService from '../services/apiService';
import { useConsolePageState } from '../hooks/useConsolePageState';
import { useGuardedHandlers } from '../hooks/useGuardedHandlers';

const PROVIDER_OPTIONS = [
    {
        value: LLMProvider.CLAUDE,
        label: 'Claude Code (Rush)',
        description: 'Anthropic-powered rush co-pilot that blends code edits with your voice.',
        badge: 'Rush MVP',
        accentClass: 'from-amber-400/85 via-orange-500/80 to-rose-500/75',
    },
    {
        value: LLMProvider.GEMINI,
        label: 'Gemini Orchestrator',
        description: 'Google Gemini workflow tuned for lightning-fast style synthesis.',
        badge: 'Default',
        accentClass: 'from-sky-500/80 via-indigo-500/80 to-blue-600/75',
    },
] as const;

type ProviderOption = (typeof PROVIDER_OPTIONS)[number];

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const consoleState = useConsolePageState({ autoOpenAuthModal: true });

    const {
        authState,
        activeOrganization,
        profiles,
        activeProfileId,
        isBootstrapping,
        error: bootstrapError,
        refreshAuthState,
        refreshUsage,
        reloadProfiles,
        selectProfile,
        switchOrganization,
        logout,
        billingActions,
        guardWithAuth,
        authModal,
        usageSnapshot,
    } = consoleState;

    const providerLookup = useMemo(
        () => new Map<LLMProvider, ProviderOption>(PROVIDER_OPTIONS.map(option => [option.value, option])),
        [],
    );
    const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(LLMProvider.CLAUDE);
    const hasAnnouncedProviderChange = useRef(false);

    const activeOrgId = activeOrganization?.organization.id ?? null;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);

    const { open: openAuthModal } = authModal;
    const { isLoading: isBillingActionLoading, startTrial, upgradePlan, openPortal } = billingActions;

    const openProfileModal = useCallback(() => {
        setProfileModalOpen(true);
    }, []);

    const handleProviderChange = useCallback((provider: LLMProvider) => {
        setSelectedProvider(current => (current === provider ? current : provider));
    }, []);

    useEffect(() => {
        if (!hasAnnouncedProviderChange.current) {
            hasAnnouncedProviderChange.current = true;
            return;
        }

        const providerMeta = providerLookup.get(selectedProvider);
        if (!providerMeta) {
            return;
        }

        setMessages(prev => [
            ...prev,
            {
                author: MessageAuthor.SYSTEM,
                text: `Switched to ${providerMeta.label}. ${providerMeta.description}`,
            },
        ]);
    }, [providerLookup, selectedProvider]);

    useEffect(() => {
        if (isBootstrapping) {
            return;
        }

        const providerMeta = providerLookup.get(selectedProvider);

        setMessages(prev => {
            if (prev.length > 0) {
                return prev;
            }

            if (bootstrapError) {
                return [{ author: MessageAuthor.SYSTEM, text: bootstrapError }];
            }

            if (authState.isAuthenticated) {
                const providerGreeting = providerMeta
                    ? `${providerMeta.label} is dialed in. ${providerMeta.description}`
                    : "I'm ready to assist you.";
                return [
                    {
                        author: MessageAuthor.BOT,
                        text: `Welcome back! ${providerGreeting} Select a style profile or ask me to create a new one.`,
                    },
                ];
            }

            return [
                {
                    author: MessageAuthor.BOT,
                    text: 'Welcome to Scribe AI! Please sign in to create writing profiles and start generating text.',
                },
            ];
        });
    }, [authState.isAuthenticated, bootstrapError, isBootstrapping, providerLookup, selectedProvider]);

    const sendMessage = useCallback(
        async (text: string) => {
            const userMessage: ChatMessage = { author: MessageAuthor.USER, text };
            const history = messages;
            setMessages(prev => [...prev, userMessage]);
            setIsLoading(true);

            try {
                const response = await apiService.continueConversation({
                    prompt: text,
                    history,
                    context: { activeProfileId },
                    provider: selectedProvider,
                });

                if (response.text?.includes('created a new style profile')) {
                    await reloadProfiles();
                }

                setMessages(prev => [...prev, response]);
                await refreshUsage(activeOrgId ?? undefined);
            } catch (error) {
                const rawMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
                if (error instanceof Error && /anthropic api key is not configured/i.test(error.message)) {
                    setSelectedProvider(LLMProvider.GEMINI);
                    setMessages(prev => [
                        ...prev,
                        {
                            author: MessageAuthor.SYSTEM,
                            text: 'Claude Code requires an Anthropic API key. Falling back to the Gemini orchestrator.',
                        },
                    ]);
                } else {
                    const errorMessage: ChatMessage = {
                        author: MessageAuthor.SYSTEM,
                        text: `Error: ${rawMessage}`,
                    };
                    setMessages(prev => [...prev, errorMessage]);
                }
            } finally {
                setIsLoading(false);
            }
        },
        [activeOrgId, activeProfileId, messages, reloadProfiles, refreshUsage, selectedProvider],
    );

    const selectProfileWithAnnouncement = useCallback(
        async (id: string) => {
            await selectProfile(id);
            const profileName = profiles.find(p => p.id === id)?.name;
            if (profileName) {
                setMessages(prev => [
                    ...prev,
                    {
                        author: MessageAuthor.SYSTEM,
                        text: `Style profile "${profileName}" is now active.`,
                    },
                ]);
            }
        },
        [profiles, selectProfile],
    );

    const createProfile = useCallback(
        async (name: string, source: ProfileSource) => {
            setIsLoading(true);
            setProfileModalOpen(false);
            setMessages(prev => [
                ...prev,
                {
                    author: MessageAuthor.SYSTEM,
                    text: `Creating new profile "${name}" from ${source.type}... this may take a moment.`,
                },
            ]);

            let prompt = '';
            if (source.type === 'text') {
                prompt = `Create a new writing style profile for me. The name of the profile should be "${name}". Please analyze the following text to create it: """${source.content}"""`;
            } else {
                prompt = `Create a new writing style profile for me named "${name}" by analyzing my writing from my connected ${source.type} account.`;
            }
            await sendMessage(prompt);
        },
        [sendMessage],
    );

    const handleLogout = async () => {
        await logout();
        setMessages([{ author: MessageAuthor.BOT, text: 'You have been logged out.' }]);
    };

    const editMessage = useCallback(
        async (index: number, newText: string) => {
            const historyUpToIndex = messages.slice(0, index);
            const userMessageToResend: ChatMessage = { author: MessageAuthor.USER, text: newText };
            setMessages([...historyUpToIndex, userMessageToResend]);

            setIsLoading(true);
            try {
                const response = await apiService.continueConversation({
                    prompt: newText,
                    history: historyUpToIndex,
                    context: { activeProfileId },
                    provider: selectedProvider,
                });
                if (response.text?.includes('created a new style profile')) {
                    await reloadProfiles();
                }
                setMessages([...historyUpToIndex, userMessageToResend, response]);
                await refreshUsage(activeOrgId ?? undefined);
            } catch (error) {
                if (error instanceof Error && /anthropic api key is not configured/i.test(error.message)) {
                    setSelectedProvider(LLMProvider.GEMINI);
                    setMessages(prev => [
                        ...historyUpToIndex,
                        userMessageToResend,
                        {
                            author: MessageAuthor.SYSTEM,
                            text: 'Claude Code requires an Anthropic API key. Falling back to the Gemini orchestrator.',
                        },
                    ]);
                } else {
                    const errorMessage: ChatMessage = {
                        author: MessageAuthor.SYSTEM,
                        text: error instanceof Error ? error.message : 'An unknown error occurred.',
                    };
                    setMessages([...historyUpToIndex, userMessageToResend, errorMessage]);
                }
            } finally {
                setIsLoading(false);
            }
        },
        [activeOrgId, activeProfileId, messages, reloadProfiles, refreshUsage, selectedProvider],
    );

    const disconnectIntegration = useCallback(
        async (integration: IntegrationName) => {
            try {
                await apiService.disconnectIntegration(integration);
                await refreshAuthState();
                setMessages(prev => [
                    ...prev,
                    {
                        author: MessageAuthor.SYSTEM,
                        text: `${integration.charAt(0).toUpperCase() + integration.slice(1)} has been disconnected.`,
                    },
                ]);
            } catch (error) {
                const errorMessage: ChatMessage = {
                    author: MessageAuthor.SYSTEM,
                    text: error instanceof Error ? error.message : `Failed to disconnect ${integration}.`,
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        },
        [refreshAuthState],
    );

    const handleStartTrial = async (planId: string) => {
        const result = await startTrial(planId);
        if (result.status === 'requires-auth') {
            return;
        }
        if (result.status === 'error') {
            setMessages(prev => [...prev, { author: MessageAuthor.SYSTEM, text: result.message }]);
            return;
        }

        setMessages(prev => [
            ...prev,
            {
                author: MessageAuthor.SYSTEM,
                text: 'Your Pro trial is now active. Enjoy extended writing capacity and workflow automations!',
            },
        ]);
    };

    const handleUpgradePlan = async (planId: string, cadence: 'monthly' | 'yearly') => {
        const result = await upgradePlan(planId, cadence);
        if (result.status === 'requires-auth') {
            return;
        }
        if (result.status === 'error') {
            setMessages(prev => [...prev, { author: MessageAuthor.SYSTEM, text: result.message }]);
            return;
        }

        const checkoutUrl = result.data?.checkoutUrl;
        if (checkoutUrl) {
            window.open(checkoutUrl, '_blank', 'noopener');
            setMessages(prev => [
                ...prev,
                {
                    author: MessageAuthor.SYSTEM,
                    text: 'We opened a secure checkout tab so you can finalize the upgrade.',
                },
            ]);
        }
    };

    const handleOpenPortal = async () => {
        const result = await openPortal();
        if (result.status === 'requires-auth') {
            return;
        }
        if (result.status === 'error') {
            setMessages(prev => [...prev, { author: MessageAuthor.SYSTEM, text: result.message }]);
            return;
        }

        const portalUrl = result.data?.url;
        if (portalUrl) {
            window.open(portalUrl, '_blank', 'noopener');
        }
    };

    const switchOrganizationWithFeedback = useCallback(
        async (organizationId: string) => {
            try {
                await switchOrganization(organizationId);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unable to switch workspace.';
                setMessages(prev => [
                    ...prev,
                    { author: MessageAuthor.SYSTEM, text: message },
                ]);
            }
        },
        [switchOrganization],
    );

    const navigateToWorkspace = useCallback(() => {
        navigate('/workspace');
    }, [navigate]);

    const navigateToIntegrations = useCallback(() => {
        navigate('/integrations');
    }, [navigate]);

    const guardableHandlers = useMemo(
        () => ({
            openProfileModal,
            sendMessage,
            selectProfileWithAnnouncement,
            createProfile,
            editMessage,
            disconnectIntegration,
            switchOrganizationWithFeedback,
            navigateToWorkspace,
            navigateToIntegrations,
        }),
        [
            createProfile,
            disconnectIntegration,
            editMessage,
            navigateToWorkspace,
            navigateToIntegrations,
            openProfileModal,
            selectProfileWithAnnouncement,
            sendMessage,
            switchOrganizationWithFeedback,
        ],
    );

    const {
        openProfileModal: handleOpenProfileModal,
        sendMessage: handleSendMessage,
        selectProfileWithAnnouncement: handleProfileSelect,
        createProfile: handleCreateProfile,
        editMessage: handleEditMessage,
        disconnectIntegration: handleDisconnectIntegration,
        switchOrganizationWithFeedback: handleOrganizationChange,
        navigateToWorkspace: handleOpenWorkspaceSettings,
        navigateToIntegrations: handleOpenIntegrations,
    } = useGuardedHandlers(guardWithAuth, guardableHandlers);

    const startGuidedDraft = useCallback(() => {
        if (isLoading) {
            return;
        }
        void handleSendMessage(
            "Draft a friendly welcome update introducing Vib3 Scribe's writing co-pilot to the team and highlighting the new automation workflows.",
        );
    }, [handleSendMessage, isLoading]);

    const hasLocalUserMessage = useMemo(
        () => messages.some(message => message.author === MessageAuthor.USER),
        [messages],
    );

    const onboardingSteps = useMemo<OnboardingStep[]>(() => {
        const connectedIntegration = Boolean(authState.user?.google || authState.user?.facebook);
        const hasProfile = profiles.length > 0;
        const messageUsageCount = usageSnapshot?.usedMessages ?? authState.usage?.usedMessages ?? 0;
        const hasDrafted = hasLocalUserMessage || messageUsageCount > 0;

        const steps: OnboardingStep[] = [
            {
                id: 'authenticate',
                title: 'Sign in to sync your workspace',
                description: 'Authenticate with Google or Facebook to unlock saved profiles, billing, and automation telemetry.',
                isComplete: authState.isAuthenticated,
                action: authState.isAuthenticated
                    ? undefined
                    : {
                          label: 'Sign in',
                          onClick: () => {
                              openAuthModal();
                          },
                      },
            },
            {
                id: 'integration',
                title: 'Connect a writing data source',
                description: 'Link Gmail or Facebook so Vib3 Scribe can ingest real samples and learn your voice instantly.',
                isComplete: connectedIntegration,
                action: connectedIntegration
                    ? undefined
                    : {
                          label: 'Open integrations',
                          onClick: () => {
                              void handleOpenIntegrations();
                          },
                      },
            },
            {
                id: 'profile',
                title: 'Create your first style profile',
                description: 'Capture tone, cadence, and phrasing so every draft matches your brand voice.',
                isComplete: hasProfile,
                action: hasProfile
                    ? undefined
                    : {
                          label: 'New profile',
                          onClick: () => {
                              void handleOpenProfileModal();
                          },
                      },
            },
            {
                id: 'draft',
                title: 'Generate your first draft',
                description: 'Kick off a guided prompt and let the co-pilot orchestrate the AI workflow for you.',
                isComplete: hasDrafted,
                action: hasDrafted
                    ? undefined
                    : {
                          label: 'Draft welcome note',
                          onClick: () => {
                              startGuidedDraft();
                          },
                      },
            },
        ];

        return steps;
    }, [
        authState.isAuthenticated,
        authState.usage,
        authState.user,
        handleOpenIntegrations,
        handleOpenProfileModal,
        hasLocalUserMessage,
        openAuthModal,
        profiles.length,
        startGuidedDraft,
        usageSnapshot?.usedMessages,
    ]);

    const hasIncompleteOnboardingStep = useMemo(
        () => onboardingSteps.some(step => !step.isComplete),
        [onboardingSteps],
    );

    const onboardingBanner = hasIncompleteOnboardingStep ? (
        <div className="px-6 pb-8 sm:px-10">
            <OnboardingChecklist steps={onboardingSteps} />
        </div>
    ) : null;

    const headerActions = (
        <div className="flex flex-wrap items-center gap-3">
            <button
                onClick={handleOpenProfileModal}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-100 transition hover:bg-white/10"
            >
                New profile
            </button>
            <button
                onClick={handleOpenWorkspaceSettings}
                className="rounded-2xl border border-indigo-400/50 bg-indigo-500/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-100 transition hover:bg-indigo-500/40"
            >
                Workspace settings
            </button>
        </div>
    );

    const isContextLoading = isBootstrapping || (isLoading && authState.isAuthenticated);

    return (
        <>
            <ConsoleScaffold
                state={consoleState}
                eyebrow="Creator Ops"
                title="Compose and orchestrate with Vib3 Scribe"
                description="Coordinate writing agents, monitor capacity, and activate workflows from a single glassmorphic cockpit inspired by the Nimbus Guardian aesthetic."
                actions={headerActions}
                summaryLoading={isContextLoading}
                banner={onboardingBanner}
                sidebarOverrides={{
                    onProfileSelect: handleProfileSelect,
                    onProfileCreate: handleOpenProfileModal,
                    onLogout: handleLogout,
                    onDisconnect: handleDisconnectIntegration,
                    onStartTrial: handleStartTrial,
                    onUpgrade: handleUpgradePlan,
                    onOpenPortal: handleOpenPortal,
                    onOrganizationChange: handleOrganizationChange,
                }}
            >
                <div className="mx-auto flex h-full w-full max-w-5xl flex-1 flex-col gap-6 px-6 sm:px-10">
                    <div className="flex-1 overflow-hidden">
                        <div className="flex h-full flex-col rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_32px_60px_rgba(8,15,35,0.55)] backdrop-blur">
                            <ChatView messages={messages} isLoading={isLoading} onEditMessage={handleEditMessage} />
                        </div>
                    </div>
                    <ChatInput
                        onSendMessage={handleSendMessage}
                        isLoading={isLoading || isBootstrapping}
                        provider={selectedProvider}
                        providerOptions={PROVIDER_OPTIONS}
                        onProviderChange={handleProviderChange}
                    />
                </div>
            </ConsoleScaffold>
            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setProfileModalOpen(false)}
                onCreate={handleCreateProfile}
                isLoading={isLoading}
                authState={authState}
            />
        </>
    );
};

export default HomePage;

