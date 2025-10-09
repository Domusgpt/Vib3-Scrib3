import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatView from '../components/chat/ChatView';
import ChatInput from '../components/ChatInput';
import ProfileModal from '../components/ProfileModal';
import AuthModal from '../components/AuthModal';
import AppShell from '../components/layout/AppShell';
import WorkspaceSummaryBar from '../components/dashboard/WorkspaceSummaryBar';
import {
    AuthState,
    BillingPlan,
    ChatMessage,
    IntegrationName,
    MessageAuthor,
    OrganizationSummary,
    ProfileSource,
    StyleProfile,
    UsageSnapshot,
} from '../types';
import * as apiService from '../services/apiService';

const HomePage: React.FC = () => {
    const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false, user: null, license: null, subscription: null, usage: null });
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [profiles, setProfiles] = useState<StyleProfile[]>([]);
    const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
    const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
    const [usageSnapshot, setUsageSnapshot] = useState<UsageSnapshot | null>(null);
    const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
    const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isBillingActionLoading, setBillingActionLoading] = useState(false);
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);
    const navigate = useNavigate();

    const handleOpenProfileModal = useCallback(() => {
        if (authState.isAuthenticated) {
            setProfileModalOpen(true);
        } else {
            setAuthModalOpen(true);
        }
    }, [authState.isAuthenticated]);

    const fetchInitialData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [plans, auth] = await Promise.all([
                apiService.getBillingPlans(),
                apiService.getAuthState(),
            ]);
            setBillingPlans(plans);
            setAuthState(auth);
            setUsageSnapshot(auth.usage);
            if (auth.organizations) {
                setOrganizations(auth.organizations);
            }
            if (auth.activeOrganizationId) {
                setActiveOrganizationId(auth.activeOrganizationId);
            }

            if (auth.isAuthenticated) {
                const fetchedProfiles = await apiService.getProfiles();
                setProfiles(fetchedProfiles);
                if (fetchedProfiles.length > 0 && !activeProfileId) {
                    const newActiveId = fetchedProfiles[0].id;
                    setActiveProfileId(newActiveId);
                    await apiService.setActiveProfile(newActiveId);
                }
                if (messages.length === 0) {
                    setMessages([{ author: MessageAuthor.BOT, text: "Welcome back! I'm ready to assist you. Select a style profile or ask me to create a new one." }]);
                }
                await refreshUsage();
            } else if (messages.length === 0) {
                setMessages([{ author: MessageAuthor.BOT, text: "Welcome to Scribe AI! Please sign in to create writing profiles and start generating text." }]);
            }
        } catch (error) {
            console.error('Failed to fetch initial data:', error);
            setMessages([{ author: MessageAuthor.SYSTEM, text: 'Failed to load session. Please refresh the page.' }]);
        }
        setIsLoading(false);
    }, [activeProfileId, messages.length]);

    const refreshAuthState = useCallback(async () => {
        const nextAuth = await apiService.getAuthState();
        setAuthState(nextAuth);
        setUsageSnapshot(nextAuth.usage);
        if (nextAuth.organizations) {
            setOrganizations(nextAuth.organizations);
        }
        if (typeof nextAuth.activeOrganizationId !== 'undefined') {
            setActiveOrganizationId(nextAuth.activeOrganizationId);
        }
        return nextAuth;
    }, []);

    const refreshUsage = useCallback(async () => {
        try {
            const usage = await apiService.getUsage();
            setUsageSnapshot(usage);
            return usage;
        } catch (error) {
            console.error('Failed to refresh usage metrics:', error);
            return null;
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSendMessage = async (text: string) => {
        if (!authState.isAuthenticated) {
            setAuthModalOpen(true);
            return;
        }

        const userMessage: ChatMessage = { author: MessageAuthor.USER, text };
        const currentMessages = [...messages, userMessage];
        setMessages(currentMessages);
        setIsLoading(true);

        try {
            const response = await apiService.continueConversation({
                prompt: text,
                history: messages, // Send the full history for context
                context: { activeProfileId }
            });
            // Check if the AI created a new profile, and if so, refresh the list
            if (response.text?.includes("created a new style profile")) {
                const fetchedProfiles = await apiService.getProfiles();
                setProfiles(fetchedProfiles);
                // Optionally, make the new profile active
                if(fetchedProfiles.length > profiles.length) {
                    setActiveProfileId(fetchedProfiles[0].id);
                    await apiService.setActiveProfile(fetchedProfiles[0].id);
                }
            }
            setMessages([...currentMessages, response]);
            await refreshUsage();
        } catch (error) {
            const errorMessage: ChatMessage = {
                author: MessageAuthor.SYSTEM,
                text: error instanceof Error ? `Error: ${error.message}` : "An unknown error occurred."
            };
            setMessages([...currentMessages, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleProfileSelect = async (id: string) => {
        setActiveProfileId(id);
        await apiService.setActiveProfile(id);
        const profileName = profiles.find(p => p.id === id)?.name;
        if (profileName) {
            setMessages(prev => [...prev, {
                author: MessageAuthor.SYSTEM,
                text: `Style profile "${profileName}" is now active.`
            }]);
        }
    };
    
    const handleCreateProfile = async (name: string, source: ProfileSource) => {
        setIsLoading(true);
        setProfileModalOpen(false);
        setMessages(prev => [...prev, {
            author: MessageAuthor.SYSTEM,
            text: `Creating new profile "${name}" from ${source.type}... this may take a moment.`
        }]);
        
        // This is a special command to the AI, so we use handleSendMessage
        let prompt = '';
        if (source.type === 'text') {
            prompt = `Create a new writing style profile for me. The name of the profile should be "${name}". Please analyze the following text to create it: """${source.content}"""`;
        } else {
            prompt = `Create a new writing style profile for me named "${name}" by analyzing my writing from my connected ${source.type} account.`;
        }
        await handleSendMessage(prompt);
    };
    
    const handleLogout = async () => {
        await apiService.logout();
        setAuthState({ isAuthenticated: false, user: null, license: null, subscription: null, usage: null });
        setProfiles([]);
        setActiveProfileId(null);
        setUsageSnapshot(null);
        setOrganizations([]);
        setActiveOrganizationId(null);
        setMessages([{ author: MessageAuthor.BOT, text: "You have been logged out." }]);
    };
    
    const handleEditMessage = async (index: number, newText: string) => {
        const historyUpToIndex = messages.slice(0, index);
        const userMessageToResend: ChatMessage = { author: MessageAuthor.USER, text: newText };
        setMessages([...historyUpToIndex, userMessageToResend]);

        setIsLoading(true);
        try {
            const response = await apiService.continueConversation({
                prompt: newText,
                history: historyUpToIndex,
                context: { activeProfileId }
            });
            if (response.text?.includes("created a new style profile")) {
                const fetchedProfiles = await apiService.getProfiles();
                setProfiles(fetchedProfiles);
            }
            setMessages([...historyUpToIndex, userMessageToResend, response]);
            await refreshUsage();
        } catch (error) {
            const errorMessage: ChatMessage = {
                author: MessageAuthor.SYSTEM,
                text: error instanceof Error ? error.message : "An unknown error occurred."
            };
            setMessages([...historyUpToIndex, userMessageToResend, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnectIntegration = async (integration: IntegrationName) => {
        try {
            await apiService.disconnectIntegration(integration);
            // Refresh auth state to update the UI
            await refreshAuthState();
            setMessages(prev => [...prev, {
                author: MessageAuthor.SYSTEM,
                text: `${integration.charAt(0).toUpperCase() + integration.slice(1)} has been disconnected.`
            }]);
        } catch (error) {
             const errorMessage: ChatMessage = {
                author: MessageAuthor.SYSTEM,
                text: error instanceof Error ? error.message : `Failed to disconnect ${integration}.`
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    const handleStartTrial = async (planId: string) => {
        if (!authState.isAuthenticated) {
            setAuthModalOpen(true);
            return;
        }

        setBillingActionLoading(true);
        try {
            await apiService.startTrial(planId, activeOrganizationId ?? undefined);
            await refreshAuthState();
            await refreshUsage();
            setMessages(prev => [...prev, {
                author: MessageAuthor.SYSTEM,
                text: 'Your Pro trial is now active. Enjoy extended writing capacity and workflow automations!'
            }]);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to start trial.';
            setMessages(prev => [...prev, { author: MessageAuthor.SYSTEM, text: message }]);
        } finally {
            setBillingActionLoading(false);
        }
    };

    const handleUpgradePlan = async (planId: string, cadence: 'monthly' | 'yearly') => {
        if (!authState.isAuthenticated) {
            setAuthModalOpen(true);
            return;
        }

        setBillingActionLoading(true);
        try {
            const { checkoutUrl } = await apiService.createCheckoutSession(planId, cadence, activeOrganizationId ?? undefined);
            window.open(checkoutUrl, '_blank', 'noopener');
            setMessages(prev => [...prev, {
                author: MessageAuthor.SYSTEM,
                text: 'We opened a secure checkout tab so you can finalize the upgrade.'
            }]);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to start checkout session.';
            setMessages(prev => [...prev, { author: MessageAuthor.SYSTEM, text: message }]);
        } finally {
            setBillingActionLoading(false);
        }
    };

    const handleOpenPortal = async () => {
        if (!authState.isAuthenticated) {
            setAuthModalOpen(true);
            return;
        }

        setBillingActionLoading(true);
        try {
            const { url } = await apiService.openBillingPortal(activeOrganizationId ?? undefined);
            window.open(url, '_blank', 'noopener');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to open billing portal.';
            setMessages(prev => [...prev, { author: MessageAuthor.SYSTEM, text: message }]);
        } finally {
            setBillingActionLoading(false);
        }
    };

    const handleOrganizationChange = async (organizationId: string) => {
        try {
            await apiService.setActiveOrganization(organizationId);
            setActiveOrganizationId(organizationId);
            const nextAuth = await refreshAuthState();
            if (nextAuth.usage) {
                setUsageSnapshot(nextAuth.usage);
            } else {
                await refreshUsage();
            }
        } catch (error) {
            console.error('Failed to switch organization', error);
        }
    };

    const activeOrganization = organizations.find(org => org.organization.id === activeOrganizationId) ?? organizations[0];

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
                        isLoading={isLoading && authState.isAuthenticated}
                    />
                }
            >
                <div className="mx-auto flex h-full w-full max-w-5xl flex-1 flex-col gap-6 px-6 sm:px-10">
                    <div className="flex-1 overflow-hidden">
                        <div className="flex h-full flex-col rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_32px_60px_rgba(8,15,35,0.55)] backdrop-blur">
                            <ChatView messages={messages} isLoading={isLoading} onEditMessage={handleEditMessage} />
                        </div>
                    </div>
                    <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
                </div>
            </AppShell>
            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setProfileModalOpen(false)}
                onCreate={handleCreateProfile}
                isLoading={isLoading}
                authState={authState}
            />
            {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />}
        </>
    );
};

export default HomePage;
