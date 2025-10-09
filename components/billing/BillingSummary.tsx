import React from 'react';
import { AuthState, BillingPlan, UsageSnapshot } from '../../types';
import { LightningBoltIcon } from '../icons';

interface BillingSummaryProps {
    authState: AuthState;
    plans: BillingPlan[];
    usage: UsageSnapshot | null;
    onStartTrial: (planId: string) => void;
    onUpgrade: (planId: string, cadence: 'monthly' | 'yearly') => void;
    onOpenPortal: () => void;
    isActionLoading: boolean;
}

const BillingSummary: React.FC<BillingSummaryProps> = ({
    authState,
    plans,
    usage,
    onStartTrial,
    onUpgrade,
    onOpenPortal,
    isActionLoading,
}) => {
    const { isAuthenticated, license, subscription } = authState;
    const activePlanId = subscription?.planId ?? license?.planId ?? 'scribe-free';
    const activePlan = plans.find(plan => plan.id === activePlanId) ?? plans[0];
    const proPlan = plans.find(plan => plan.id === 'scribe-pro');
    const planLimit = usage?.monthlyLimit ?? activePlan?.limits.monthlyMessages ?? 0;
    const usedMessages = usage?.usedMessages ?? 0;
    const remaining = usage?.remainingMessages ?? (planLimit === -1 ? 'unlimited' : planLimit);
    const primaryBenefit = activePlan?.features?.[0] ?? 'Premium automations';
    const seatSummary = usage?.seats;

    const usagePercentage = (() => {
        if (!usage || usage.monthlyLimit <= 0) {
            return 0;
        }
        return Math.min(100, Math.round((usage.usedMessages / usage.monthlyLimit) * 100));
    })();

    const planLabel = (() => {
        if (subscription?.status === 'trialing') {
            return `${activePlan?.name ?? 'Pro'} trial`;
        }
        if (subscription?.status === 'active') {
            return `${activePlan?.name ?? 'Pro'} (Active)`;
        }
        if (activePlan?.id === 'scribe-free') {
            return 'Free tier';
        }
        return activePlan?.name ?? 'Custom plan';
    })();

    const primaryActionClass =
        'w-full rounded-2xl border border-indigo-400/60 bg-indigo-500/80 px-4 py-2 text-sm font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-indigo-500 disabled:border-white/20 disabled:bg-slate-700';
    const subtleActionClass =
        'w-full rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.35em] text-slate-100 transition hover:bg-white/10 disabled:border-white/5 disabled:text-slate-500';

    const renderCta = () => {
        if (!isAuthenticated) {
            return (
                <button
                    className={`${subtleActionClass} cursor-not-allowed bg-indigo-500/10 text-indigo-200`}
                    disabled
                >
                    Sign in to unlock billing
                </button>
            );
        }

        if (!subscription) {
            return (
                <button
                    onClick={() => proPlan && onStartTrial(proPlan.id)}
                    className={primaryActionClass}
                    disabled={isActionLoading || !proPlan}
                >
                    Start 14-day Pro trial
                </button>
            );
        }

        if (subscription.status === 'trialing') {
            return (
                <button
                    onClick={() => proPlan && onUpgrade(proPlan.id, 'monthly')}
                    className={`${primaryActionClass} border-amber-400/60 bg-amber-500/80 hover:bg-amber-500`}
                    disabled={isActionLoading || !proPlan}
                >
                    Secure Pro before trial ends
                </button>
            );
        }

        return (
            <button
                onClick={onOpenPortal}
                className={subtleActionClass}
                disabled={isActionLoading}
            >
                Manage billing
            </button>
        );
    };

    return (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-slate-200 shadow-[0_28px_48px_rgba(8,15,35,0.55)] backdrop-blur space-y-4">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-200">
                <span className="flex items-center space-x-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-200">
                        <LightningBoltIcon className="h-4 w-4" />
                    </span>
                    <span className="text-white">Plan</span>
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-slate-200">
                    {planLabel}
                </span>
            </div>

            <div className="mt-3 space-y-2 text-xs text-slate-300">
                {activePlan && (
                    <p>
                        {activePlan.priceMonthly === 0
                            ? 'Free forever'
                            : `$${activePlan.priceMonthly}/mo • ${primaryBenefit}`}
                    </p>
                )}
                {subscription?.trialEndsAt && (
                    <p>Trial ends {new Date(subscription.trialEndsAt).toLocaleDateString()}</p>
                )}
                {seatSummary && (
                    <p>
                        Seats {seatSummary.used}
                        {seatSummary.limit === 'unlimited' ? ' / unlimited' : ` / ${seatSummary.limit}`}
                    </p>
                )}
                {usage && usage.remainingMessages !== 'unlimited' && (
                    <p>
                        {remaining} messages left · resets {new Date(usage.cycleRenewsAt).toLocaleDateString()}
                    </p>
                )}
                {usage && usage.remainingMessages === 'unlimited' && (
                    <p>Unlimited messages this cycle</p>
                )}
            </div>

                {usage && usage.monthlyLimit > 0 && (
                <div className="mt-4 space-y-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-cyan-300 transition-all"
                            style={{ width: `${usagePercentage}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>{usedMessages} used</span>
                        <span>{planLimit} limit</span>
                    </div>
                </div>
            )}

            {renderCta()}
        </div>
    );
};

export default BillingSummary;

