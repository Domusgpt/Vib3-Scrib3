import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ConsoleScaffold from '../components/console/ConsoleScaffold';
import NotificationBanner from '../components/workspace/NotificationBanner';
import Loader from '../components/Loader';
import { PluginSignup, PluginSignupReason, PluginSignupStatus, PluginSignupSummary } from '../types';
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

const STATUS_LABELS: Record<PluginSignupStatus, string> = {
    new: 'New',
    contacted: 'Contacted',
    activated: 'Activated',
    closed: 'Closed',
};

const STATUS_BADGE_CLASS: Record<PluginSignupStatus, string> = {
    new: 'bg-indigo-500/20 text-indigo-100 border-indigo-500/40',
    contacted: 'bg-amber-500/20 text-amber-100 border-amber-400/40',
    activated: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/40',
    closed: 'bg-slate-600/20 text-slate-200 border-slate-500/40',
};

const NEXT_STATUS_OPTIONS: Record<PluginSignupStatus, PluginSignupStatus[]> = {
    new: ['contacted', 'activated', 'closed'],
    contacted: ['activated', 'closed'],
    activated: ['closed', 'contacted'],
    closed: ['contacted', 'activated'],
};

const getStatusActionLabel = (current: PluginSignupStatus, next: PluginSignupStatus): string => {
    if (next === 'contacted') {
        return current === 'closed' || current === 'activated' ? 'Reopen' : 'Mark contacted';
    }
    if (next === 'activated') {
        return 'Activate';
    }
    if (next === 'closed') {
        return 'Close';
    }
    return STATUS_LABELS[next];
};

const STATUS_ORDER: PluginSignupStatus[] = ['new', 'contacted', 'activated', 'closed'];

const STATUS_HELPER: Record<PluginSignupStatus, string> = {
    new: 'Awaiting first follow-up.',
    contacted: 'In conversation but not activated.',
    activated: 'Activated operators with Vib3 access.',
    closed: 'Closed out or declined requests.',
};

const resolveFollowUpOwner = (followUp: PluginSignup['followUps'][number]): string => {
    return followUp.handledByName ?? followUp.handledByEmail ?? followUp.handledById;
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
    const [statusFilter, setStatusFilter] = useState<'all' | PluginSignupStatus>('all');
    const [timeWindow, setTimeWindow] = useState<TimeWindow>('30d');
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [updatingContext, setUpdatingContext] = useState<{ id: string; status: PluginSignupStatus } | null>(null);

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
                status: statusFilter === 'all' ? undefined : statusFilter,
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
    }, [consoleState.authState.isAuthenticated, reasonFilter, statusFilter, timeWindow]);

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

    const statusBreakdown = useMemo(() => {
        const base: Record<PluginSignupStatus, number> = {
            new: 0,
            contacted: 0,
            activated: 0,
            closed: 0,
        };
        if (!summary) {
            return base;
        }
        return {
            ...base,
            ...summary.breakdownByStatus,
        };
    }, [summary]);

    const openQueue = statusBreakdown.new + statusBreakdown.contacted;

    const handleStatusUpdate = useCallback(
        async (signup: PluginSignup, nextStatus: PluginSignupStatus) => {
            const noteInput = window.prompt(
                `Add an optional note before marking ${signup.email} as ${STATUS_LABELS[nextStatus].toLowerCase()}. Leave blank to continue.`,
            );
            if (noteInput === null) {
                return;
            }

            const trimmedNote = noteInput.trim();
            setUpdatingContext({ id: signup.id, status: nextStatus });
            setSuccessMessage(null);

            try {
                await apiService.updatePluginSignupStatus(signup.id, {
                    status: nextStatus,
                    note: trimmedNote.length > 0 ? trimmedNote : undefined,
                });

                setSuccessMessage(`${signup.email} marked as ${STATUS_LABELS[nextStatus]}.`);
                await loadSignups();
            } catch (err) {
                console.error('Failed to update plugin signup status', err);
                setError(err instanceof Error ? err.message : 'Unable to update signup status.');
            } finally {
                setUpdatingContext(null);
            }
        },
        [loadSignups],
    );

    const banner = error ? (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
    ) : successMessage ? (
        <NotificationBanner type="success" message={successMessage} onDismiss={() => setSuccessMessage(null)} />
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
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <SummaryCard
                        label="Total captured"
                        value={summary?.total ?? 0}
                        helper="Unique email addresses logged from the plugin flows."
                    />
                    <SummaryCard
                        label="Open queue"
                        value={openQueue}
                        helper="Signups awaiting activation or closure."
                    />
                    <SummaryCard
                        label="Touches this week"
                        value={summary?.newInLast7Days ?? 0}
                        helper="New or returning operators in the last 7 days."
                    />
                    <SummaryCard
                        label="Last captured"
                        value={formatDate(summary?.lastCapturedAt ?? null)}
                        helper="Most recent plugin interaction recorded."
                    />
                    <SummaryCard
                        label="Multi-touch accounts"
                        value={summary?.multiTouchCount ?? 0}
                        helper="Signups that engaged more than once."
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
                                Status
                                <select
                                    value={statusFilter}
                                    onChange={event => setStatusFilter(event.target.value as 'all' | PluginSignupStatus)}
                                    className="mt-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                >
                                    <option value="all">All statuses</option>
                                    {STATUS_ORDER.map(status => (
                                        <option key={status} value={status}>
                                            {STATUS_LABELS[status]}
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
                    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {STATUS_ORDER.map(status => (
                            <StatusCard key={status} status={status} count={statusBreakdown[status]} />
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
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">First seen</th>
                                            <th className="px-4 py-3">Last touch</th>
                                            <th className="px-4 py-3">Follow-ups</th>
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
                                                <td className="px-4 py-4 align-top">
                                                    <div className="flex flex-col gap-2">
                                                        <StatusBadge status={signup.status} />
                                                        <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">
                                                            Last follow-up: {formatDate(signup.lastFollowedUpAt)}
                                                        </p>
                                                        <StatusActions
                                                            signup={signup}
                                                            updatingContext={updatingContext}
                                                            onUpdate={handleStatusUpdate}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 align-top text-sm text-slate-300">{formatDate(signup.firstCapturedAt)}</td>
                                                <td className="px-4 py-4 align-top text-sm text-slate-300">{formatDate(signup.lastCapturedAt)}</td>
                                                <td className="px-4 py-4 align-top">
                                                    {signup.followUps.length === 0 ? (
                                                        <p className="text-xs text-slate-400">No follow-up actions recorded yet.</p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {signup.followUps.map(followUp => (
                                                                <div
                                                                    key={followUp.id}
                                                                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200"
                                                                >
                                                                    <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.3em] text-indigo-200">
                                                                        <span>{STATUS_LABELS[followUp.status]}</span>
                                                                        <span>{formatDate(followUp.handledAt)}</span>
                                                                    </div>
                                                                    <p className="mt-1 text-[11px] text-slate-300">
                                                                        Owner: <span className="font-medium text-white">{resolveFollowUpOwner(followUp)}</span>
                                                                    </p>
                                                                    {followUp.note && (
                                                                        <p className="mt-1 text-[11px] text-slate-300">{followUp.note}</p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
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

interface StatusCardProps {
    status: PluginSignupStatus;
    count: number;
}

const StatusCard: React.FC<StatusCardProps> = ({ status, count }) => {
    return (
        <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200">
            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] uppercase tracking-[0.35em] text-indigo-200/70">{STATUS_LABELS[status]}</p>
                <StatusBadge status={status} />
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{count}</p>
            <p className="mt-3 text-xs text-slate-400">{STATUS_HELPER[status]}</p>
        </div>
    );
};

const StatusBadge: React.FC<{ status: PluginSignupStatus }> = ({ status }) => {
    return (
        <span
            className={`inline-flex items-center justify-center rounded-2xl border px-3 py-1 text-[11px] uppercase tracking-[0.3em] ${STATUS_BADGE_CLASS[status]}`}
        >
            {STATUS_LABELS[status]}
        </span>
    );
};

interface StatusActionsProps {
    signup: PluginSignup;
    updatingContext: { id: string; status: PluginSignupStatus } | null;
    onUpdate: (signup: PluginSignup, nextStatus: PluginSignupStatus) => void;
}

const StatusActions: React.FC<StatusActionsProps> = ({ signup, updatingContext, onUpdate }) => {
    const options = NEXT_STATUS_OPTIONS[signup.status];
    if (options.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {options.map(option => {
                const isUpdating = updatingContext?.id === signup.id && updatingContext.status === option;
                return (
                    <button
                        key={`${signup.id}-${option}`}
                        onClick={() => onUpdate(signup, option)}
                        disabled={Boolean(updatingContext)}
                        className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-slate-200 transition hover:border-indigo-400 hover:text-white disabled:opacity-60 disabled:hover:border-white/10 disabled:hover:text-slate-200"
                    >
                        {isUpdating ? (
                            <span className="flex items-center gap-2">
                                <Loader className="h-3 w-3" />
                                Updating…
                            </span>
                        ) : (
                            getStatusActionLabel(signup.status, option)
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default PluginOpsCenter;
