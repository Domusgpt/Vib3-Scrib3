import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ConsoleScaffold from '../components/console/ConsoleScaffold';
import WorkspaceSummaryBar from '../components/dashboard/WorkspaceSummaryBar';
import NotificationBanner from '../components/workspace/NotificationBanner';
import InsightsSummaryGrid from '../components/insights/InsightsSummaryGrid';
import UsageTrendCard from '../components/insights/UsageTrendCard';
import IncidentTimeline from '../components/insights/IncidentTimeline';
import RecommendationsPanel from '../components/insights/RecommendationsPanel';
import { IncidentInsight, IntegrationName, UsageTrendPoint, WorkspacePulse } from '../types';
import * as apiService from '../services/apiService';
import { useConsolePageState } from '../hooks/useConsolePageState';
import { useGuardedHandlers } from '../hooks/useGuardedHandlers';

const INSIGHTS_AUTH_PROMPT = 'Sign in to explore workspace insights.';

const InsightsCenter: React.FC = () => {
    const [pulse, setPulse] = useState<WorkspacePulse | null>(null);
    const [trend, setTrend] = useState<UsageTrendPoint[]>([]);
    const [incidents, setIncidents] = useState<IncidentInsight[]>([]);
    const [banner, setBanner] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);
    const [isPulseLoading, setPulseLoading] = useState(false);
    const [isTrendLoading, setTrendLoading] = useState(false);
    const [isIncidentLoading, setIncidentLoading] = useState(false);
    const [isRefreshing, setRefreshing] = useState(false);

    const handleRequireAuth = useCallback(() => {
        setBanner(current => {
            if (current?.type === 'info' && current.message === INSIGHTS_AUTH_PROMPT) {
                return current;
            }
            return { type: 'info', message: INSIGHTS_AUTH_PROMPT };
        });
    }, [setBanner]);

    const consoleState = useConsolePageState({ autoOpenAuthModal: true, onRequireAuth: handleRequireAuth });

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
        refreshAuthState,
        refreshUsage,
        selectProfile,
        switchOrganization,
        error: bootstrapError,
        logout,
        billingActions,
        guardWithAuth,
    } = consoleState;
    const { isLoading: isBillingActionLoading, startTrial, upgradePlan, openPortal } = billingActions;

    const organizationId = activeOrganization?.organization.id;

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

    const disconnectIntegration = useCallback(
        async (integration: IntegrationName) => {
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
        },
        [loadAll, organizationId, refreshAuthState],
    );

    const selectProfileForInsights = useCallback(
        async (id: string) => {
            await selectProfile(id);
            const profileName = profiles.find(profile => profile.id === id)?.name ?? 'profile';
            setBanner({ type: 'info', message: `Active style updated to ${profileName}.` });
        },
        [profiles, selectProfile],
    );

    const handleProfileCreate = () => {
        setBanner({ type: 'info', message: 'Create new style profiles from the Composer workspace.' });
    };

    const handleStartTrial = async (planId: string) => {
        const result = await startTrial(planId, { organizationId });
        if (result.status === 'requires-auth') {
            return;
        }
        if (result.status === 'error') {
            setBanner({
                type: 'error',
                message: result.message,
            });
            return;
        }
        setBanner({ type: 'success', message: 'Trial activated successfully.' });
    };

    const handleUpgradePlan = async (planId: string, cadence: 'monthly' | 'yearly') => {
        const result = await upgradePlan(planId, cadence, { organizationId });
        if (result.status === 'requires-auth') {
            return;
        }
        if (result.status === 'error') {
            setBanner({
                type: 'error',
                message: result.message,
            });
            return;
        }
        const checkoutUrl = result.data?.checkoutUrl;
        if (checkoutUrl) {
            window.open(checkoutUrl, '_blank', 'noopener');
            setBanner({ type: 'info', message: 'Checkout opened in a new tab.' });
        }
    };

    const handleOpenPortal = async () => {
        const result = await openPortal({ organizationId });
        if (result.status === 'requires-auth') {
            return;
        }
        if (result.status === 'error') {
            setBanner({
                type: 'error',
                message: result.message,
            });
            return;
        }
        const portalUrl = result.data?.url;
        if (portalUrl) {
            window.open(portalUrl, '_blank', 'noopener');
        }
    };

    const handleLogout = async () => {
        await logout();
        setBanner({ type: 'info', message: 'You have been signed out.' });
    };

    const changeOrganization = useCallback(
        async (id: string) => {
            try {
                await switchOrganization(id);
                await loadAll(id);
            } catch (error) {
                setBanner({
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Unable to switch workspace.',
                });
            }
        },
        [loadAll, switchOrganization],
    );

    const guardableHandlers = useMemo(
        () => ({
            disconnectIntegration,
            selectProfileForInsights,
            changeOrganization,
        }),
        [changeOrganization, disconnectIntegration, selectProfileForInsights],
    );

    const {
        disconnectIntegration: handleDisconnect,
        selectProfileForInsights: handleProfileSelect,
        changeOrganization: handleOrganizationChange,
    } = useGuardedHandlers(guardWithAuth, guardableHandlers);

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
        <ConsoleScaffold
            state={consoleState}
            eyebrow="Command Deck"
            title="Operations Insights"
            description="Monitor automation health, channel coverage, and usage in one glassmorphic console."
            actions={actions}
            headerContent={null}
            sidebarOverrides={{
                onProfileSelect: handleProfileSelect,
                onProfileCreate: handleProfileCreate,
                onLogout: handleLogout,
                onDisconnect: handleDisconnect,
                onStartTrial: handleStartTrial,
                onUpgrade: handleUpgradePlan,
                onOpenPortal: handleOpenPortal,
                onOrganizationChange: handleOrganizationChange,
            }}
        >
            <div className="space-y-8 px-6 sm:px-10">
                {bootstrapError && <NotificationBanner type="error" message={bootstrapError} />}
                {banner && (
                    <NotificationBanner type={banner.type} message={banner.message} onDismiss={() => setBanner(null)} />
                )}

                <WorkspaceSummaryBar
                    organization={activeOrganization}
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
        </ConsoleScaffold>
    );
};

export default InsightsCenter;
