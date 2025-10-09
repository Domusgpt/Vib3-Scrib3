import React from 'react';
import { IntegrationSummary, IntegrationHealthStatus } from '../../types';
import { CheckCircleIcon, GmailIcon, FacebookIcon, MessageIcon, LightningBoltIcon, XMarkIcon } from '../icons';

interface IntegrationSummaryGridProps {
    integrations: IntegrationSummary[];
    onConnect: (integration: IntegrationSummary) => void;
    onDisconnect: (integration: IntegrationSummary) => void;
    onSync: (integration: IntegrationSummary) => void;
    pendingIntegration?: string | null;
    pendingAction?: 'connect' | 'disconnect' | 'sync';
}

const statusStyles: Record<IntegrationHealthStatus, { label: string; className: string }> = {
    connected: {
        label: 'Connected',
        className: 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30',
    },
    action_required: {
        label: 'Action required',
        className: 'bg-amber-500/15 text-amber-200 border border-amber-400/30',
    },
    disconnected: {
        label: 'Disconnected',
        className: 'bg-rose-500/15 text-rose-200 border border-rose-400/30',
    },
    coming_soon: {
        label: 'Coming soon',
        className: 'bg-indigo-500/15 text-indigo-200 border border-indigo-400/30',
    },
};

const IntegrationSummaryGrid: React.FC<IntegrationSummaryGridProps> = ({
    integrations,
    onConnect,
    onDisconnect,
    onSync,
    pendingIntegration,
    pendingAction,
}) => {
    return (
        <div className="grid gap-6 xl:grid-cols-3 lg:grid-cols-2">
            {integrations.map(integration => (
                <IntegrationCard
                    key={integration.name}
                    integration={integration}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                    onSync={onSync}
                    isPending={pendingIntegration === integration.name ? pendingAction : undefined}
                />
            ))}
        </div>
    );
};

const IntegrationCard: React.FC<{
    integration: IntegrationSummary;
    onConnect: (integration: IntegrationSummary) => void;
    onDisconnect: (integration: IntegrationSummary) => void;
    onSync: (integration: IntegrationSummary) => void;
    isPending?: 'connect' | 'disconnect' | 'sync';
}> = ({ integration, onConnect, onDisconnect, onSync, isPending }) => {
    const Icon = getIntegrationIcon(integration.name);
    const statusStyle = statusStyles[integration.status];
    const isComingSoon = integration.status === 'coming_soon';
    const canDisconnect = integration.connected && integration.status !== 'coming_soon';
    const canSync = integration.connected && integration.status !== 'coming_soon';

    const primaryLabel = getPrimaryLabel(integration);
    const primaryAction = () => {
        if (isComingSoon) {
            window.open(integration.connectPath, '_blank', 'noopener');
            return;
        }

        if (integration.connected && integration.status === 'connected') {
            onSync(integration);
            return;
        }

        if (integration.connected && integration.status === 'action_required') {
            onConnect(integration);
            return;
        }

        onConnect(integration);
    };

    const secondaryLabel = canDisconnect ? 'Disconnect' : 'View docs';
    const secondaryAction = () => {
        if (canDisconnect) {
            onDisconnect(integration);
        } else {
            window.open(integration.docsUrl, '_blank', 'noopener');
        }
    };

    const isPrimaryPending = isPending === 'connect' || (isPending === 'sync' && integration.status === 'connected');
    const isSecondaryPending = isPending === 'disconnect';

    return (
        <article className="flex h-full flex-col justify-between rounded-[26px] border border-white/10 bg-white/5 p-6 shadow-[0_24px_40px_rgba(8,15,35,0.45)] backdrop-blur">
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-indigo-200">
                            <Icon className="h-6 w-6" />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-semibold text-white">{integration.title}</h3>
                                {integration.beta && (
                                    <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.35em] text-indigo-100">
                                        Beta
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">{integration.categories.join(' · ')}</p>
                        </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] ${statusStyle.className}`}>
                        {integration.status === 'connected' && <CheckCircleIcon className="h-4 w-4" />}
                        {integration.status === 'action_required' && <LightningBoltIcon className="h-4 w-4" />}
                        {integration.status === 'disconnected' && <XMarkIcon className="h-4 w-4" />}
                        {integration.status === 'coming_soon' && <LightningBoltIcon className="h-4 w-4" />}
                        {statusStyle.label}
                    </span>
                </div>
                <p className="text-sm text-slate-300">{integration.description}</p>
                <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Status</span>
                        <span>{integration.statusMessage}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Samples</span>
                        <span>{typeof integration.sampleCount === 'number' ? integration.sampleCount : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Last check</span>
                        <span>{integration.lastCheckedAt ? new Date(integration.lastCheckedAt).toLocaleString() : 'n/a'}</span>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                    onClick={primaryAction}
                    className="flex-1 rounded-2xl border border-indigo-400/50 bg-indigo-500/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-100 transition hover:bg-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isComingSoon ? false : isPrimaryPending}
                >
                    {isPrimaryPending ? 'Processing…' : primaryLabel}
                </button>
                <button
                    onClick={secondaryAction}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSecondaryPending}
                >
                    {isSecondaryPending ? 'Processing…' : secondaryLabel}
                </button>
            </div>
        </article>
    );
};

const getIntegrationIcon = (name: IntegrationSummary['name']) => {
    switch (name) {
        case 'google':
            return GmailIcon;
        case 'facebook':
            return FacebookIcon;
        default:
            return MessageIcon;
    }
};

const getPrimaryLabel = (integration: IntegrationSummary) => {
    if (integration.status === 'coming_soon') {
        return 'Join waitlist';
    }

    if (!integration.connected) {
        return 'Connect';
    }

    if (integration.status === 'action_required') {
        return 'Reconnect';
    }

    return 'Sync samples';
};

export default IntegrationSummaryGrid;

