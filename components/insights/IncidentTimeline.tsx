import React from 'react';
import { IncidentInsight } from '../../types';
import { ShieldCheckIcon, SparklesIcon } from '../icons';

interface IncidentTimelineProps {
    incidents: IncidentInsight[];
    isLoading?: boolean;
}

const severityBadge = (severity: IncidentInsight['severity']) => {
    switch (severity) {
        case 'critical':
            return 'bg-rose-500/20 text-rose-200 border border-rose-500/30';
        case 'warning':
            return 'bg-amber-500/20 text-amber-200 border border-amber-500/30';
        default:
            return 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/20';
    }
};

const IncidentTimeline: React.FC<IncidentTimelineProps> = ({ incidents, isLoading }) => {
    return (
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_28px_40px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-indigo-200/80">Incident Feed</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">Live workspace telemetry</h3>
                    <p className="mt-1 text-xs text-slate-400">All governance, billing, and automation events stream here.</p>
                </div>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-200">
                    <SparklesIcon className="h-6 w-6" />
                </span>
            </div>

            <div className="mt-6 space-y-5">
                {isLoading
                    ? Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="flex items-start gap-3">
                              <span className="mt-1 h-3 w-3 rounded-full bg-white/10" />
                              <div className="flex-1 space-y-2">
                                  <div className="h-4 w-40 rounded-full bg-white/10 animate-pulse" />
                                  <div className="h-3 w-56 rounded-full bg-white/10 animate-pulse" />
                              </div>
                          </div>
                      ))
                    : incidents.length > 0
                    ? incidents.map(incident => (
                          <div key={incident.id} className="flex items-start gap-3">
                              <span className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-400 via-sky-400 to-cyan-300" />
                              <div className="flex-1 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                                  <div className="flex flex-wrap items-center gap-3">
                                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] ${severityBadge(incident.severity)}`}>
                                          {incident.severity === 'critical' ? 'Critical' : incident.severity === 'warning' ? 'Warning' : 'Info'}
                                      </span>
                                      <span className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
                                          {new Date(incident.timestamp).toLocaleString(undefined, {
                                              month: 'short',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                          })}
                                      </span>
                                  </div>
                                  <h4 className="mt-3 text-sm font-semibold text-white">{incident.title}</h4>
                                  <p className="mt-2 text-xs text-slate-400">{incident.description}</p>
                                  <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-slate-500">
                                      <ShieldCheckIcon className="h-4 w-4 text-indigo-300" />
                                      {incident.category}
                                  </div>
                              </div>
                          </div>
                      ))
                    : (
                          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-300">
                              All quiet on the automation front. No incidents logged for this workspace.
                          </div>
                      )}
            </div>

            <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-purple-500/20 blur-3xl" />
        </section>
    );
};

export default IncidentTimeline;
