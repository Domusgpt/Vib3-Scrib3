import React from 'react';
import { WorkspacePulse } from '../../types';
import { ArrowTrendingIcon, ChartBarIcon, ShieldCheckIcon, SparklesIcon } from '../icons';

interface InsightsSummaryGridProps {
    pulse?: WorkspacePulse | null;
    isLoading?: boolean;
}

const cardBase =
    'relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-slate-100 shadow-[0_28px_40px_rgba(15,23,42,0.45)] backdrop-blur transition hover:border-indigo-500/30 hover:bg-indigo-500/5';

const shimmer = 'animate-pulse bg-white/10';

const integrationLabels: Record<string, string> = {
    google: 'Gmail',
    facebook: 'Facebook',
    messages: 'Messages',
};

const formatChange = (changePercent: number | null) => {
    if (changePercent === null) return '—';
    return `${changePercent > 0 ? '+' : ''}${changePercent}%`;
};

const InsightsSummaryGrid: React.FC<InsightsSummaryGridProps> = ({ pulse, isLoading }) => {
    const velocity = pulse?.messageVelocity;
    const automation = pulse?.automationQuality;
    const integrations = pulse?.integrationCoverage;

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <article className={cardBase}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-indigo-200/80">Message Velocity</p>
                        {isLoading ? (
                            <div className="mt-3 space-y-2">
                                <div className={`h-6 w-20 rounded-full ${shimmer}`} />
                                <div className={`h-3 w-28 rounded-full ${shimmer}`} />
                            </div>
                        ) : velocity ? (
                            <>
                                <h3 className="mt-3 text-2xl font-semibold text-white">
                                    {velocity.current.toLocaleString()}
                                </h3>
                                <p className="mt-2 text-xs text-slate-400">
                                    {typeof velocity.limit === 'number'
                                        ? `${velocity.limit.toLocaleString()} monthly limit`
                                        : 'Unlimited capacity'}
                                </p>
                            </>
                        ) : (
                            <p className="mt-3 text-sm text-slate-400">No usage recorded yet.</p>
                        )}
                    </div>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-200">
                        <ChartBarIcon className="h-6 w-6" />
                    </span>
                </div>
                <div className="mt-6 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                    <span>Change</span>
                    {isLoading ? (
                        <span className={`h-4 w-14 rounded-full ${shimmer}`} />
                    ) : (
                        <span
                            className={
                                velocity?.changePercent === null
                                    ? 'text-slate-300'
                                    : velocity && velocity.changePercent > 0
                                    ? 'text-emerald-300'
                                    : velocity && velocity.changePercent < 0
                                    ? 'text-rose-300'
                                    : 'text-slate-300'
                            }
                        >
                            {formatChange(velocity?.changePercent ?? null)}
                        </span>
                    )}
                </div>
                <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl" />
            </article>

            <article className={cardBase}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-indigo-200/80">Automation Quality</p>
                        {isLoading ? (
                            <div className="mt-3 space-y-2">
                                <div className={`h-6 w-16 rounded-full ${shimmer}`} />
                                <div className={`h-3 w-24 rounded-full ${shimmer}`} />
                            </div>
                        ) : automation ? (
                            <>
                                <h3 className="mt-3 text-2xl font-semibold text-white">{automation.score}%</h3>
                                <p className="mt-2 text-xs text-slate-400">{automation.note}</p>
                            </>
                        ) : (
                            <p className="mt-3 text-sm text-slate-400">No signal yet.</p>
                        )}
                    </div>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-200">
                        <ShieldCheckIcon className="h-6 w-6" />
                    </span>
                </div>
                <div className="mt-6 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                    <span>Trend</span>
                    {isLoading ? (
                        <span className={`h-4 w-20 rounded-full ${shimmer}`} />
                    ) : automation ? (
                        <span
                            className={
                                automation.trend === 'up'
                                    ? 'inline-flex items-center gap-1 text-emerald-300'
                                    : automation.trend === 'down'
                                    ? 'inline-flex items-center gap-1 text-rose-300'
                                    : 'inline-flex items-center gap-1 text-slate-300'
                            }
                        >
                            <ArrowTrendingIcon className={`h-4 w-4 ${automation.trend === 'down' ? 'rotate-180' : ''}`} />
                            {automation.trend === 'steady'
                                ? 'Holding'
                                : automation.trend === 'up'
                                ? 'Climbing'
                                : 'Cooling'}
                        </span>
                    ) : (
                        <span>—</span>
                    )}
                </div>
                <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl" />
            </article>

            <article className={cardBase}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-indigo-200/80">Integration Coverage</p>
                        {isLoading ? (
                            <div className="mt-3 space-y-2">
                                <div className={`h-6 w-16 rounded-full ${shimmer}`} />
                                <div className={`h-3 w-28 rounded-full ${shimmer}`} />
                            </div>
                        ) : integrations ? (
                            <>
                                <h3 className="mt-3 text-2xl font-semibold text-white">
                                    {integrations.connected} / {integrations.total}
                                </h3>
                                <p className="mt-2 text-xs text-slate-400">
                                    {integrations.breakdown
                                        .filter(item => !item.connected)
                                        .map(item => integrationLabels[item.name] ?? item.name)
                                        .join(', ') || 'All sources connected'}
                                </p>
                            </>
                        ) : (
                            <p className="mt-3 text-sm text-slate-400">No connectors available.</p>
                        )}
                    </div>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-200">
                        <SparklesIcon className="h-6 w-6" />
                    </span>
                </div>
                <div className="mt-6 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                    {isLoading ? (
                        <div className={`h-4 w-24 rounded-full ${shimmer}`} />
                    ) : (
                        <span>
                            {integrations && integrations.connected === integrations.total
                                ? 'Network complete'
                                : 'Connect remaining sources'}
                        </span>
                    )}
                </div>
                <div className="pointer-events-none absolute bottom-[-40px] right-[-24px] h-36 w-36 rounded-full bg-sky-500/20 blur-3xl" />
            </article>
        </div>
    );
};

export default InsightsSummaryGrid;
