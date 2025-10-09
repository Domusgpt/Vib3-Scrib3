import React from 'react';
import { PulseRecommendation } from '../../types';
import { ArrowTrendingIcon, SparklesIcon } from '../icons';

interface RecommendationsPanelProps {
    recommendations: PulseRecommendation[];
    isLoading?: boolean;
}

const priorityStyles: Record<PulseRecommendation['priority'], string> = {
    low: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
    medium: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
    high: 'border-rose-500/30 bg-rose-500/15 text-rose-200',
};

const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({ recommendations, isLoading }) => {
    return (
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_28px_40px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-indigo-200/80">Playbook</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">Operational recommendations</h3>
                    <p className="mt-1 text-xs text-slate-400">Automated coaching keeps your workspace sharp and efficient.</p>
                </div>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-200">
                    <ArrowTrendingIcon className="h-6 w-6" />
                </span>
            </div>

            <div className="mt-6 space-y-4">
                {isLoading
                    ? Array.from({ length: 3 }).map((_, index) => (
                          <div key={index} className="space-y-2 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                              <div className="h-4 w-40 rounded-full bg-white/10 animate-pulse" />
                              <div className="h-3 w-56 rounded-full bg-white/10 animate-pulse" />
                          </div>
                      ))
                    : recommendations.length > 0
                    ? recommendations.map(recommendation => (
                          <article
                              key={recommendation.id}
                              className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 transition hover:border-indigo-400/40 hover:bg-slate-900/60"
                          >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                  <h4 className="text-sm font-semibold text-white">{recommendation.title}</h4>
                                  <span
                                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] ${priorityStyles[recommendation.priority]}`}
                                  >
                                      {recommendation.priority} priority
                                  </span>
                              </div>
                              <p className="mt-2 text-xs text-slate-400">{recommendation.description}</p>
                              {recommendation.actionUrl && recommendation.actionLabel && (
                                  <a
                                      href={recommendation.actionUrl}
                                      className="mt-3 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-100 transition hover:bg-indigo-500/20"
                                  >
                                      <SparklesIcon className="h-4 w-4" />
                                      {recommendation.actionLabel}
                                  </a>
                              )}
                          </article>
                      ))
                    : (
                          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-300">
                              No active recommendations — automation signals look healthy.
                          </div>
                      )}
            </div>

            <div className="pointer-events-none absolute -right-16 bottom-0 h-32 w-32 rounded-full bg-cyan-500/20 blur-3xl" />
        </section>
    );
};

export default RecommendationsPanel;
