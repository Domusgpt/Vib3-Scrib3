import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import AppShell from '../components/layout/AppShell';
import WorkspaceSummaryBar from '../components/dashboard/WorkspaceSummaryBar';
import IntegrationSummaryGrid from '../components/integrations/IntegrationSummaryGrid';
import NotificationBanner from '../components/workspace/NotificationBanner';
import AuthModal from '../components/AuthModal';
import { IntegrationName, IntegrationSummary } from '../types';
import * as apiService from '../services/apiService';
import { useConsoleBootstrap } from '../hooks/useConsoleBootstrap';

const IntegrationsHub: React.FC = () => {
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

    const [integrationSummaries, setIntegrationSummaries] = useState<IntegrationSummary[]>([]);
    const [isOverviewLoading, setOverviewLoading] = useState(false);
    const [overviewError, setOverviewError] = useState<string | null>(null);
    const [pendingIntegration, setPendingIntegration] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<'connect' | 'disconnect' | 'sync' | null>(null);
    const [banner, setBanner] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);
    const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);
    const [isBillingActionLoading, setBillingActionLoading] = useState(false);
    const [isSeedingSandbox, setSeedingSandbox] = useState(false);

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

    const disconnectIntegration = async (integration: IntegrationSummary | IntegrationName) => {
        const summary = typeof integration === 'string'
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
            setBanner({ type: 'error', message: error instanceof Error ? error.message : 'Failed to disconnect integration.' });
        } finally {
            setPendingIntegration(null);
            setPendingAction(null);
        }
    };

    const handleSync = async (integration: IntegrationSummary) => {
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
            setBanner({ type: 'error', message: error instanceof Error ? error.message : 'Unable to refresh samples.' });
        } finally {
            setPendingIntegration(null);
            setPendingAction(null);
        }
    };

    const handleProfileSelect = async (id: string) => {
        await selectProfile(id);
        const name = profiles.find(profile => profile.id === id)?.name ?? 'profile';
        setBanner({ type: 'info', message: `Active style updated to ${name}.` });
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
            await apiService.startTrial(planId, activeOrganizationId ?? undefined);
            await refreshAuthState();
            await refreshUsage(activeOrganizationId ?? undefined);
            setBanner({ type: 'success', message: 'Trial activated. Enjoy the expanded automation capacity.' });
        } catch (error) {
            setBanner({ type: 'error', message: error instanceof Error ? error.message : 'Unable to start trial.' });
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
            setBanner({ type: 'info', message: 'Checkout opened in a new tab.' });
        } catch (error) {
            setBanner({ type: 'error', message: error instanceof Error ? error.message : 'Unable to start checkout session.' });
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
            setBanner({ type: 'error', message: error instanceof Error ? error.message : 'Unable to open billing portal.' });
        } finally {
            setBillingActionLoading(false);
        }
    };

    const handleLogout = async () => {
        await apiService.logout();
        await initialize();
        setBanner({ type: 'info', message: 'You have been signed out.' });
    };

    const handleOrganizationChange = async (organizationId: string) => {
        await switchOrganization(organizationId);
        await loadOverview();
    };

    const handleSeedSandbox = async () => {
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
    };

    const activeOrganization = useMemo(
        () => organizations.find(org => org.organization.id === activeOrganizationId) ?? organizations[0],
        [activeOrganizationId, organizations],
    );

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
        <>
            <AppShell
                sidebar={
                    <Sidebar
                        authState={authState}
                        profiles={profiles}
                        activeProfileId={activeProfileId}
                        onProfileSelect={handleProfileSelect}
                        onProfileCreate={handleProfileCreate}
                        onLogout={handleLogout}
                        onDisconnect={disconnectIntegration}
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
                eyebrow={eyebrow}
                title={title}
                description={description}
                headerContent={headerContent}
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
                    {overviewError && <NotificationBanner type="error" message={overviewError} onDismiss={() => setOverviewError(null)} />}
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
                            onDisconnect={disconnectIntegration}
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
            </AppShell>
            {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />}
        </>
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

