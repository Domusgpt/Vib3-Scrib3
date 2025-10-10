import React, { useMemo } from 'react';
import { CheckCircleIcon, LightningBoltIcon } from '../icons';

type OnboardingStepAction = {
    label: string;
    onClick: () => void;
};

type OnboardingStep = {
    id: string;
    title: string;
    description: string;
    isComplete: boolean;
    action?: OnboardingStepAction;
};

interface OnboardingChecklistProps {
    steps: OnboardingStep[];
    eyebrow?: string;
    title?: string;
    description?: string;
}

const defaultEyebrow = 'MVP runway';
const defaultTitle = 'Finish your co-pilot onboarding';
const defaultDescription =
    'Complete the essentials so Vib3 Scribe can learn your voice, orchestrate automations, and sync usage telemetry.';

const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
    steps,
    eyebrow = defaultEyebrow,
    title = defaultTitle,
    description = defaultDescription,
}) => {
    const { completedCount, currentStepId } = useMemo(() => {
        const complete = steps.filter(step => step.isComplete).length;
        const next = steps.find(step => !step.isComplete)?.id ?? null;
        return { completedCount: complete, currentStepId: next };
    }, [steps]);

    const totalSteps = steps.length;
    const progressPercent = totalSteps === 0 ? 0 : Math.round((completedCount / totalSteps) * 100);

    return (
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_60px_rgba(8,15,35,0.55)] backdrop-blur">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),transparent_55%)]"
            />
            <div className="relative flex flex-col gap-6">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-indigo-200/80">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20">
                                <LightningBoltIcon className="h-5 w-5" />
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-[0.45em]">{eyebrow}</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">{title}</h2>
                            <p className="mt-2 max-w-3xl text-sm text-slate-300 sm:text-base">{description}</p>
                        </div>
                    </div>
                    <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">Progress</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-50">{progressPercent}%</p>
                        <p className="text-xs text-slate-400">
                            {completedCount} of {totalSteps} tasks complete
                        </p>
                    </div>
                </header>

                <div className="space-y-4">
                    {steps.map(step => {
                        const isCurrent = !step.isComplete && step.id === currentStepId;

                        return (
                            <div
                                key={step.id}
                                className={`group relative overflow-hidden rounded-3xl border bg-white/[0.03] px-5 py-4 transition-colors ${
                                    step.isComplete
                                        ? 'border-emerald-400/20'
                                        : isCurrent
                                        ? 'border-indigo-400/40'
                                        : 'border-white/8'
                                }`}
                            >
                                <div
                                    aria-hidden="true"
                                    className={`absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${
                                        step.isComplete
                                            ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-400/5 to-transparent'
                                            : 'bg-gradient-to-br from-indigo-500/10 via-sky-500/5 to-transparent'
                                    }`}
                                />
                                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-start gap-4">
                                        <span
                                            className={`mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full border text-base ${
                                                step.isComplete
                                                    ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200'
                                                    : isCurrent
                                                    ? 'border-indigo-400/40 bg-indigo-500/15 text-indigo-200'
                                                    : 'border-white/10 bg-white/5 text-slate-300'
                                            }`}
                                        >
                                            {step.isComplete ? (
                                                <CheckCircleIcon className="h-5 w-5" />
                                            ) : (
                                                <span className="text-sm font-semibold">{steps.findIndex(s => s.id === step.id) + 1}</span>
                                            )}
                                        </span>
                                        <div>
                                            <h3 className="text-base font-semibold text-slate-100 sm:text-lg">{step.title}</h3>
                                            <p className="mt-1 max-w-2xl text-sm text-slate-300">{step.description}</p>
                                        </div>
                                    </div>
                                    {!step.isComplete && step.action && (
                                        <button
                                            type="button"
                                            onClick={step.action.onClick}
                                            className="inline-flex items-center justify-center rounded-full border border-indigo-400/50 bg-indigo-500/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-100 transition hover:bg-indigo-500/40"
                                        >
                                            {step.action.label}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export type { OnboardingStep };
export default OnboardingChecklist;
