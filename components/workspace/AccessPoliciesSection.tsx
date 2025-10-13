import React, { useEffect, useMemo, useState } from 'react';
import {
    OrganizationAuthEnforcement,
    OrganizationAuthPolicy,
    OrganizationAuthPolicyUpdate,
    SsoProvider,
} from '../../types';

interface AccessPoliciesSectionProps {
    policy: OrganizationAuthPolicy | null;
    loading: boolean;
    updating: boolean;
    canManage: boolean;
    organizationName?: string;
    onSave: (payload: OrganizationAuthPolicyUpdate) => Promise<void> | void;
}

const PROVIDER_DESCRIPTORS: Array<{
    provider: SsoProvider;
    title: string;
    description: string;
    badge: string;
}> = [
    {
        provider: 'google',
        title: 'Google Workspace',
        description: 'Require members to authenticate with their Google account before accessing this workspace.',
        badge: 'OAuth · SSO',
    },
    {
        provider: 'facebook',
        title: 'Facebook Business',
        description: 'Enforce login via Facebook to align with Meta-run community operations.',
        badge: 'OAuth · SSO',
    },
];

const DEFAULT_POLICY: OrganizationAuthPolicyUpdate = {
    enforcement: 'optional',
    allowedProviders: ['google', 'facebook'],
};

const AccessPoliciesSection: React.FC<AccessPoliciesSectionProps> = ({
    policy,
    loading,
    updating,
    canManage,
    organizationName,
    onSave,
}) => {
    const [draft, setDraft] = useState<OrganizationAuthPolicyUpdate>(DEFAULT_POLICY);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        if (!policy) {
            setDraft(DEFAULT_POLICY);
            return;
        }
        setDraft({
            enforcement: policy.enforcement,
            allowedProviders: [...policy.allowedProviders],
            note: policy.note,
        });
    }, [policy?.enforcement, policy?.allowedProviders, policy?.note]);

    const isDirty = useMemo(() => {
        if (!policy) {
            return true;
        }
        const sameEnforcement = policy.enforcement === draft.enforcement;
        const sameProviders =
            policy.allowedProviders.length === draft.allowedProviders.length &&
            policy.allowedProviders.every(provider => draft.allowedProviders.includes(provider));
        return !(sameEnforcement && sameProviders);
    }, [draft.allowedProviders, draft.enforcement, policy]);

    const lastUpdatedLabel = useMemo(() => {
        if (!policy) return null;
        try {
            const timestamp = new Date(policy.updatedAt);
            return `${timestamp.toLocaleDateString()} · ${timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } catch {
            return policy.updatedAt;
        }
    }, [policy]);

    const handleToggleProvider = (provider: SsoProvider) => {
        if (!canManage || updating) return;
        setDraft(prev => {
            const nextProviders = prev.allowedProviders.includes(provider)
                ? prev.allowedProviders.filter(item => item !== provider)
                : [...prev.allowedProviders, provider];
            return { ...prev, allowedProviders: nextProviders };
        });
    };

    const handleEnforcementChange = (value: OrganizationAuthEnforcement) => {
        if (!canManage || updating) return;
        setDraft(prev => ({ ...prev, enforcement: value }));
    };

    const handleReset = () => {
        if (!canManage || updating) return;
        setLocalError(null);
        setDraft(DEFAULT_POLICY);
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!canManage || updating) return;
        if (draft.enforcement === 'required' && draft.allowedProviders.length === 0) {
            setLocalError('Select at least one provider when enforcement is enabled.');
            return;
        }
        setLocalError(null);
        void onSave({
            enforcement: draft.enforcement,
            allowedProviders: draft.allowedProviders,
            note: draft.note,
        });
    };

    return (
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_28px_48px_rgba(8,15,35,0.55)] backdrop-blur">
            <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-200/80">Access control</p>
                        <h3 className="mt-1 text-lg font-semibold text-white">Sign-on policies</h3>
                        <p className="mt-2 max-w-xl text-sm text-slate-300">
                            Choose whether {organizationName ?? 'this workspace'} requires a specific identity provider when members sign in.
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right text-[11px] uppercase tracking-[0.35em] text-slate-500">
                        <span className="rounded-full border border-white/10 px-3 py-1 text-slate-400">{policy ? policy.enforcement.toUpperCase() : 'OPTIONAL'}</span>
                        {lastUpdatedLabel && <span className="text-slate-500">Updated {lastUpdatedLabel}</span>}
                    </div>
                </div>

                {loading && (
                    <div className="rounded-3xl border border-white/10 bg-slate-950/60 px-4 py-6 text-sm text-slate-400">
                        Calibrating authentication policy…
                    </div>
                )}

                {!loading && (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white transition hover:border-indigo-400/60">
                                <input
                                    type="radio"
                                    className="h-4 w-4 accent-indigo-500"
                                    checked={draft.enforcement === 'optional'}
                                    onChange={() => handleEnforcementChange('optional')}
                                    disabled={!canManage || updating}
                                />
                                <div>
                                    <p className="font-semibold">Flexible sign-in</p>
                                    <p className="text-xs text-slate-400">Members can authenticate with any connected provider.</p>
                                </div>
                            </label>
                            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white transition hover:border-rose-400/60">
                                <input
                                    type="radio"
                                    className="h-4 w-4 accent-rose-500"
                                    checked={draft.enforcement === 'required'}
                                    onChange={() => handleEnforcementChange('required')}
                                    disabled={!canManage || updating}
                                />
                                <div>
                                    <p className="font-semibold">Enforce single sign-on</p>
                                    <p className="text-xs text-slate-400">Only approved providers may be used to reach the console.</p>
                                </div>
                            </label>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            {PROVIDER_DESCRIPTORS.map(provider => {
                                const isSelected = draft.allowedProviders.includes(provider.provider);
                                return (
                                    <button
                                        type="button"
                                        key={provider.provider}
                                        onClick={() => handleToggleProvider(provider.provider)}
                                        disabled={!canManage || updating}
                                        className={`group flex h-full flex-col justify-between rounded-3xl border px-4 py-4 text-left transition ${
                                            isSelected
                                                ? 'border-indigo-400/80 bg-indigo-500/20'
                                                : 'border-white/10 bg-slate-950/60 hover:border-white/20'
                                        } ${!canManage ? 'cursor-not-allowed opacity-70' : ''}`}
                                    >
                                        <div className="space-y-2">
                                            <span className="inline-flex items-center rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.35em] text-indigo-200/90">
                                                {provider.badge}
                                            </span>
                                            <p className="text-sm font-semibold text-white">{provider.title}</p>
                                            <p className="text-xs text-slate-300">{provider.description}</p>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
                                            <span>{isSelected ? 'Selected' : 'Tap to include'}</span>
                                            <span
                                                className={`h-2 w-2 rounded-full ${
                                                    isSelected ? 'bg-lime-400 shadow-[0_0_12px_rgba(190,242,100,0.8)]' : 'bg-slate-700'
                                                }`}
                                            />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}

                {localError && <p className="text-sm text-rose-300">{localError}</p>}
                {!canManage && !loading && (
                    <p className="text-xs text-slate-400">Only owners and admins can modify sign-on enforcement.</p>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                        type="submit"
                        className="rounded-2xl border border-indigo-400/70 bg-indigo-500/40 px-6 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-100 transition hover:bg-indigo-500/50 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-slate-800/60 disabled:text-slate-400"
                        disabled={!canManage || !isDirty || updating || loading}
                    >
                        {updating ? 'Saving…' : 'Save policy'}
                    </button>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={!canManage || updating || loading}
                            className="rounded-2xl border border-white/10 px-4 py-2 uppercase tracking-[0.35em] text-white transition hover:border-white/30 disabled:cursor-not-allowed disabled:text-slate-500"
                        >
                            Reset to default
                        </button>
                        {policy?.updatedBy && <span>Last modified by {policy.updatedBy}</span>}
                    </div>
                </div>
            </form>
        </section>
    );
};

export default AccessPoliciesSection;

