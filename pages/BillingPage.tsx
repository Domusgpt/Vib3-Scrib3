import React, { useState } from 'react';

import { usePlatform } from '../providers/PlatformProvider';
import { activatePlan, requestCheckout } from '../services/platformService';

const BillingPage: React.FC = () => {
  const { overview, refresh } = usePlatform();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  if (!overview) {
    return <p className="text-sm text-slate-400">Sign in to configure billing.</p>;
  }

  const currentPlanId = overview.subscription?.planId;

  const handleUpgrade = async (planId: string) => {
    setProcessingPlan(planId);
    try {
      const { checkoutUrl } = await requestCheckout(planId, 'monthly');
      if (checkoutUrl) {
        window.open(checkoutUrl, '_blank');
      }
      await activatePlan(planId, 'monthly');
      await refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setProcessingPlan(null);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        Choose a plan that matches your throughput. Plans can be switched at any time and come with a generous trial so your team
        can validate value quickly.
      </p>
      <div className="grid gap-6 md:grid-cols-3">
        {overview.plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          return (
            <article key={plan.id} className={`flex h-full flex-col rounded-2xl border ${isCurrent ? 'border-indigo-500' : 'border-slate-800'} bg-slate-900/60 p-6`}>
              <header>
                <h3 className="text-xl font-semibold text-slate-100">{plan.name}</h3>
                <p className="mt-1 text-sm text-slate-400">{plan.description}</p>
                <p className="mt-4 text-3xl font-bold text-slate-100">${plan.priceMonthly}<span className="text-base text-slate-500">/mo</span></p>
                <p className="text-xs text-slate-500">Billed annually: ${plan.priceYearly}/yr</p>
              </header>
              <ul className="mt-6 flex-1 space-y-2 text-sm text-slate-300">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={isCurrent || processingPlan === plan.id}
                className={`mt-6 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  isCurrent
                    ? 'cursor-default border border-slate-700 text-slate-300'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                } ${processingPlan === plan.id ? 'opacity-60' : ''}`}
              >
                {isCurrent ? 'Current plan' : processingPlan === plan.id ? 'Processing…' : 'Upgrade'}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default BillingPage;
