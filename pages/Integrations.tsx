import React, { useState } from 'react';
import { IntegrationName, IntegrationSummary } from '../types';

interface IntegrationsPageProps {
  integrations: IntegrationSummary[];
  onConnect: (integration: IntegrationName) => Promise<void>;
  onDisconnect: (integration: IntegrationName) => Promise<void>;
  onRevealWebhookSecret: () => Promise<string>;
}

const IntegrationsPage: React.FC<IntegrationsPageProps> = ({ integrations, onConnect, onDisconnect, onRevealWebhookSecret }) => {
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);

  const handleReveal = async () => {
    setIsRevealing(true);
    try {
      const secret = await onRevealWebhookSecret();
      setWebhookSecret(secret);
    } finally {
      setIsRevealing(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-900/60 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Integrations</h2>
          <p className="text-sm text-slate-400">Connect your communication stack to continuously train Scribe in your voice.</p>
        </div>
        <button
          onClick={handleReveal}
          className="px-3 py-2 text-xs font-semibold rounded-md border border-slate-700 text-slate-200 hover:border-indigo-500"
        >
          {isRevealing ? 'Revealing…' : 'Reveal webhook secret'}
        </button>
      </div>
      {webhookSecret && (
        <div className="bg-slate-800/70 border border-slate-700 rounded-md p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Webhook signing secret</p>
          <code className="block text-sm text-indigo-200 break-all">{webhookSecret}</code>
          <p className="text-xs text-slate-500 mt-2">Use this secret to validate callbacks from Scribe when subscribing to outbound webhooks.</p>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-slate-800/70 border border-slate-700 rounded-lg p-5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-100">{integration.label}</h3>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${integration.connected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-700 text-slate-300'}`}>
                  {integration.connected ? 'Connected' : 'Not connected'}
                </span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">{integration.description}</p>
              {integration.docsUrl && (
                <a href={integration.docsUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-300 hover:text-indigo-200">
                  View integration guide ↗
                </a>
              )}
            </div>
            <div className="mt-4 flex justify-end space-x-3">
              {integration.connected ? (
                <button
                  onClick={() => onDisconnect(integration.id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md text-red-300 hover:text-red-200"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => onConnect(integration.id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IntegrationsPage;
