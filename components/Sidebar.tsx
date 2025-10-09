import React from 'react';
// FIX: Added IntegrationName to import.
import { AuthState, IntegrationSummary, StyleProfile, IntegrationName, ProfileSourceType, AppView } from '../types';
import { GmailIcon, FacebookIcon, PlusCircleIcon, LogOutIcon, BrainIcon, CheckCircleIcon, ClipboardDocumentIcon } from './icons';
import { parseStylePreview } from '../utils/styleParser';

interface SidebarProps {
    authState: AuthState;
    profiles: StyleProfile[];
    activeProfileId: string | null;
    onProfileSelect: (id: string) => void;
    onProfileCreate: () => void;
    onLogout: () => void;
    integrations: IntegrationSummary[];
    onConnect: (integration: IntegrationName) => void;
    onDisconnect: (integration: IntegrationName) => void;
    activeView: AppView;
    onNavigate: (view: AppView) => void;
}

const navigationItems: { id: AppView; label: string }[] = [
    { id: 'dashboard', label: 'Workspace' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'billing', label: 'Billing' },
    { id: 'settings', label: 'Settings' },
];

const Sidebar: React.FC<SidebarProps> = ({ authState, profiles, activeProfileId, onProfileSelect, onProfileCreate, onLogout, integrations, onConnect, onDisconnect, activeView, onNavigate }) => {
    const { isAuthenticated, user } = authState;

    return (
        <aside className="w-80 bg-slate-900 text-slate-300 flex flex-col p-4 border-r border-slate-800">
            <div className="flex items-center space-x-3 mb-6">
                <BrainIcon className="w-8 h-8 text-indigo-400" />
                <h1 className="text-xl font-bold text-slate-100">Scribe AI</h1>
            </div>

            {/* User Profile */}
            <div className="mb-6">
                {isAuthenticated && user ? (
                    <div className="flex items-center space-x-3 p-2 bg-slate-800 rounded-lg">
                        <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-100 truncate">{user.name}</p>
                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        </div>
                        <button onClick={onLogout} title="Logout" className="flex-shrink-0 p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors">
                            <LogOutIcon className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <div className="p-3 text-center bg-slate-800 rounded-lg">
                        <p className="text-sm">Sign in to get started.</p>
                    </div>
                )}
            </div>

            <nav className="mb-6">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Navigation</h2>
                <div className="space-y-1">
                    {navigationItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === item.id ? 'bg-indigo-600 text-white' : 'bg-slate-800/60 hover:bg-slate-700 text-slate-300'}`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Integrations */}
            <div className="mb-6">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Integrations</h2>
                <div className="space-y-2">
                    {integrations.map(int => (
                        <IntegrationButton
                            key={int.id}
                            integration={int}
                            onConnect={() => onConnect(int.id)}
                            onDisconnect={() => onDisconnect(int.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Style Profiles */}
            <div className="flex-1 flex flex-col min-h-0">
                 <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Style Profiles</h2>
                 <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
                     <div className="space-y-2">
                         {profiles.map(profile => (
                             <ProfileCard 
                                key={profile.id}
                                profile={profile}
                                isActive={profile.id === activeProfileId}
                                onSelect={() => onProfileSelect(profile.id)}
                             />
                         ))}
                     </div>
                 </div>
                 <button onClick={onProfileCreate} className="mt-4 w-full flex items-center justify-center space-x-2 p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold transition-colors disabled:bg-slate-600" disabled={!isAuthenticated}>
                     <PlusCircleIcon className="w-5 h-5"/>
                     <span>New Profile</span>
                 </button>
            </div>
        </aside>
    );
};

const IntegrationButton: React.FC<{
    integration: IntegrationSummary;
    onConnect: () => void;
    onDisconnect: () => void;
}> = ({ integration, onConnect, onDisconnect }) => {
    const { id, connected, label, description, connectedAt } = integration;
    const Icon = id === 'google' ? GmailIcon : id === 'facebook' ? FacebookIcon : ClipboardDocumentIcon;
    const formattedDate = connectedAt ? new Date(connectedAt).toLocaleDateString() : null;

    return (
        <div className="w-full p-3 bg-slate-800/60 rounded-lg">
            <div className="flex items-center mb-2">
                <Icon className="w-5 h-5 mr-3" />
                <div className="flex-1">
                    <div className="flex items-center justify-between text-sm font-medium text-slate-200">
                        <span>{label}</span>
                        {formattedDate && (
                            <span className="text-xs text-slate-400">Connected {formattedDate}</span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-snug">{description}</p>
                </div>
            </div>
            <div className="flex justify-end">
                {connected ? (
                    <button onClick={onDisconnect} className="text-xs text-red-300 hover:text-red-200">Disconnect</button>
                ) : (
                    <button onClick={onConnect} className="text-xs text-indigo-300 hover:text-indigo-200">Connect</button>
                )}
            </div>
        </div>
    );
};


const ProfileSourceIcon = ({ source }: { source: ProfileSourceType }) => {
    switch (source) {
        case 'gmail':
            return <GmailIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />;
        case 'facebook':
            return <FacebookIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />;
        case 'text':
            return <ClipboardDocumentIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />;
        default:
            return null;
    }
};

const ProfileCard: React.FC<{ profile: StyleProfile, isActive: boolean, onSelect: () => void }> = ({ profile, isActive, onSelect }) => {
    const preview = parseStylePreview(profile.style);
    const creationDate = new Date(profile.createdAt).toLocaleDateString();

    return (
        <div className="relative group">
            <button
                onClick={onSelect}
                className={`w-full p-3 rounded-lg text-left border-2 transition-all flex items-center space-x-3 ${isActive ? 'bg-slate-700/80 border-indigo-500' : 'bg-slate-800 border-transparent hover:border-slate-600'}`}
            >
                <ProfileSourceIcon source={profile.source} />
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-100 truncate">{profile.name}</h3>
                </div>
                 {isActive && <CheckCircleIcon className="w-5 h-5 text-indigo-400 flex-shrink-0" />}
            </button>

            {/* Tooltip */}
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-64 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 invisible group-hover:visible">
                <h4 className="font-bold text-slate-100 mb-2 border-b border-slate-700 pb-2 truncate">{profile.name}</h4>
                <div className="space-y-1 text-xs text-slate-300">
                    {preview.length > 0 ? (
                        preview.map(item => (
                            <div key={item.key} className="flex">
                                <span className="font-medium w-20 flex-shrink-0 text-slate-400 capitalize">{item.key}:</span>
                                <span>{item.value}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-slate-400 italic">No style details available.</p>
                    )}
                </div>
                <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-700">
                    Source: <span className="capitalize">{profile.source}</span> &bull; Created: {creationDate}
                </div>
            </div>
        </div>
    );
};


export default Sidebar;