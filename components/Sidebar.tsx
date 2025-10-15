import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AuthState,
    Integration,
    StyleProfile,
    IntegrationName,
    ProfileSourceType,
    BillingPlan,
    UsageSnapshot,
    OrganizationSummary,
} from '../types';
import {
    GmailIcon,
    FacebookIcon,
    PlusCircleIcon,
    LogOutIcon,
    BrainIcon,
    CheckCircleIcon,
    ClipboardDocumentIcon,
    LightningBoltIcon,
    ChartBarIcon,
    SparklesIcon,
} from './icons';
import BillingSummary from './billing/BillingSummary';
import { parseStylePreview } from '../utils/styleParser';

interface SidebarProps {
    authState: AuthState;
    profiles: StyleProfile[];
    activeProfileId: string | null;
    onProfileSelect: (id: string) => void | Promise<void>;
    onProfileCreate: () => void | Promise<void>;
    onLogout: () => void | Promise<void>;
    onDisconnect: (integration: IntegrationName) => void | Promise<void>;
    billingPlans: BillingPlan[];
    usage: UsageSnapshot | null;
    onStartTrial: (planId: string) => void | Promise<void>;
    onUpgrade: (planId: string, cadence: 'monthly' | 'yearly') => void | Promise<void>;
    onOpenPortal: () => void | Promise<void>;
    isBillingActionLoading: boolean;
    organizations: OrganizationSummary[];
    activeOrganizationId: string | null;
    onOrganizationChange: (organizationId: string) => void | Promise<void>;
}

const Sidebar: React.FC<SidebarProps> = ({
    authState,
    profiles,
    activeProfileId,
    onProfileSelect,
    onProfileCreate,
    onLogout,
    onDisconnect,
    billingPlans,
    usage,
    onStartTrial,
    onUpgrade,
    onOpenPortal,
    isBillingActionLoading,
    organizations,
    activeOrganizationId,
    onOrganizationChange,
}) => {
    const { isAuthenticated, user } = authState;
    const navigate = useNavigate();

    const activeOrg = organizations.find(org => org.organization.id === activeOrganizationId) ?? organizations[0];

    const integrations: Integration[] = [
        { name: 'google', connected: !!user?.google },
        { name: 'facebook', connected: !!user?.facebook },
    ];

    const handleLogin = (provider: 'google' | 'facebook') => {
        window.location.href = `/auth/${provider}`;
    };

    return (
        <aside className="flex h-full w-full flex-col gap-6 rounded-[28px] border border-white/10 bg-slate-900/70 p-6 text-slate-200 shadow-[0_28px_48px_rgba(8,15,35,0.55)] backdrop-blur">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-slate-900/60 to-transparent px-4 py-3 shadow-inner">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-indigo-200">
                            <BrainIcon className="h-6 w-6" />
                        </span>
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.45em] text-indigo-200/80">Scribe Suite</p>
                            <h1 className="text-lg font-semibold text-white">Vib3 Control</h1>
                        </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-200">
                        <LightningBoltIcon className="h-3.5 w-3.5 text-indigo-300" />
                        Beta
                    </span>
                </div>
            </div>

            <div>
                {isAuthenticated && user ? (
                    <div className="flex items-start gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                        <img src={user.avatar} alt={user.name} className="h-12 w-12 flex-shrink-0 rounded-2xl object-cover" />
                        <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                            <p className="truncate text-xs text-slate-400">{user.email}</p>
                            <div className="mt-3 inline-flex rounded-full border border-white/10 bg-slate-900/60 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.4em] text-slate-300">
                                {authState.subscription?.status ?? 'GUEST'}
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                void onLogout();
                            }}
                            title="Logout"
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-400 transition hover:bg-white/10 hover:text-white"
                        >
                            <LogOutIcon className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <div className="rounded-3xl border border-dashed border-slate-700/80 bg-slate-900/60 px-4 py-6 text-center text-sm text-slate-400">
                        Connect to start orchestrating your writing agents.
                    </div>
                )}
            </div>

            {isAuthenticated && organizations.length > 0 && (
                <section className="space-y-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-semibold uppercase tracking-[0.4em] text-indigo-200/80">Workspace</h2>
                        <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.4em] text-indigo-200">
                            {activeOrg?.membership.role.toUpperCase() ?? 'VIEW'}
                        </span>
                    </div>
                    <select
                        value={activeOrg?.organization.id ?? ''}
                        onChange={event => {
                            void onOrganizationChange(event.target.value);
                        }}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                        {organizations.map(org => (
                            <option key={org.organization.id} value={org.organization.id}>
                                {org.organization.name}
                            </option>
                        ))}
                    </select>
                    {activeOrg && (
                        <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-3 py-2 text-[11px] text-slate-300">
                            <span className="uppercase tracking-[0.35em] text-slate-400">Seats</span>
                            <span>
                                {activeOrg.seats.used}
                                {typeof activeOrg.seats.limit === 'number'
                                    ? ` / ${activeOrg.seats.limit}`
                                    : ' / ∞'}
                            </span>
                        </div>
                    )}
                    <button
                        onClick={() => navigate('/workspace')}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-indigo-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-100 transition hover:bg-indigo-500/30"
                    >
                        Manage
                    </button>
                </section>
            )}

            <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.4em] text-indigo-200/80">Operations</h2>
                <button
                    onClick={() => navigate('/insights')}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-left text-sm text-slate-100 transition hover:bg-sky-500/20"
                >
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.35em] text-sky-200/80">Insights</p>
                        <p className="mt-1 text-xs text-slate-300">Monitor usage, signals, and alerts.</p>
                    </div>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-100">
                        <ChartBarIcon className="h-5 w-5" />
                    </span>
                </button>
                <button
                    onClick={() => navigate('/plugin-ops')}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/15 px-4 py-3 text-left text-sm text-slate-100 transition hover:bg-indigo-500/25"
                >
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.35em] text-indigo-200/80">Claude plugin</p>
                        <p className="mt-1 text-xs text-slate-300">Track signups, touches, and gating health.</p>
                    </div>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/25 text-indigo-100">
                        <SparklesIcon className="h-5 w-5" />
                    </span>
                </button>
            </section>

            <section className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-[0.4em] text-indigo-200/80">Integrations</h2>
                <div className="space-y-2">
                    {integrations.map(int => (
                        <IntegrationButton
                            key={int.name}
                            name={int.name}
                            connected={int.connected}
                            onConnect={() => handleLogin(int.name as 'google' | 'facebook')}
                            onDisconnect={() => {
                                void onDisconnect(int.name);
                            }}
                        />
                    ))}
                </div>
                <button
                    onClick={() => navigate('/integrations')}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-indigo-100 transition hover:bg-indigo-500/30"
                >
                    Integration hub
                </button>
            </section>

            <section className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.4em] text-indigo-200/80">Style Profiles</h2>
                    <span className="text-[10px] uppercase tracking-[0.35em] text-slate-500">{profiles.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                    <div className="space-y-2">
                        {profiles.map(profile => (
                            <ProfileCard
                                key={profile.id}
                                profile={profile}
                                isActive={profile.id === activeProfileId}
                                onSelect={() => {
                                    void onProfileSelect(profile.id);
                                }}
                            />
                        ))}
                    </div>
                </div>
                <button
                    onClick={() => {
                        void onProfileCreate();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-indigo-500/80 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500/70 disabled:border-white/5 disabled:bg-slate-700/70"
                    disabled={!isAuthenticated}
                >
                    <PlusCircleIcon className="h-5 w-5" />
                    New Profile
                </button>
            </section>

            <BillingSummary
                authState={authState}
                plans={billingPlans}
                usage={usage}
                onStartTrial={onStartTrial}
                onUpgrade={onUpgrade}
                onOpenPortal={onOpenPortal}
                isActionLoading={isBillingActionLoading}
            />
        </aside>
    );
};

const IntegrationButton: React.FC<{
    name: IntegrationName;
    connected: boolean;
    onConnect: () => void | Promise<void>;
    onDisconnect: () => void | Promise<void>;
}> = ({ name, connected, onConnect, onDisconnect }) => {
    const Icon = name === 'google' ? GmailIcon : FacebookIcon;
    const label = name === 'google' ? 'Google' : 'Facebook';

    return (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-slate-200 shadow-inner">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-indigo-200">
                <Icon className="h-4 w-4" />
            </span>
            <span className="flex-1 font-medium">{label}</span>
            {connected ? (
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.35em]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-200">
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        Live
                    </span>
                    <button
                        onClick={() => {
                            void onDisconnect();
                        }}
                        className="text-slate-500 transition hover:text-red-300"
                    >
                        Disconnect
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => {
                        void onConnect();
                    }}
                    className="rounded-full border border-indigo-500/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-indigo-200 transition hover:bg-indigo-500/20"
                >
                    Connect
                </button>
            )}
        </div>
    );
};


const ProfileSourceIcon = ({ source }: { source: ProfileSourceType }) => {
    switch (source) {
        case 'gmail':
            return <GmailIcon className="h-4 w-4 text-indigo-200" />;
        case 'facebook':
            return <FacebookIcon className="h-4 w-4 text-indigo-200" />;
        case 'text':
            return <ClipboardDocumentIcon className="h-4 w-4 text-indigo-200" />;
        default:
            return null;
    }
};

const ProfileCard: React.FC<{ profile: StyleProfile, isActive: boolean, onSelect: () => void }> = ({ profile, isActive, onSelect }) => {
    const preview = parseStylePreview(profile.style);
    const creationDate = new Date(profile.createdAt).toLocaleDateString();

    return (
        <div className="group relative">
            <button
                onClick={onSelect}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
                    isActive
                        ? 'border-indigo-400/70 bg-indigo-500/20 shadow-[0_12px_24px_rgba(56,189,248,0.25)]'
                        : 'border-white/10 bg-slate-950/50 hover:border-indigo-400/50'
                }`}
            >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-indigo-200">
                    <ProfileSourceIcon source={profile.source} />
                </span>
                <div className="flex-1 min-w-0">
                    <h3 className="truncate text-sm font-semibold text-white">{profile.name}</h3>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{profile.source}</p>
                </div>
                {isActive && <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-indigo-300" />}
            </button>

            <div className="pointer-events-none absolute left-full top-1/2 ml-3 hidden w-64 -translate-y-1/2 rounded-3xl border border-white/10 bg-slate-950/90 p-4 text-xs text-slate-300 shadow-2xl backdrop-blur transition-all duration-200 group-hover:block">
                <h4 className="mb-2 truncate border-b border-white/10 pb-2 text-sm font-semibold text-white">{profile.name}</h4>
                <div className="space-y-1">
                    {preview.length > 0 ? (
                        preview.map(item => (
                            <div key={item.key} className="flex gap-2">
                                <span className="w-20 flex-shrink-0 text-slate-500">{item.key.toUpperCase()}</span>
                                <span className="text-slate-200">{item.value}</span>
                            </div>
                        ))
                    ) : (
                        <p className="italic text-slate-500">No style details available.</p>
                    )}
                </div>
                <div className="mt-3 border-t border-white/10 pt-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                    Created {creationDate}
                </div>
            </div>
        </div>
    );
};


export default Sidebar;