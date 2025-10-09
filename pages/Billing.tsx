import React from 'react';
import { Subscription, SubscriptionPlan, SubscriptionTier, UsageRecord } from '../types';

interface BillingPageProps {
  plans: SubscriptionPlan[];
  subscription: Subscription | null;
  usage: UsageRecord | null;
  withinAllowance: boolean;
  onSelectPlan: (planId: SubscriptionTier) => Promise<void>;
  isLoading: boolean;
}

const BillingPage: React.FC<BillingPageProps> = ({ plans, subscription, usage, withinAllowance, onSelectPlan, isLoading }) => {
  const activePlan = subscription?.planId;
  const allowance = subscription ? plans.find((plan) => plan.id === subscription.planId) : null;
  const usagePercent = usage && allowance ? Math.min(100, Math.round((usage.messagesUsed / allowance.includedMessages) * 100)) : 0;

  return (
    <div className="flex-1 overflow-auto bg-slate-900/60 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Billing & Usage</h2>
          <p className="text-sm text-slate-400">Choose the plan that matches your publishing volume. Downgrade or upgrade anytime.</p>
        </div>
        {subscription && (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/40">
            {subscription.status === 'trialing' ? 'Trialing' : 'Active'} · {subscription.planId.toUpperCase()}
          </span>
        )}
      </div>
      {usage && subscription && (
        <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-200">Monthly usage</h3>
            <span className={`text-xs font-semibold ${withinAllowance ? 'text-emerald-300' : 'text-amber-300'}`}>
              {usage.messagesUsed} messages · {withinAllowance ? 'within plan' : 'over allowance'}
            </span>
          </div>
          <div className="w-full bg-slate-900/60 rounded-full h-2 overflow-hidden">
            <div className={`h-full ${withinAllowance ? 'bg-indigo-500' : 'bg-amber-400'}`} style={{ width: `${usagePercent}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-2">Billing cycle resets on the day of your subscription renewal.</p>
        </div>
      )}
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isActive = activePlan === plan.id;
          return (
            <div key={plan.id} className={`rounded-xl border ${isActive ? 'border-indigo-500 bg-slate-800/80 shadow-lg shadow-indigo-900/40' : 'border-slate-700 bg-slate-800/60'} p-6 flex flex-col`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">{plan.name}</h3>
                  <p className="text-sm text-slate-400">{plan.description}</p>
                </div>
                <span className="text-xl font-bold text-slate-100">{plan.monthlyPrice === 0 ? 'Free' : `$${plan.monthlyPrice}`}</span>
              </div>
              <ul className="flex-1 space-y-2 text-sm text-slate-300">
                <li>• {plan.includedMessages.toLocaleString()} AI drafted messages / month</li>
                <li>• ${plan.overagePrice.toFixed(2)} per message over allowance</li>
                {plan.id !== 'free' && <li>• Priority support & audit logging</li>}
              </ul>
              <button
                onClick={() => onSelectPlan(plan.id)}
                disabled={isActive || isLoading}
                className={`mt-6 w-full py-2 rounded-md text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 cursor-default'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                } ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {isActive ? 'Current plan' : 'Choose plan'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BillingPage;
