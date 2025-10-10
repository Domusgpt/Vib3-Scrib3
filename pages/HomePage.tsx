import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatView from '../components/chat/ChatView';
import ChatInput from '../components/ChatInput';
import ProfileModal from '../components/ProfileModal';
import AuthModal from '../components/AuthModal';
import AppShell from '../components/layout/AppShell';
import WorkspaceSummaryBar from '../components/dashboard/WorkspaceSummaryBar';
import { ChatMessage, IntegrationName, MessageAuthor, ProfileSource } from '../types';
import * as apiService from '../services/apiService';
import { useConsolePageState } from '../hooks/useConsolePageState';

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const {
        authState,
        billingPlans,
        usageSnapshot,
        organizations,
        activeOrganizationId,
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
        authModal,
        requireAuth,
    } = useConsolePageState({ autoOpenAuthModal: true });

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);

    const {
        isLoading: isBillingActionLoading,
        startTrial,
        upgradePlan,
        openPortal,
    } = billingActions;
    const { isOpen: isAuthModalOpen, close: closeAuthModal } = authModal;

    const handleOpenProfileModal = useCallback(() => {
        requireAuth(() => setProfileModalOpen(true));
    }, [requireAuth]);

    useEffect(() => {
        if (isBootstrapping) {
            return;
        }

        setMessages(prev => {
            if (prev.length > 0) {
                return prev;
            }

            if (bootstrapError) {
                return [{ author: MessageAuthor.SYSTEM, text: bootstrapError }];
            }

            return authState.isAuthenticated
                ? [{ author: MessageAuthor.BOT, text: "Welcome back! I'm ready to assist you. Select a style profile or ask me to create a new one." }]
                : [{ author: MessageAuthor.BOT, text: 'Welcome to Scribe AI! Please sign in to create writing profiles and start generating text.' }];
        });
    }, [authState.isAuthenticated, bootstrapError, isBootstrapping]);

    const handleSendMessage = async (text: string) => {
        if (!requireAuth()) {
            return;
        }

        const userMessage: ChatMessage = { author: MessageAuthor.USER, text };
        const history = messages;
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const response = await apiService.continueConversation({
                prompt: text,
                history,
                context: { activeProfileId },
            });

            if (response.text?.includes('created a new style profile')) {
                await reloadProfiles();
            }

            setMessages(prev => [...prev, response]);
            await refreshUsage(activeOrganization?.organization.id);
        } catch (error) {
            const errorMessage: ChatMessage = {
                author: MessageAuthor.SYSTEM,
                text: error instanceof Error ? `Error: ${error.message}` : 'An unknown error occurred.',
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleProfileSelect = async (id: string) => {
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
    };

    const handleCreateProfile = async (name: string, source: ProfileSource) => {
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
        await handleSendMessage(prompt);
    };

    const handleLogout = async () => {
        await logout();
        setMessages([{ author: MessageAuthor.BOT, text: 'You have been logged out.' }]);
    };

    const handleEditMessage = async (index: number, newText: string) => {
        if (!requireAuth()) {
            return;
        }

        const historyUpToIndex = messages.slice(0, index);
        const userMessageToResend: ChatMessage = { author: MessageAuthor.USER, text: newText };
        setMessages([...historyUpToIndex, userMessageToResend]);

        setIsLoading(true);
        try {
            const response = await apiService.continueConversation({
                prompt: newText,
                history: historyUpToIndex,
                context: { activeProfileId },
            });
            if (response.text?.includes('created a new style profile')) {
                await reloadProfiles();
            }
            setMessages([...historyUpToIndex, userMessageToResend, response]);
            await refreshUsage(activeOrganization?.organization.id);
        } catch (error) {
            const errorMessage: ChatMessage = {
                author: MessageAuthor.SYSTEM,
                text: error instanceof Error ? error.message : 'An unknown error occurred.',
            };
            setMessages([...historyUpToIndex, userMessageToResend, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnectIntegration = async (integration: IntegrationName) => {
        if (!requireAuth()) {
            return;
        }

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
    };

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

    const handleOrganizationChange = async (organizationId: string) => {
        try {
            await switchOrganization(organizationId);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to switch workspace.';
            setMessages(prev => [
                ...prev,
                { author: MessageAuthor.SYSTEM, text: message },
            ]);
        }
    };

    const headerActions = (
        <div className="flex flex-wrap items-center gap-3">
            <button
                onClick={handleOpenProfileModal}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-100 transition hover:bg-white/10"
            >
                New profile
            </button>
            <button
                onClick={() => navigate('/workspace')}
                className="rounded-2xl border border-indigo-400/50 bg-indigo-500/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-100 transition hover:bg-indigo-500/40"
            >
                Workspace settings
            </button>
        </div>
    );

    const isContextLoading = isBootstrapping || (isLoading && authState.isAuthenticated);

    return (
        <>
            <AppShell
                sidebar={
                    <Sidebar
                        authState={authState}
                        profiles={profiles}
                        activeProfileId={activeProfileId}
                        onProfileSelect={handleProfileSelect}
                        onProfileCreate={handleOpenProfileModal}
                        onLogout={handleLogout}
                        onDisconnect={handleDisconnectIntegration}
                        billingPlans={billingPlans}
                        usage={usageSnapshot}
                        onStartTrial={handleStartTrial}
                        onUpgrade={handleUpgradePlan}
                        onOpenPortal={handleOpenPortal}
                        isBillingActionLoading={isBillingActionLoading}
                        organizations={organizations}
                        activeOrganizationId={activeOrganizationId}
                        onOrganizationChange={handleOrganizationChange}
                    />
                }
                eyebrow="Creator Ops"
                title="Compose and orchestrate with Vib3 Scribe"
                description="Coordinate writing agents, monitor capacity, and activate workflows from a single glassmorphic cockpit inspired by the Nimbus Guardian aesthetic."
                actions={headerActions}
                headerContent={
                    <WorkspaceSummaryBar
                        organization={activeOrganization}
                        usage={usageSnapshot}
                        isLoading={isContextLoading}
                    />
                }
            >
                <div className="mx-auto flex h-full w-full max-w-5xl flex-1 flex-col gap-6 px-6 sm:px-10">
                    <div className="flex-1 overflow-hidden">
                        <div className="flex h-full flex-col rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_32px_60px_rgba(8,15,35,0.55)] backdrop-blur">
                            <ChatView messages={messages} isLoading={isLoading} onEditMessage={handleEditMessage} />
                        </div>
                    </div>
                    <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading || isBootstrapping} />
                </div>
            </AppShell>
            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setProfileModalOpen(false)}
                onCreate={handleCreateProfile}
                isLoading={isLoading}
                authState={authState}
            />
            {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />}
        </>
    );
};

export default HomePage;

