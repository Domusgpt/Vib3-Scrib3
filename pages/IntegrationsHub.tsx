import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ConsoleScaffold from '../components/console/ConsoleScaffold';
import WorkspaceSummaryBar from '../components/dashboard/WorkspaceSummaryBar';
import IntegrationSummaryGrid from '../components/integrations/IntegrationSummaryGrid';
import NotificationBanner from '../components/workspace/NotificationBanner';
import { IntegrationName, IntegrationSummary } from '../types';
import * as apiService from '../services/apiService';
import { useConsolePageState } from '../hooks/useConsolePageState';
import { useGuardedHandlers } from '../hooks/useGuardedHandlers';

const INTEGRATIONS_AUTH_PROMPT = 'Sign in to manage integrations.';

const IntegrationsHub: React.FC = () => {
    const [integrationSummaries, setIntegrationSummaries] = useState<IntegrationSummary[]>([]);
    const [isOverviewLoading, setOverviewLoading] = useState(false);
    const [overviewError, setOverviewError] = useState<string | null>(null);
    const [pendingIntegration, setPendingIntegration] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<'connect' | 'disconnect' | 'sync' | null>(null);
    const [banner, setBanner] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);
    const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
    const [isSeedingSandbox, setSeedingSandbox] = useState(false);

    const handleRequireAuth = useCallback(() => {
        setBanner(current => {
            if (current?.type === 'info' && current.message === INTEGRATIONS_AUTH_PROMPT) {
                return current;
            }
            return { type: 'info', message: INTEGRATIONS_AUTH_PROMPT };
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

    const loadOverview = useCallback(async () => {
        if (!authState.isAuthenticated) {
            setIntegrationSummaries([]);
            return;
        }
        setOverviewLoading(true);
        setOverviewError(null);
        try {
            const { integrations, generatedAt } = await apiService.getIntegrationOverview();
            setIntegrationSummaries(integrations);
            setLastGeneratedAt(generatedAt);
        } catch (error) {
            console.error('Failed to load integration overview', error);
            setOverviewError(error instanceof Error ? error.message : 'Unable to load integration overview.');
        } finally {
            setOverviewLoading(false);
        }
    }, [authState.isAuthenticated]);

    useEffect(() => {
        if (!isBootstrapping) {
            loadOverview();
        }
    }, [isBootstrapping, loadOverview]);

    const handleConnect = (integration: IntegrationSummary) => {
        if (integration.status === 'coming_soon') {
            window.open(integration.connectPath, '_blank', 'noopener');
            return;
        }
        setPendingIntegration(integration.name);
        setPendingAction('connect');
        window.location.href = integration.connectPath;
    };

    const disconnectIntegrationAction = useCallback(
        async (integration: IntegrationSummary | IntegrationName) => {
            const summary =
                typeof integration === 'string'
                    ? integrationSummaries.find(item => item.name === integration)
                    : integration;
            if (!summary) {
                return;
            }

            setPendingIntegration(summary.name);
            setPendingAction('disconnect');
            try {
                await apiService.disconnectIntegration(summary.name);
                await refreshAuthState();
                await loadOverview();
                setBanner({ type: 'success', message: `${summary.title} was disconnected.` });
            } catch (error) {
                setBanner({
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Failed to disconnect integration.',
                });
            } finally {
                setPendingIntegration(null);
                setPendingAction(null);
            }
        },
        [integrationSummaries, loadOverview, refreshAuthState],
    );

    const syncIntegration = useCallback(
        async (integration: IntegrationSummary) => {
            if (integration.name === 'messages') {
                return;
            }
            const source = integration.name === 'google' ? 'gmail' : 'facebook';
            setPendingIntegration(integration.name);
            setPendingAction('sync');
            try {
                const result = await apiService.getSampleCount(source);
                setBanner({
                    type: 'success',
                    message: `Triggered a sync for ${integration.title}. ${result.count} samples currently indexed.`,
                });
                await loadOverview();
            } catch (error) {
                setBanner({
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Unable to refresh samples.',
                });
            } finally {
                setPendingIntegration(null);
                setPendingAction(null);
            }
        },
        [loadOverview],
    );

    const selectProfileForHub = useCallback(
        async (id: string) => {
            await selectProfile(id);
            const name = profiles.find(profile => profile.id === id)?.name ?? 'profile';
            setBanner({ type: 'info', message: `Active style updated to ${name}.` });
        },
        [profiles, selectProfile],
    );

    const handleProfileCreate = () => {
        setBanner({ type: 'info', message: 'Create new style profiles from the Composer workspace.' });
    };

    const handleStartTrial = async (planId: string) => {
        const result = await startTrial(planId);
        if (result.status === 'requires-auth') {
            return;
        }
        if (result.status === 'error') {
            setBanner({ type: 'error', message: result.message });
            return;
        }
        setBanner({ type: 'success', message: 'Trial activated. Enjoy the expanded automation capacity.' });
    };

    const handleUpgradePlan = async (planId: string, cadence: 'monthly' | 'yearly') => {
        const result = await upgradePlan(planId, cadence);
        if (result.status === 'requires-auth') {
            return;
        }
        if (result.status === 'error') {
            setBanner({ type: 'error', message: result.message });
            return;
        }
        const checkoutUrl = result.data?.checkoutUrl;
        if (checkoutUrl) {
            window.open(checkoutUrl, '_blank', 'noopener');
            setBanner({ type: 'info', message: 'Checkout opened in a new tab.' });
        }
    };

    const handleOpenPortal = async () => {
        const result = await openPortal();
        if (result.status === 'requires-auth') {
            return;
        }
        if (result.status === 'error') {
            setBanner({ type: 'error', message: result.message });
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
        async (organizationId: string) => {
            try {
                await switchOrganization(organizationId);
                await loadOverview();
            } catch (error) {
                setBanner({
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Unable to switch workspace.',
                });
            }
        },
        [loadOverview, switchOrganization],
    );

    const seedSandbox = useCallback(
        async () => {
            if (!activeOrganization) {
                return;
            }
            const organizationId = activeOrganization.organization.id;
            setSeedingSandbox(true);
            try {
                const result = await apiService.seedSandboxData(organizationId);
                setLastGeneratedAt(result.seededAt);
                await refreshAuthState();
                await refreshUsage(organizationId);
                await loadOverview();
                setBanner({
                    type: 'success',
                    message: `Demo signals refreshed for ${result.membersSeeded} members and ${result.usageRecordsCreated} months of activity.`,
                });
            } catch (error) {
                setBanner({
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Unable to generate sandbox data.',
                });
            } finally {
                setSeedingSandbox(false);
            }
        },
        [
            activeOrganization,
            loadOverview,
            refreshAuthState,
            refreshUsage,
        ],
    );

    const guardableHandlers = useMemo(
        () => ({
            disconnectIntegration: disconnectIntegrationAction,
            syncIntegration,
            selectProfileForHub,
            changeOrganization,
            seedSandbox,
        }),
        [
            changeOrganization,
            disconnectIntegrationAction,
            seedSandbox,
            selectProfileForHub,
            syncIntegration,
        ],
    );

    const {
        disconnectIntegration: handleDisconnectIntegration,
        syncIntegration: handleSync,
        selectProfileForHub: handleProfileSelect,
        changeOrganization: handleOrganizationChange,
        seedSandbox: handleSeedSandbox,
    } = useGuardedHandlers(guardWithAuth, guardableHandlers);

    const sandboxSeededAt = useMemo(() => {
        const metadata = (activeOrganization?.organization.metadata ?? {}) as Record<string, unknown>;
        const seeded = metadata['sandboxSeededAt'];
        return typeof seeded === 'string' ? seeded : null;
    }, [activeOrganization]);

    const canGenerateSandbox = useMemo(
        () => Boolean(activeOrganization && ['owner', 'admin'].includes(activeOrganization.membership.role)),
        [activeOrganization],
    );

    const connectedCount = useMemo(
        () => integrationSummaries.filter(integration => integration.connected).length,
        [integrationSummaries],
    );

    const actionableCount = useMemo(
        () => integrationSummaries.filter(integration => integration.status === 'action_required').length,
        [integrationSummaries],
    );

    const totalSamples = useMemo(
        () => integrationSummaries.reduce((sum, integration) => sum + (integration.sampleCount ?? 0), 0),
        [integrationSummaries],
    );

    const headerContent = (
        <div className="space-y-6">
            <WorkspaceSummaryBar organization={activeOrganization} usage={usageSnapshot} isLoading={isBootstrapping} />
            <div className="grid gap-4 sm:grid-cols-3">
                <SummaryStat label="Connected" value={connectedCount} />
                <SummaryStat label="Actions needed" value={actionableCount} highlight={actionableCount > 0} />
                <SummaryStat label="Samples indexed" value={totalSamples} />
            </div>
            {lastGeneratedAt && (
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                    Overview refreshed {new Date(lastGeneratedAt).toLocaleString()}
                </p>
            )}
        </div>
    );

    const eyebrow = 'Integration Hub';
    const title = 'Connect every signal to teach Vib3 Scribe';
    const description = 'Link email, social, and upcoming messaging channels to unify tone, accelerate onboarding, and power downstream automations.';

    return (
        <ConsoleScaffold
            state={consoleState}
            eyebrow={eyebrow}
            title={title}
            description={description}
            headerContent={headerContent}
            sidebarOverrides={{
                onProfileSelect: handleProfileSelect,
                onProfileCreate: handleProfileCreate,
                onLogout: handleLogout,
                onDisconnect: handleDisconnectIntegration,
                onStartTrial: handleStartTrial,
                onUpgrade: handleUpgradePlan,
                onOpenPortal: handleOpenPortal,
                onOrganizationChange: handleOrganizationChange,
            }}
        >
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 sm:px-10">
                {bootstrapError && <NotificationBanner type="error" message={bootstrapError} />}
                {banner && (
                    <NotificationBanner
                        type={banner.type}
                        message={banner.message}
                        onDismiss={() => setBanner(null)}
                    />
                )}
                {overviewError && (
                    <NotificationBanner type="error" message={overviewError} onDismiss={() => setOverviewError(null)} />
                )}
                {activeOrganization && (
                    <SandboxCallout
                        seededAt={sandboxSeededAt}
                        onGenerate={handleSeedSandbox}
                        isGenerating={isSeedingSandbox}
                        canGenerate={canGenerateSandbox}
                    />
                )}
                <div className={`rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_32px_60px_rgba(8,15,35,0.55)] backdrop-blur ${isOverviewLoading ? 'animate-pulse' : ''}`}>
                    <IntegrationSummaryGrid
                        integrations={integrationSummaries}
                        onConnect={handleConnect}
                        onDisconnect={handleDisconnectIntegration}
                        onSync={handleSync}
                        pendingIntegration={pendingIntegration}
                        pendingAction={pendingAction ?? undefined}
                    />
                    {integrationSummaries.length === 0 && !isOverviewLoading && (
                        <p className="mt-6 text-center text-sm text-slate-400">
                            No integrations yet. Connect Gmail or Facebook to start training the corpus.
                        </p>
                    )}
                </div>
            </div>
        </ConsoleScaffold>
    );
};

const SandboxCallout: React.FC<{
    seededAt: string | null;
    onGenerate: () => void;
    isGenerating: boolean;
    canGenerate: boolean;
}> = ({ seededAt, onGenerate, isGenerating, canGenerate }) => {
    const actionLabel = seededAt ? 'Regenerate' : 'Generate';
    return (
        <section className="rounded-[26px] border border-indigo-400/40 bg-indigo-500/10 p-6 text-indigo-50 shadow-[0_24px_45px_rgba(13,16,48,0.45)] backdrop-blur">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-indigo-100/80">Demo mode</p>
                    <h4 className="text-xl font-semibold text-white">Populate this workspace with realistic sample signals.</h4>
                    <p className="text-sm text-indigo-100/80">
                        Spin up mock integrations, multi-month usage history, and audit telemetry for sales demos without live credentials.
                        {seededAt && ` Last generated ${new Date(seededAt).toLocaleString()}.`}
                    </p>
                    {!canGenerate && (
                        <p className="text-xs uppercase tracking-[0.35em] text-indigo-100/60">
                            Only owners and admins can refresh sandbox data.
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onGenerate}
                    disabled={!canGenerate || isGenerating}
                    className="inline-flex min-w-[12rem] items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isGenerating ? 'Seeding…' : `${actionLabel} demo data`}
                </button>
            </div>
        </section>
    );
};

const SummaryStat: React.FC<{ label: string; value: number; highlight?: boolean }> = ({ label, value, highlight }) => {
    return (
        <div className={`rounded-3xl border border-white/10 bg-slate-950/50 px-5 py-4 text-slate-100 shadow-[0_18px_30px_rgba(8,15,35,0.45)] ${highlight ? 'border-amber-400/40 bg-amber-500/10 text-amber-100' : ''}`}>
            <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
    );
};

export default IntegrationsHub;

