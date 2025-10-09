import React, { useMemo } from 'react';
import { UsageTrendPoint } from '../../types';
import { ChartBarIcon } from '../icons';

interface UsageTrendCardProps {
    data: UsageTrendPoint[];
    isLoading?: boolean;
}

const UsageTrendCard: React.FC<UsageTrendCardProps> = ({ data, isLoading }) => {
    const maxMessages = useMemo(() => {
        if (!data || data.length === 0) {
            return 0;
        }
        return Math.max(...data.map(point => point.messages));
    }, [data]);

    return (
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_28px_40px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-indigo-200/80">Usage Trend</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">Six-month throughput</h3>
                    <p className="mt-1 text-xs text-slate-400">
                        Track monthly completions and token consumption to anticipate overages.
                    </p>
                </div>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-200">
                    <ChartBarIcon className="h-6 w-6" />
                </span>
            </div>

            <div className="mt-8">
                {isLoading ? (
                    <div className="grid grid-cols-6 gap-3">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="space-y-2">
                                <div className="h-32 w-full rounded-2xl bg-white/10 animate-pulse" />
                                <div className="h-3 w-16 rounded-full bg-white/10 animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : data && data.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        {data.map(point => {
                            const normalized = maxMessages > 0 ? Math.min(point.messages / maxMessages, 1) : 0;
                            const barHeight = maxMessages > 0 ? Math.max(8, Math.round(normalized * 100)) : 8;
                            return (
                                <div key={point.period} className="flex flex-col items-center gap-3">
                                    <div className="relative flex h-40 w-full items-end justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
                                        <div
                                            className="w-10/12 rounded-t-2xl bg-gradient-to-t from-indigo-500 via-sky-400 to-cyan-300"
                                            style={{ height: `${barHeight}%` }}
                                        />
                                        <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-slate-900/80 px-2 py-1 text-[10px] font-semibold text-cyan-200">
                                            {point.messages.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="text-center text-[11px] uppercase tracking-[0.35em] text-slate-400">
                                        {new Date(`${point.period}-01`).toLocaleDateString(undefined, {
                                            month: 'short',
                                        })}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                        {point.tokens.toLocaleString()} tokens
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
                        No usage has been recorded for this workspace yet.
                    </div>
                )}
            </div>

            <div className="pointer-events-none absolute -right-24 top-1/3 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        </section>
    );
};

export default UsageTrendCard;
