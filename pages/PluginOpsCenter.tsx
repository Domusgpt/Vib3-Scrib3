import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ConsoleScaffold from '../components/console/ConsoleScaffold';
import NotificationBanner from '../components/workspace/NotificationBanner';
import Loader from '../components/Loader';
import {
    PluginSignup,
    PluginSignupReason,
    PluginSignupStatus,
    PluginSignupSummary,
} from '../types';
import * as apiService from '../services/apiService';
import type { UpdatePluginSignupPayload } from '../services/apiService';
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
    new: 'New signal',
    'awaiting-session': 'Awaiting session',
    contacted: 'Contacted',
    activated: 'Activated',
    snoozed: 'Snoozed',
    closed: 'Closed',
};

const STATUS_ORDER: PluginSignupStatus[] = [
    'new',
    'awaiting-session',
    'contacted',
    'activated',
    'snoozed',
    'closed',
];

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

const STATUS_BADGE_CLASSES: Record<PluginSignupStatus, string> = {
    new: 'border-indigo-500/40 bg-indigo-500/15 text-indigo-100',
    'awaiting-session': 'border-amber-500/40 bg-amber-500/15 text-amber-100',
    contacted: 'border-sky-500/40 bg-sky-500/15 text-sky-100',
    activated: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100',
    snoozed: 'border-slate-500/40 bg-slate-500/15 text-slate-100',
    closed: 'border-rose-500/40 bg-rose-500/15 text-rose-100',
};

const formatStatus = (status: PluginSignupStatus) => STATUS_LABELS[status] ?? status;

const toLocalDateTimeInput = (value: string | null | undefined): string => {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    const tzOffset = date.getTimezoneOffset() * 60000;
    const local = new Date(date.getTime() - tzOffset);
    return local.toISOString().slice(0, 16);
};

const normalizeDateInput = (value: string): string | null => {
    if (!value) {
        return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed.toISOString();
};

interface SignupUpdateDraft {
    status: PluginSignupStatus;
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    nextActionAt: string;
    note: string;
    isSaving: boolean;
    error: string | null;
    lastSavedAt?: number;
}

const createDraftFromSignup = (signup: PluginSignup): SignupUpdateDraft => ({
    status: signup.status,
    ownerId: signup.ownerId ?? '',
    ownerName: signup.ownerName ?? '',
    ownerEmail: signup.ownerEmail ?? '',
    nextActionAt: toLocalDateTimeInput(signup.nextActionAt ?? null),
    note: '',
    isSaving: false,
    error: null,
    lastSavedAt: undefined,
});

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
    const [expandedSignupId, setExpandedSignupId] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<Record<string, SignupUpdateDraft>>({});

    const loadSignups = useCallback(async () => {
        if (!consoleState.authState.isAuthenticated) {
            setSignups([]);
            setSummary(null);
            setFilteredCount(0);
            setTotalCount(0);
            setExpandedSignupId(null);
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
            setDrafts(prevDrafts => {
                const nextDrafts = { ...prevDrafts };
                response.signups.forEach(signup => {
                    if (nextDrafts[signup.id]) {
                        const previous = nextDrafts[signup.id];
                        nextDrafts[signup.id] = {
                            ...createDraftFromSignup(signup),
                            note: previous.note,
                            isSaving: false,
                            error: null,
                            lastSavedAt: previous.lastSavedAt,
                        };
                    }
                });
                return nextDrafts;
            });
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

    const toggleSignup = useCallback(
        (signup: PluginSignup) => {
            setExpandedSignupId(prev => (prev === signup.id ? null : signup.id));
            setDrafts(prev => {
                if (prev[signup.id]) {
                    return prev;
                }
                return { ...prev, [signup.id]: createDraftFromSignup(signup) };
            });
        },
        [],
    );

    const updateDraft = useCallback((signupId: string, patch: Partial<SignupUpdateDraft>) => {
        setDrafts(prev => {
            const existing = prev[signupId];
            if (!existing) {
                return prev;
            }
            return {
                ...prev,
                [signupId]: { ...existing, ...patch },
            };
        });
    }, []);

    const assignToMe = useCallback(
        (signupId: string) => {
            const user = consoleState.authState.user;
            if (!user) {
                return;
            }
            updateDraft(signupId, {
                ownerId: user.id ?? '',
                ownerName: user.name ?? user.email ?? '',
                ownerEmail: user.email ?? '',
            });
        },
        [consoleState.authState.user, updateDraft],
    );

    const clearOwner = useCallback(
        (signupId: string) => {
            updateDraft(signupId, { ownerId: '', ownerName: '', ownerEmail: '' });
        },
        [updateDraft],
    );

    const resetDraft = useCallback(
        (signup: PluginSignup) => {
            setDrafts(prev => ({
                ...prev,
                [signup.id]: {
                    ...createDraftFromSignup(signup),
                    note: '',
                    error: null,
                    isSaving: false,
                },
            }));
        },
        [],
    );

    const saveDraft = useCallback(
        async (signup: PluginSignup) => {
            const draft = drafts[signup.id] ?? createDraftFromSignup(signup);
            const payload: UpdatePluginSignupPayload = {};

            if (draft.status !== signup.status) {
                payload.status = draft.status;
            }

            const trimmedOwnerId = draft.ownerId.trim();
            if ((signup.ownerId ?? '') !== trimmedOwnerId) {
                payload.ownerId = trimmedOwnerId.length > 0 ? trimmedOwnerId : null;
            }

            const trimmedOwnerName = draft.ownerName.trim();
            if ((signup.ownerName ?? '') !== trimmedOwnerName) {
                payload.ownerName = trimmedOwnerName.length > 0 ? trimmedOwnerName : null;
            }

            const trimmedOwnerEmail = draft.ownerEmail.trim().toLowerCase();
            if ((signup.ownerEmail ?? '') !== trimmedOwnerEmail) {
                payload.ownerEmail = trimmedOwnerEmail.length > 0 ? trimmedOwnerEmail : null;
            }

            const normalizedNextAction = draft.nextActionAt ? normalizeDateInput(draft.nextActionAt) : null;
            const existingNextAction = signup.nextActionAt ?? null;
            if (normalizedNextAction !== existingNextAction) {
                payload.nextActionAt = normalizedNextAction;
            }

            const trimmedNote = draft.note.trim();
            if (trimmedNote.length > 0) {
                payload.note = trimmedNote;
            }

            if (Object.keys(payload).length === 0) {
                updateDraft(signup.id, { error: 'No changes to save.', isSaving: false });
                return;
            }

            updateDraft(signup.id, { isSaving: true, error: null });

            try {
                const response = await apiService.updatePluginSignup(signup.id, payload);
                setSignups(prev => prev.map(item => (item.id === signup.id ? response.signup : item)));
                setDrafts(prev => ({
                    ...prev,
                    [signup.id]: {
                        ...createDraftFromSignup(response.signup),
                        note: '',
                        isSaving: false,
                        error: null,
                        lastSavedAt: Date.now(),
                    },
                }));
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unable to save signup updates.';
                setDrafts(prev => ({
                    ...prev,
                    [signup.id]: {
                        ...(prev[signup.id] ?? createDraftFromSignup(signup)),
                        isSaving: false,
                        error: message,
                    },
                }));
            }
        },
        [drafts, updateDraft],
    );

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
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Owner</th>
                                            <th className="px-4 py-3">Next action</th>
                                            <th className="px-4 py-3">Manage</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {signups.map(signup => {
                                            const draft = drafts[signup.id] ?? createDraftFromSignup(signup);
                                            const isExpanded = expandedSignupId === signup.id;
                                            const ownerLabel = signup.ownerName || signup.ownerEmail || 'Unassigned';

                                            return (
                                                <React.Fragment key={signup.id}>
                                                    <tr className="text-sm text-slate-200">
                                                        <td className="px-4 py-4 align-top">
                                                            <div className="font-semibold text-white">{signup.email}</div>
                                                            <div className="mt-1 text-[11px] uppercase tracking-[0.3em] text-slate-400">
                                                                {signup.touches.length} touch{signup.touches.length === 1 ? '' : 'es'} · {signup.followUps.length}{' '}
                                                                note{signup.followUps.length === 1 ? '' : 's'}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 align-top text-xs uppercase tracking-[0.3em] text-indigo-200">
                                                            {signup.source}
                                                        </td>
                                                        <td className="px-4 py-4 align-top text-sm text-slate-300">{formatDate(signup.firstCapturedAt)}</td>
                                                        <td className="px-4 py-4 align-top text-sm text-slate-300">{formatDate(signup.lastCapturedAt)}</td>
                                                        <td className="px-4 py-4 align-top">
                                                            <span
                                                                className={`inline-flex rounded-2xl border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] ${STATUS_BADGE_CLASSES[signup.status]}`}
                                                            >
                                                                {formatStatus(signup.status)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 align-top text-sm text-slate-200">{ownerLabel}</td>
                                                        <td className="px-4 py-4 align-top text-sm text-slate-300">{formatDate(signup.nextActionAt ?? null)}</td>
                                                        <td className="px-4 py-4 align-top">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleSignup(signup)}
                                                                className="rounded-2xl border border-indigo-500/40 bg-indigo-500/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-indigo-100 transition hover:bg-indigo-500/30"
                                                            >
                                                                {isExpanded ? 'Close' : 'Review'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan={8} className="bg-slate-950/60 px-4 pb-6 pt-2">
                                                                <SignupDetailPanel
                                                                    signup={signup}
                                                                    draft={draft}
                                                                    onDraftChange={patch => updateDraft(signup.id, patch)}
                                                                    onSave={() => {
                                                                        void saveDraft(signup);
                                                                    }}
                                                                    onReset={() => resetDraft(signup)}
                                                                    onAssignSelf={() => assignToMe(signup.id)}
                                                                    onClearOwner={() => clearOwner(signup.id)}
                                                                />
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
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

interface SignupDetailPanelProps {
    signup: PluginSignup;
    draft: SignupUpdateDraft;
    onDraftChange: (patch: Partial<SignupUpdateDraft>) => void;
    onSave: () => void;
    onReset: () => void;
    onAssignSelf: () => void;
    onClearOwner: () => void;
}

const SignupDetailPanel: React.FC<SignupDetailPanelProps> = ({
    signup,
    draft,
    onDraftChange,
    onSave,
    onReset,
    onAssignSelf,
    onClearOwner,
}) => {
    const recentlySaved = draft.lastSavedAt ? Date.now() - draft.lastSavedAt < 4000 : false;

    return (
        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 text-sm text-slate-200 shadow-[0_24px_45px_rgba(8,15,35,0.45)]">
            <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-6 lg:space-y-0">
                <div className="space-y-5">
                    <DetailSection
                        title="Plugin touch history"
                        helper="Captured interactions from the Claude plugin flows."
                    >
                        {signup.touches.length === 0 ? (
                            <p className="text-xs text-slate-400">No plugin touches captured yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {signup.touches.map((touch, index) => (
                                    <div
                                        key={`${signup.id}-touch-${index}-${touch.capturedAt}`}
                                        className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs"
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
                        )}
                    </DetailSection>

                    <DetailSection
                        title="Follow-ups & notes"
                        helper="Internal updates logged by launch owners."
                    >
                        {signup.followUps.length === 0 ? (
                            <p className="text-xs text-slate-400">No follow-ups captured yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {signup.followUps.map(followUp => (
                                    <div
                                        key={followUp.id}
                                        className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-200"
                                    >
                                        <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.3em] text-indigo-200/80">
                                            <span>{followUp.authorName || followUp.authorEmail || 'Unknown actor'}</span>
                                            <span>{formatDate(followUp.createdAt)}</span>
                                        </div>
                                        <p className="mt-1 text-[11px] text-slate-300">{followUp.note}</p>
                                        {followUp.status && (
                                            <p className="mt-2 inline-flex rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-indigo-200">
                                                Status: {formatStatus(followUp.status)}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </DetailSection>
                </div>

                <div className="space-y-5">
                    <DetailSection title="Update status" helper="Assign an owner and capture the next follow-up.">
                        <div className="space-y-4">
                            <label className="block text-[11px] uppercase tracking-[0.3em] text-slate-300">
                                Status
                                <select
                                    value={draft.status}
                                    onChange={event => onDraftChange({ status: event.target.value as PluginSignupStatus })}
                                    disabled={draft.isSaving}
                                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                >
                                    {STATUS_ORDER.map(status => (
                                        <option key={status} value={status}>
                                            {formatStatus(status)}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="block text-[11px] uppercase tracking-[0.3em] text-slate-300">
                                    Owner name
                                    <input
                                        type="text"
                                        value={draft.ownerName}
                                        disabled={draft.isSaving}
                                        onChange={event => onDraftChange({ ownerName: event.target.value })}
                                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                        placeholder="e.g. Casey Operator"
                                    />
                                </label>
                                <label className="block text-[11px] uppercase tracking-[0.3em] text-slate-300">
                                    Owner email
                                    <input
                                        type="email"
                                        value={draft.ownerEmail}
                                        disabled={draft.isSaving}
                                        onChange={event => onDraftChange({ ownerEmail: event.target.value })}
                                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                        placeholder="owner@team.com"
                                    />
                                </label>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={onAssignSelf}
                                    disabled={draft.isSaving}
                                    className="rounded-2xl border border-indigo-500/30 bg-indigo-500/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-indigo-100 transition hover:bg-indigo-500/25"
                                >
                                    Assign to me
                                </button>
                                <button
                                    type="button"
                                    onClick={onClearOwner}
                                    disabled={draft.isSaving}
                                    className="rounded-2xl border border-slate-500/30 bg-slate-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-200 transition hover:bg-slate-500/20"
                                >
                                    Clear owner
                                </button>
                            </div>

                            <label className="block text-[11px] uppercase tracking-[0.3em] text-slate-300">
                                Next action
                                <input
                                    type="datetime-local"
                                    value={draft.nextActionAt}
                                    disabled={draft.isSaving}
                                    onChange={event => onDraftChange({ nextActionAt: event.target.value })}
                                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                />
                            </label>

                            <label className="block text-[11px] uppercase tracking-[0.3em] text-slate-300">
                                Follow-up note
                                <textarea
                                    value={draft.note}
                                    disabled={draft.isSaving}
                                    onChange={event => onDraftChange({ note: event.target.value })}
                                    rows={4}
                                    placeholder="Summarize the latest outreach, Firestore sync, or session hand-off."
                                    className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                />
                            </label>

                            {draft.error && (
                                <p className="rounded-2xl border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-rose-100">
                                    {draft.error}
                                </p>
                            )}

                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={onReset}
                                    disabled={draft.isSaving}
                                    className="rounded-2xl border border-slate-500/30 bg-slate-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-200 transition hover:bg-slate-500/20"
                                >
                                    Reset changes
                                </button>
                                <button
                                    type="button"
                                    onClick={onSave}
                                    disabled={draft.isSaving}
                                    className="rounded-2xl border border-emerald-500/40 bg-emerald-500/20 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-100 transition hover:bg-emerald-500/30"
                                >
                                    {draft.isSaving ? 'Saving…' : 'Save updates'}
                                </button>
                                <div className="ml-auto text-[11px] uppercase tracking-[0.3em] text-slate-400">
                                    Last updated: {formatDate(signup.lastUpdatedAt)}
                                    {signup.lastUpdatedBy && (
                                        <span className="ml-2 text-slate-500">by {signup.lastUpdatedBy}</span>
                                    )}
                                </div>
                            </div>

                            {recentlySaved && (
                                <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-300">
                                    Updates synced to Claude launch ops.
                                </p>
                            )}
                        </div>
                    </DetailSection>
                </div>
            </div>
        </div>
    );
};

interface DetailSectionProps {
    title: string;
    helper?: string;
    children: React.ReactNode;
}

const DetailSection: React.FC<DetailSectionProps> = ({ title, helper, children }) => {
    return (
        <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-indigo-200/80">{title}</p>
            {helper && <p className="mt-1 text-[11px] text-slate-400">{helper}</p>}
            <div className="mt-3 space-y-3">{children}</div>
        </section>
    );
};

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
