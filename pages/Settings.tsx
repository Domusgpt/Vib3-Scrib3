import React from 'react';
import { StyleProfile } from '../types';
import { parseStylePreview } from '../utils/styleParser';

interface SettingsPageProps {
  profiles: StyleProfile[];
  activeProfileId: string | null;
  onSelectProfile: (id: string) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ profiles, activeProfileId, onSelectProfile }) => {
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || profiles[0];
  const preview = activeProfile ? parseStylePreview(activeProfile.style) : [];

  return (
    <div className="flex-1 overflow-auto bg-slate-900/60 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Profiles & Settings</h2>
        <p className="text-sm text-slate-400">
          Manage your style profiles and understand how Scribe interprets your tone. Switch profiles to preview how drafts will adapt.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-2">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Your Profiles</h3>
          <div className="space-y-2">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => onSelectProfile(profile.id)}
                className={`w-full text-left px-3 py-2 rounded-md border text-sm transition-colors ${
                  activeProfileId === profile.id
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-800/60 border-slate-700 text-slate-200 hover:border-slate-500'
                }`}
              >
                <div className="font-semibold">{profile.name}</div>
                <div className="text-xs text-slate-400">Created {new Date(profile.createdAt).toLocaleDateString()}</div>
              </button>
            ))}
            {profiles.length === 0 && <p className="text-sm text-slate-400">Create a profile to get started.</p>}
          </div>
        </div>
        <div className="md:col-span-2 bg-slate-800/70 border border-slate-700 rounded-xl p-6 space-y-4">
          {activeProfile ? (
            <>
              <div>
                <h3 className="text-xl font-semibold text-slate-100">{activeProfile.name}</h3>
                <p className="text-sm text-slate-400">Source: <span className="capitalize">{activeProfile.source}</span></p>
              </div>
              <div className="space-y-3">
                {preview.length > 0 ? (
                  preview.map((item) => (
                    <div key={item.key}>
                      <p className="text-xs text-slate-400 uppercase tracking-wide">{item.key}</p>
                      <p className="text-sm text-slate-200">{item.value}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">This profile is still learning. Create new drafts to teach Scribe more about your tone.</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">Select a profile to preview its traits.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
