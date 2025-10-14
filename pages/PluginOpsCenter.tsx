import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ConsoleScaffold from '../components/console/ConsoleScaffold';
import NotificationBanner from '../components/workspace/NotificationBanner';
import Loader from '../components/Loader';
import { PluginSignup, PluginSignupReason, PluginSignupSummary } from '../types';
import * as apiService from '../services/apiService';
import { useConsolePageState } from '../hooks/useConsolePageState';

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
});

type TimeWindow = '7d' | '30d' | '90d' | 'all';

const TIME_WINDOW_DAYS: Record<Exclude<TimeWindow, 'all'>, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
};

const REASON_LABELS: Record<PluginSignupReason, string> = {
    'memory-access': 'Memory access',
    'profile-sync': 'Profile sync',
    'advanced-tools': 'Advanced tools',
    other: 'Other',
};

const formatDate = (value: string | null | undefined) => {
    if (!value) {
        return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }
    return DATE_FORMATTER.format(date);
};

const getSinceIso = (window: TimeWindow): string | undefined => {
    if (window === 'all') {
        return undefined;
    }
    const days = TIME_WINDOW_DAYS[window];
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return since.toISOString();
};

const PluginOpsCenter: React.FC = () => {
    const consoleState = useConsolePageState({ autoOpenAuthModal: true });
    const [signups, setSignups] = useState<PluginSignup[]>([]);
    const [summary, setSummary] = useState<PluginSignupSummary | null>(null);
    const [filteredCount, setFilteredCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [reasonFilter, setReasonFilter] = useState<'all' | PluginSignupReason>('all');
    const [timeWindow, setTimeWindow] = useState<TimeWindow>('30d');
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadSignups = useCallback(async () => {
        if (!consoleState.authState.isAuthenticated) {
            setSignups([]);
            setSummary(null);
            setFilteredCount(0);
            setTotalCount(0);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await apiService.getPluginSignups({
                limit: 100,
                reason: reasonFilter === 'all' ? undefined : reasonFilter,
                since: getSinceIso(timeWindow),
            });
            setSignups(response.signups);
            setSummary(response.summary);
            setFilteredCount(response.filteredCount);
            setTotalCount(response.total);
        } catch (err) {
            console.error('Failed to load plugin signups', err);
            setError(err instanceof Error ? err.message : 'Unable to load plugin signup activity.');
        } finally {
            setLoading(false);
        }
    }, [consoleState.authState.isAuthenticated, reasonFilter, timeWindow]);

    useEffect(() => {
        if (consoleState.isBootstrapping) {
            return;
        }
        void loadSignups();
    }, [consoleState.isBootstrapping, loadSignups]);

    const reasonBreakdown = useMemo(() => {
        const base: Record<PluginSignupReason, number> = {
            'memory-access': 0,
            'profile-sync': 0,
            'advanced-tools': 0,
            other: 0,
        };
        if (!summary) {
            return base;
        }
        return {
            ...base,
            ...summary.breakdownByReason,
        };
    }, [summary]);

    const banner = error ? (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
    ) : undefined;

    const emptyState = !isLoading && signups.length === 0;

    return (
        <ConsoleScaffold
            state={consoleState}
            eyebrow="Claude Plugin"
            title="Claude Plugin Operations"
            description="Monitor Claude Code signup demand and ensure memory gating stays healthy before release."
            banner={banner}
        >
            <div className="space-y-6">
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        label="Total captured"
                        value={summary?.total ?? 0}
                        helper="Unique email addresses logged from the plugin flows."
                    />
                    <SummaryCard
                        label="Touches this week"
                        value={summary?.newInLast7Days ?? 0}
                        helper="New or returning operators in the last 7 days."
                    />
                    <SummaryCard
                        label="Multi-touch accounts"
                        value={summary?.multiTouchCount ?? 0}
                        helper="Signups that engaged more than once."
                    />
                    <SummaryCard
                        label="Last captured"
                        value={formatDate(summary?.lastCapturedAt ?? null)}
                        helper="Most recent plugin interaction recorded."
                    />
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_24px_45px_rgba(8,15,35,0.45)]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-indigo-200/80">Filters</p>
                            <p className="text-sm text-slate-300">Tune the view to focus on the demand you care about.</p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <label className="flex flex-col text-xs uppercase tracking-[0.3em] text-slate-300">
                                Reason
                                <select
                                    value={reasonFilter}
                                    onChange={event => setReasonFilter(event.target.value as 'all' | PluginSignupReason)}
                                    className="mt-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                >
                                    <option value="all">All signals</option>
                                    {Object.entries(REASON_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="flex flex-col text-xs uppercase tracking-[0.3em] text-slate-300">
                                Window
                                <select
                                    value={timeWindow}
                                    onChange={event => setTimeWindow(event.target.value as TimeWindow)}
                                    className="mt-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                >
                                    <option value="7d">Last 7 days</option>
                                    <option value="30d">Last 30 days</option>
                                    <option value="90d">Last 90 days</option>
                                    <option value="all">All time</option>
                                </select>
                            </label>
                            <button
                                onClick={() => {
                                    void loadSignups();
                                }}
                                className="flex items-center justify-center gap-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-100 transition hover:bg-indigo-500/30"
                            >
                                {isLoading ? <Loader className="h-4 w-4" /> : 'Refresh'}
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {Object.entries(REASON_LABELS).map(([value, label]) => (
                            <ReasonCard key={value} label={label} count={reasonBreakdown[value as PluginSignupReason]} />
                        ))}
                    </div>
                </section>

                <section className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-indigo-200/80">Signup journal</p>
                            <p className="text-sm text-slate-300">
                                Showing {filteredCount} of {totalCount} captured signups.
                            </p>
                        </div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                            {timeWindow === 'all' ? 'All-time view' : `Window: ${timeWindow.replace('d', ' days')}`}
                        </p>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-[0_24px_45px_rgba(8,15,35,0.45)]">
                        {isLoading && (
                            <div className="flex items-center justify-center py-12">
                                <Loader className="h-8 w-8 text-indigo-200" />
                            </div>
                        )}
                        {emptyState && !isLoading && (
                            <p className="py-10 text-center text-sm text-slate-400">
                                No plugin signups captured for this filter window yet.
                            </p>
                        )}
                        {!isLoading && signups.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-white/10">
                                    <thead>
                                        <tr className="text-left text-xs uppercase tracking-[0.3em] text-slate-400">
                                            <th className="px-4 py-3">Operator</th>
                                            <th className="px-4 py-3">Source</th>
                                            <th className="px-4 py-3">First seen</th>
                                            <th className="px-4 py-3">Last touch</th>
                                            <th className="px-4 py-3">Touch history</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {signups.map(signup => (
                                            <tr key={signup.id} className="text-sm text-slate-200">
                                                <td className="px-4 py-4 align-top">
                                                    <div className="font-semibold text-white">{signup.email}</div>
                                                    <div className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-400">
                                                        {signup.touches.length} touch{signup.touches.length === 1 ? '' : 'es'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 align-top text-xs uppercase tracking-[0.3em] text-indigo-200">
                                                    {signup.source}
                                                </td>
                                                <td className="px-4 py-4 align-top text-sm text-slate-300">{formatDate(signup.firstCapturedAt)}</td>
                                                <td className="px-4 py-4 align-top text-sm text-slate-300">{formatDate(signup.lastCapturedAt)}</td>
                                                <td className="px-4 py-4">
                                                    <div className="space-y-2">
                                                        {signup.touches.map((touch, index) => (
                                                            <div
                                                                key={`${signup.id}-${index}-${touch.capturedAt}`}
                                                                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200"
                                                            >
                                                                <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.3em] text-indigo-200">
                                                                    <span>{REASON_LABELS[touch.reason]}</span>
                                                                    <span>{formatDate(touch.capturedAt)}</span>
                                                                </div>
                                                                {touch.command && (
                                                                    <p className="mt-1 text-[11px] text-slate-300">
                                                                        Command: <span className="font-medium text-white">/{touch.command}</span>
                                                                    </p>
                                                                )}
                                                                {touch.note && (
                                                                    <p className="mt-1 text-[11px] text-slate-300">{touch.note}</p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </ConsoleScaffold>
    );
};

interface SummaryCardProps {
    label: string;
    value: number | string;
    helper: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, helper }) => {
    return (
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 px-5 py-6 shadow-[0_24px_45px_rgba(8,15,35,0.45)]">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-indigo-200/80">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
            <p className="mt-3 text-xs text-slate-400">{helper}</p>
        </div>
    );
};

interface ReasonCardProps {
    label: string;
    count: number;
}

const ReasonCard: React.FC<ReasonCardProps> = ({ label, count }) => {
    return (
        <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200">
            <p className="text-[11px] uppercase tracking-[0.35em] text-indigo-200/70">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{count}</p>
        </div>
    );
};

export default PluginOpsCenter;
