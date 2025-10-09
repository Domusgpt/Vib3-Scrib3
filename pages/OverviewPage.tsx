import React from 'react';

import { useAuth } from '../providers/AuthProvider';
import { usePlatform } from '../providers/PlatformProvider';

const OverviewPage: React.FC = () => {
  const { auth } = useAuth();
  const { overview, isLoading } = usePlatform();

  if (!auth.isAuthenticated) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center text-slate-300">
        <h2 className="text-xl font-semibold text-slate-100">Connect your accounts to get started</h2>
        <p className="mt-2 text-sm text-slate-400">
          Sign in with Google or Facebook so Scribe can learn your tone and automate routine responses.
        </p>
        <a
          href="/auth/google"
          className="mt-6 inline-flex items-center rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Sign in with Google
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Workspace</h3>
          <p className="mt-2 text-2xl font-bold text-slate-100">{overview?.tenant.name}</p>
          <p className="mt-1 text-sm text-slate-400">Owner: {auth.user?.email}</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Plan</h3>
          {overview?.subscription ? (
            <>
              <p className="mt-2 text-2xl font-bold text-slate-100">{overview.subscription.planId.replace('plan_', '')}</p>
              <p className="mt-1 text-sm text-slate-400">Status: {overview.subscription.status}</p>
              <p className="mt-1 text-xs text-slate-500">Renews {new Date(overview.subscription.renewsAt).toLocaleDateString()}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Trial automatically provisioned. Upgrade anytime from the billing tab.</p>
          )}
        </article>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Usage this cycle</h3>
          {isLoading && <span className="text-xs text-slate-500">Refreshing…</span>}
        </div>
        <dl className="mt-4 grid gap-4 md:grid-cols-3">
          <UsageStat label="Messages" value={overview?.usage.currentPeriod.messages ?? 0} />
          <UsageStat label="Profiles generated" value={overview?.usage.currentPeriod.profilesGenerated ?? 0} />
          <UsageStat label="Automations triggered" value={overview?.usage.currentPeriod.automationsTriggered ?? 0} />
        </dl>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Next best actions</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-300">
          <li>• Create at least two style profiles so Scribe can adapt to different audiences.</li>
          <li>• Connect Slack or Salesforce integrations to unlock proactive automations.</li>
          <li>• Generate an API key to embed Scribe into your existing tooling.</li>
        </ul>
      </section>
    </div>
  );
};

const UsageStat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
    <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className="mt-2 text-2xl font-semibold text-slate-100">{value}</dd>
  </div>
);

export default OverviewPage;
