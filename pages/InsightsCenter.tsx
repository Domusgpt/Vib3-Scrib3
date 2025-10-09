import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import AppShell from '../components/layout/AppShell';
import WorkspaceSummaryBar from '../components/dashboard/WorkspaceSummaryBar';
import NotificationBanner from '../components/workspace/NotificationBanner';
import AuthModal from '../components/AuthModal';
import InsightsSummaryGrid from '../components/insights/InsightsSummaryGrid';
import UsageTrendCard from '../components/insights/UsageTrendCard';
import IncidentTimeline from '../components/insights/IncidentTimeline';
import RecommendationsPanel from '../components/insights/RecommendationsPanel';
import { IncidentInsight, IntegrationName, UsageTrendPoint, WorkspacePulse } from '../types';
import * as apiService from '../services/apiService';
import { useConsoleBootstrap } from '../hooks/useConsoleBootstrap';

const InsightsCenter: React.FC = () => {
    const {
        authState,
        billingPlans,
        usageSnapshot,
        organizations,
        activeOrganizationId,
        profiles,
        activeProfileId,
        isBootstrapping,
        initialize,
        refreshAuthState,
        refreshUsage,
        selectProfile,
        switchOrganization,
        error: bootstrapError,
    } = useConsoleBootstrap();

    const [pulse, setPulse] = useState<WorkspacePulse | null>(null);
    const [trend, setTrend] = useState<UsageTrendPoint[]>([]);
    const [incidents, setIncidents] = useState<IncidentInsight[]>([]);
    const [banner, setBanner] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);
    const [isPulseLoading, setPulseLoading] = useState(false);
    const [isTrendLoading, setTrendLoading] = useState(false);
    const [isIncidentLoading, setIncidentLoading] = useState(false);
    const [isRefreshing, setRefreshing] = useState(false);
    const [isBillingActionLoading, setBillingActionLoading] = useState(false);
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);

    const organizationId = activeOrganizationId ?? organizations[0]?.organization.id;

    const loadPulse = useCallback(
        async (orgId?: string) => {
            if (!authState.isAuthenticated) {
                setPulse(null);
                return;
            }
            setPulseLoading(true);
            try {
                const result = await apiService.getWorkspacePulse(orgId);
                setPulse(result);
            } catch (error) {
                console.error('Failed to load workspace pulse', error);
                setBanner({
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Unable to load workspace insights.',
                });
            } finally {
                setPulseLoading(false);
            }
        },
        [authState.isAuthenticated],
    );

    const loadTrend = useCallback(
        async (orgId?: string) => {
            if (!authState.isAuthenticated) {
                setTrend([]);
                return;
            }
            setTrendLoading(true);
            try {
                const result = await apiService.getUsageTrend(orgId, 6);
                setTrend(result);
            } catch (error) {
                console.error('Failed to load usage trend', error);
                setBanner({
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Unable to load usage trend.',
                });
            } finally {
                setTrendLoading(false);
            }
        },
        [authState.isAuthenticated],
    );

    const loadIncidents = useCallback(
        async (orgId?: string) => {
            if (!authState.isAuthenticated) {
                setIncidents([]);
                return;
            }
            setIncidentLoading(true);
            try {
                const result = await apiService.getIncidentFeed(orgId, 8);
                setIncidents(result);
            } catch (error) {
                console.error('Failed to load incidents', error);
                setBanner({
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Unable to load incident feed.',
                });
            } finally {
                setIncidentLoading(false);
            }
        },
        [authState.isAuthenticated],
    );

    const loadAll = useCallback(
        async (orgId?: string) => {
            if (!authState.isAuthenticated) {
                return;
            }
            setRefreshing(true);
            try {
                await Promise.all([loadPulse(orgId), loadTrend(orgId), loadIncidents(orgId)]);
                await refreshUsage(orgId);
            } finally {
                setRefreshing(false);
            }
        },
        [authState.isAuthenticated, loadIncidents, loadPulse, loadTrend, refreshUsage],
    );

    useEffect(() => {
        if (isBootstrapping) {
            return;
        }
        if (!authState.isAuthenticated) {
            setPulse(null);
            setTrend([]);
            setIncidents([]);
            return;
        }
        void loadAll(organizationId);
    }, [authState.isAuthenticated, isBootstrapping, loadAll, organizationId]);

    const handleDisconnect = async (integration: IntegrationName) => {
        try {
            await apiService.disconnectIntegration(integration);
            await refreshAuthState();
            await loadAll(organizationId);
            const label = integration.charAt(0).toUpperCase() + integration.slice(1);
            setBanner({ type: 'success', message: `${label} disconnected.` });
        } catch (error) {
            setBanner({
                type: 'error',
                message: error instanceof Error ? error.message : 'Failed to disconnect integration.',
            });
        }
    };

    const handleProfileSelect = async (id: string) => {
        await selectProfile(id);
        const profileName = profiles.find(profile => profile.id === id)?.name ?? 'profile';
        setBanner({ type: 'info', message: `Active style updated to ${profileName}.` });
    };

    const handleProfileCreate = () => {
        setBanner({ type: 'info', message: 'Create new style profiles from the Composer workspace.' });
    };

    const handleStartTrial = async (planId: string) => {
        if (!authState.isAuthenticated) {
            setAuthModalOpen(true);
            return;
        }
        setBillingActionLoading(true);
        try {
            await apiService.startTrial(planId, organizationId);
            await refreshAuthState();
            await refreshUsage(organizationId);
            setBanner({ type: 'success', message: 'Trial activated successfully.' });
        } catch (error) {
            setBanner({
                type: 'error',
                message: error instanceof Error ? error.message : 'Unable to start trial.',
            });
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
            const { checkoutUrl } = await apiService.createCheckoutSession(planId, cadence, organizationId);
            window.open(checkoutUrl, '_blank', 'noopener');
            setBanner({ type: 'info', message: 'Checkout opened in a new tab.' });
        } catch (error) {
            setBanner({
                type: 'error',
                message: error instanceof Error ? error.message : 'Unable to start checkout session.',
            });
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
            const { url } = await apiService.openBillingPortal(organizationId);
            window.open(url, '_blank', 'noopener');
        } catch (error) {
            setBanner({
                type: 'error',
                message: error instanceof Error ? error.message : 'Unable to open billing portal.',
            });
        } finally {
            setBillingActionLoading(false);
        }
    };

    const handleLogout = async () => {
        await apiService.logout();
        await initialize();
        setBanner({ type: 'info', message: 'You have been signed out.' });
    };

    const handleOrganizationChange = async (id: string) => {
        await switchOrganization(id);
        await loadAll(id);
    };

    const actions = useMemo(
        () => (
            <button
                onClick={() => loadAll(organizationId)}
                disabled={isRefreshing || isPulseLoading || isTrendLoading || isIncidentLoading}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-100 transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
            >
                {isRefreshing || isPulseLoading || isTrendLoading || isIncidentLoading ? 'Refreshing' : 'Refresh Signals'}
            </button>
        ),
        [isIncidentLoading, isPulseLoading, isRefreshing, isTrendLoading, loadAll, organizationId],
    );

    return (
        <AppShell
            sidebar={
                <Sidebar
                    authState={authState}
                    profiles={profiles}
                    activeProfileId={activeProfileId}
                    onProfileSelect={handleProfileSelect}
                    onProfileCreate={handleProfileCreate}
                    onLogout={handleLogout}
                    onDisconnect={handleDisconnect}
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
            eyebrow="Command Deck"
            title="Operations Insights"
            description="Monitor automation health, channel coverage, and usage in one glassmorphic console."
            actions={actions}
        >
            <div className="space-y-8 px-6 sm:px-10">
                {bootstrapError && <NotificationBanner type="error" message={bootstrapError} />}
                {banner && <NotificationBanner type={banner.type} message={banner.message} onDismiss={() => setBanner(null)} />}

                <WorkspaceSummaryBar
                    organization={organizations.find(org => org.organization.id === organizationId)}
                    usage={usageSnapshot}
                    isLoading={isBootstrapping}
                />

                <InsightsSummaryGrid pulse={pulse} isLoading={isPulseLoading || isBootstrapping} />

                <div className="grid gap-6 lg:grid-cols-2">
                    <UsageTrendCard data={trend} isLoading={isTrendLoading || isBootstrapping} />
                    <RecommendationsPanel
                        recommendations={pulse?.recommendations ?? []}
                        isLoading={isPulseLoading || isBootstrapping}
                    />
                </div>

                <IncidentTimeline incidents={incidents} isLoading={isIncidentLoading || isBootstrapping} />
            </div>

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
        </AppShell>
    );
};

export default InsightsCenter;
