import React from 'react';
import { OrganizationSummary, UsageSnapshot } from '../../types';

interface WorkspaceSummaryBarProps {
    organization?: OrganizationSummary;
    usage?: UsageSnapshot | null;
    isLoading?: boolean;
}

const cardBase =
    'group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-slate-100 shadow-[0_24px_40px_rgba(15,23,42,0.45)] backdrop-blur';

const shimmer = 'animate-pulse bg-white/5';

const WorkspaceSummaryBar: React.FC<WorkspaceSummaryBarProps> = ({ organization, usage, isLoading }) => {
    const planId = organization?.organization.planId ?? usage?.planId;
    const remaining = usage?.remainingMessages;
    const monthlyLimit = usage?.monthlyLimit ?? null;
    const usedMessages = usage?.usedMessages ?? 0;

    const usagePercent = monthlyLimit && monthlyLimit > 0 ? Math.min(100, Math.round((usedMessages / monthlyLimit) * 100)) : null;

    const seatLimit = organization?.seats.limit ?? null;
    const seatUsed = organization?.seats.used ?? null;

    const renewalDate = usage?.cycleRenewsAt ? new Date(usage.cycleRenewsAt) : null;

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className={`${cardBase}`}>
                <div className="relative z-10">
                    <p className="text-xs uppercase tracking-[0.35em] text-indigo-200/70">Plan</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">
                        {isLoading ? <span className={`inline-block h-5 w-24 rounded-full ${shimmer}`} /> : planId ?? 'Unassigned'}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                        {organization?.organization.type === 'team' ? 'Team workspace' : 'Personal workspace'}
                    </p>
                </div>
                <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                    <div className="absolute -top-16 right-0 h-24 w-24 rounded-full bg-indigo-500/30 blur-3xl" />
                </div>
            </article>

            <article className={`${cardBase}`}>
                <div className="relative z-10 space-y-2">
                    <p className="text-xs uppercase tracking-[0.35em] text-indigo-200/70">Usage</p>
                    {isLoading ? (
                        <div className="space-y-2">
                            <div className={`h-5 w-28 rounded-full ${shimmer}`} />
                            <div className="h-2 w-full rounded-full bg-white/5" />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between text-sm font-semibold text-white">
                                <span>{usedMessages.toLocaleString()} messages</span>
                                <span>
                                    {monthlyLimit && monthlyLimit > 0
                                        ? `${monthlyLimit.toLocaleString()} max`
                                        : remaining === 'unlimited'
                                        ? 'Unlimited'
                                        : remaining !== undefined && remaining !== null
                                        ? `${remaining} left`
                                        : '—'}
                                </span>
                            </div>
                            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-cyan-300 transition-all"
                                    style={{ width: `${usagePercent ?? (usedMessages > 0 ? 100 : 0)}%` }}
                                />
                            </div>
                        </>
                    )}
                </div>
                <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                    <div className="absolute bottom-0 right-0 h-24 w-24 rounded-full bg-sky-500/25 blur-3xl" />
                </div>
            </article>

            <article className={`${cardBase}`}>
                <div className="relative z-10 space-y-2">
                    <p className="text-xs uppercase tracking-[0.35em] text-indigo-200/70">Renewal</p>
                    {isLoading ? (
                        <div className={`h-5 w-20 rounded-full ${shimmer}`} />
                    ) : renewalDate ? (
                        <>
                            <h3 className="text-lg font-semibold text-white">
                                {renewalDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </h3>
                            <p className="text-xs text-slate-400">
                                Resets {renewalDate.toLocaleDateString(undefined, { weekday: 'short' })}
                            </p>
                        </>
                    ) : (
                        <p className="text-sm text-slate-400">No renewal scheduled.</p>
                    )}
                </div>
                <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                    <div className="absolute -bottom-10 left-8 h-24 w-24 rounded-full bg-purple-500/25 blur-3xl" />
                </div>
            </article>

            <article className={`${cardBase}`}>
                <div className="relative z-10 space-y-2">
                    <p className="text-xs uppercase tracking-[0.35em] text-indigo-200/70">Seats</p>
                    {isLoading ? (
                        <div className={`h-5 w-16 rounded-full ${shimmer}`} />
                    ) : seatUsed !== null && seatLimit !== null ? (
                        <>
                            <h3 className="text-lg font-semibold text-white">
                                {seatLimit === 'unlimited'
                                    ? `${seatUsed} active`
                                    : `${seatUsed} / ${seatLimit} active`}
                            </h3>
                            <p className="text-xs text-slate-400">Manage access from the members panel.</p>
                        </>
                    ) : (
                        <p className="text-sm text-slate-400">Seat data unavailable.</p>
                    )}
                </div>
                <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                    <div className="absolute top-4 left-12 h-20 w-20 rounded-full bg-emerald-500/20 blur-3xl" />
                </div>
            </article>
        </div>
    );
};

export default WorkspaceSummaryBar;
