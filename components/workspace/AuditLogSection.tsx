import React from 'react';
import { AuditLog } from '../../types';

interface AuditLogSectionProps {
    auditLog: AuditLog[];
    isLoading: boolean;
}

const AuditLogSection: React.FC<AuditLogSectionProps> = ({ auditLog, isLoading }) => {
    return (
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_28px_48px_rgba(8,15,35,0.55)] backdrop-blur space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Audit activity</h3>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-slate-400">
                    {auditLog.length} events
                </span>
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
        </section>
    );
};

export default AuditLogSection;

