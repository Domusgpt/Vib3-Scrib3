import React from 'react';
import { ApiKeySummary, ApiKeyWithSecret, ApiScope } from '../../types';

interface ApiKeysSectionProps {
    apiKeys: ApiKeySummary[];
    availableScopes: Array<{ label: string; value: ApiScope; description: string }>;
    selectedScopes: ApiScope[];
    apiKeyName: string;
    onApiKeyNameChange: (value: string) => void;
    onToggleScope: (scope: ApiScope) => void;
    expiresAt: string;
    onExpiresAtChange: (value: string) => void;
    onCreateKey: () => void | Promise<void>;
    creatingKey: boolean;
    newKey: ApiKeyWithSecret | null;
    onRevokeKey: (keyId: string) => void | Promise<void>;
    revokingKeyId: string | null;
}

const ApiKeysSection: React.FC<ApiKeysSectionProps> = ({
    apiKeys,
    availableScopes,
    selectedScopes,
    apiKeyName,
    onApiKeyNameChange,
    onToggleScope,
    expiresAt,
    onExpiresAtChange,
    onCreateKey,
    creatingKey,
    newKey,
    onRevokeKey,
    revokingKeyId,
}) => {
    return (
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_28px_48px_rgba(8,15,35,0.55)] backdrop-blur space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">API keys</h3>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-slate-400">
                    {apiKeys.length} issued
                </span>
            </div>
            <div className="space-y-3">
                <input
                    value={apiKeyName}
                    onChange={event => onApiKeyNameChange(event.target.value)}
                    placeholder="Docs automation key"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-200 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {availableScopes.map(scope => (
                        <label
                            key={scope.value}
                            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-300"
                        >
                            <input
                                type="checkbox"
                                checked={selectedScopes.includes(scope.value)}
                                onChange={() => onToggleScope(scope.value)}
                                className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-indigo-400 focus:ring-indigo-400"
                            />
                            <span>
                                <strong className="block text-slate-100">{scope.label}</strong>
                                {scope.description}
                            </span>
                        </label>
                    ))}
                </div>
                <input
                    type="date"
                    value={expiresAt}
                    onChange={event => onExpiresAtChange(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-200 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <button
                    onClick={() => {
                        void onCreateKey();
                    }}
                    className="rounded-2xl border border-indigo-400/60 bg-indigo-500/80 px-4 py-2 text-sm font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-indigo-500 disabled:border-white/20 disabled:bg-slate-700"
                    disabled={!apiKeyName || creatingKey}
                >
                    {creatingKey ? 'Issuing…' : 'Create API key'}
                </button>
                <p className="text-xs text-slate-500">
                    Issuance overrides ping the on-call rotation — only workspace owners can approve them.
                </p>
                {newKey && (
                    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                        <p className="font-semibold">Copy this secret now:</p>
                        <code className="mt-2 block break-all rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                            {newKey.secret}
                        </code>
                    </div>
                )}
            </div>
            <ul className="space-y-2 text-sm text-slate-300">
                {apiKeys.map(key => (
                    <li
                        key={key.id}
                        className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-slate-950/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="space-y-1">
                            <p className="font-semibold text-white">{key.name}</p>
                            <p className="text-xs text-slate-400">
                                {key.prefix}…{key.lastFour} · Scopes{' '}
                                {key.scopes.map(scope => scope.replace(':', ': ')).join(', ')}
                            </p>
                            <p className="text-xs text-slate-500">
                                Created {new Date(key.createdAt).toLocaleString()}
                                {key.expiresAt ? ` · Expires ${new Date(key.expiresAt).toLocaleDateString()}` : ''}
                            </p>
                            {key.lastUsedAt && (
                                <p className="text-xs text-slate-500">Last used {new Date(key.lastUsedAt).toLocaleString()}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] ${key.revokedAt ? 'text-red-300' : 'text-emerald-300'}`}>
                                {key.revokedAt ? `Revoked ${new Date(key.revokedAt).toLocaleString()}` : 'Active'}
                            </span>
                            {!key.revokedAt && (
                                <button
                                    onClick={() => {
                                        void onRevokeKey(key.id);
                                    }}
                                    className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-white/10"
                                    disabled={revokingKeyId === key.id}
                                >
                                    {revokingKeyId === key.id ? 'Revoking…' : 'Revoke'}
                                </button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
            {apiKeys.length === 0 && (
                <p className="text-sm text-slate-400">No API keys yet — issue one above to integrate Scribe anywhere.</p>
            )}
        </section>
    );
};

export default ApiKeysSection;

