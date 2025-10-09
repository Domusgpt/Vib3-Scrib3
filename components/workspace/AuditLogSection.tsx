import React from 'react';
import { AuditLog } from '../../types';

interface AuditLogSectionProps {
    auditLog: AuditLog[];
    isLoading: boolean;
    exportSince: string;
    onExportSinceChange: (value: string) => void;
    onExport: () => void;
    isExporting: boolean;
}

const AuditLogSection: React.FC<AuditLogSectionProps> = ({
    auditLog,
    isLoading,
    exportSince,
    onExportSinceChange,
    onExport,
    isExporting,
}) => {
    return (
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_28px_48px_rgba(8,15,35,0.55)] backdrop-blur space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white">Audit activity</h3>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-slate-400">
                        {auditLog.length} events
                    </span>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-slate-400">
                        <span>Since</span>
                        <input
                            type="date"
                            value={exportSince}
                            onChange={event => onExportSinceChange(event.target.value)}
                            className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-1 text-xs text-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </label>
                    <button
                        onClick={onExport}
                        className="rounded-2xl border border-indigo-400/60 bg-indigo-500/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-indigo-500 disabled:border-white/20 disabled:bg-slate-700"
                        disabled={isExporting}
                    >
                        {isExporting ? 'Exporting…' : 'Export CSV'}
                    </button>
                </div>
            </div>
            {isLoading ? (
                <p className="text-sm text-slate-400">Loading workspace usage…</p>
            ) : (
                <ul className="space-y-2 text-sm text-slate-300">
                    {auditLog.map(entry => (
                        <li
                            key={entry.id}
                            className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-slate-950/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div>
                                <p className="font-semibold text-white">{entry.action.replace(/\./g, ' › ')}</p>
                                <p className="text-xs text-slate-400">Actor {entry.actorId ?? 'system'}</p>
                            </div>
                            <div className="text-xs text-slate-400">
                                {new Date(entry.createdAt).toLocaleString()}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            {auditLog.length === 0 && !isLoading && (
                <p className="text-sm text-slate-400">No audit activity yet — actions will appear here in real time.</p>
            )}
            <p className="text-xs text-slate-500">
                Overrides trigger real-time Slack and PagerDuty alerts for the operations team.
            </p>
        </section>
    );
};

export default AuditLogSection;

