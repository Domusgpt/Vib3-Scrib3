import React, { useState } from 'react';

import { usePlatform } from '../providers/PlatformProvider';

const ApiKeysPage: React.FC = () => {
  const { overview, createKey, revokeKey } = usePlatform();
  const [label, setLabel] = useState('');
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!overview) {
    return <p className="text-sm text-slate-400">Authenticate to manage API keys.</p>;
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!label.trim()) return;
    setIsSubmitting(true);
    try {
      const { secret } = await createKey(label.trim());
      setNewSecret(secret);
      setLabel('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setIsSubmitting(true);
    try {
      await revokeKey(id);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Create API key</h3>
        <p className="mt-1 text-sm text-slate-400">
          API keys allow you to embed Scribe into internal tools or automate workflows. Keys are only shown once, so store them securely.
        </p>
        <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="e.g. Zapier automation"
            className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creating…' : 'Create key'}
          </button>
        </form>
        {newSecret && (
          <div className="mt-4 rounded-md border border-indigo-500/60 bg-indigo-500/10 p-4 text-xs text-indigo-100">
            <p className="font-semibold">Save this secret now:</p>
            <code className="mt-2 block break-all font-mono text-sm">{newSecret}</code>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Existing keys</h3>
        {overview.apiKeys.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No keys yet. Create one above to start integrating.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {overview.apiKeys.map((key) => (
              <li
                key={key.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-100">{key.label}</p>
                  <p className="text-xs text-slate-500">Created {new Date(key.createdAt).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Preview: {key.preview}</p>
                </div>
                <button
                  onClick={() => handleRevoke(key.id)}
                  disabled={isSubmitting}
                  className="self-start rounded-md border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ApiKeysPage;
