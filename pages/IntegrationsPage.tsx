import React, { useMemo, useState } from 'react';

import { usePlatform } from '../providers/PlatformProvider';
import * as apiService from '../services/apiService';
import { IntegrationDescriptor, IntegrationName } from '../types';

const IntegrationsPage: React.FC = () => {
  const { overview, refresh } = usePlatform();
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const connections = useMemo(() => overview?.integrations ?? [], [overview?.integrations]);

  const handleConnect = async (integration: IntegrationDescriptor) => {
    setIsSubmitting(integration.id);
    try {
      if (integration.status === 'coming_soon') {
        return;
      }
      await apiService.connectIntegration(integration.id as IntegrationName, integration.scopes);
      await refresh();
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleDisconnect = async (integration: IntegrationDescriptor) => {
    setIsSubmitting(integration.id);
    try {
      await apiService.disconnectIntegration(integration.id as IntegrationName);
      await refresh();
    } finally {
      setIsSubmitting(null);
    }
  };

  const catalog = overview?.integrationCatalog ?? [];

  if (!overview) {
    return <p className="text-sm text-slate-400">Authenticate to manage integrations.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Plug Scribe into the systems that already contain your voice. Every connector runs through the backend so credentials
        stay secure and auditable.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {catalog.map((integration) => {
          const connection = connections.find((conn) => conn.provider === integration.id && conn.status === 'connected');
          const disabled = integration.status === 'coming_soon';
          return (
            <article key={integration.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
              <header className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">{integration.name}</h3>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{integration.category}</p>
                </div>
                <span className="text-xs text-slate-500">{integration.status.replace('_', ' ')}</span>
              </header>
              <p className="mt-4 text-sm text-slate-300">{integration.description}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>{integration.scopes.length} scopes requested</span>
                <a href={integration.documentationUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300">
                  Docs
                </a>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <StatusBadge status={connection?.status ?? integration.status} />
                <div className="flex gap-2">
                  {connection ? (
                    <button
                      onClick={() => handleDisconnect(integration)}
                      disabled={isSubmitting === integration.id}
                      className="rounded-md border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(integration)}
                      disabled={disabled || isSubmitting === integration.id}
                      className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {disabled ? 'Coming soon' : isSubmitting === integration.id ? 'Connecting…' : 'Connect'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const normalized = status.replace('_', ' ');
  let color = 'bg-slate-800 text-slate-300';
  if (status === 'connected') color = 'bg-emerald-500/20 text-emerald-300';
  if (status === 'revoked') color = 'bg-amber-500/20 text-amber-300';
  if (status === 'coming_soon') color = 'bg-slate-800 text-slate-500';

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{normalized}</span>;
};

export default IntegrationsPage;
