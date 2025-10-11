import React from 'react';
import { OrganizationSummary } from '../../types';

interface WorkspaceHeaderProps {
    organizations: OrganizationSummary[];
    selectedOrganization: OrganizationSummary | undefined;
    isSwitching: boolean;
    newWorkspaceName: string;
    onWorkspaceNameChange: (value: string) => void;
    onCreateWorkspace: () => void | Promise<void>;
    onSelectOrganization: (organizationId: string) => void | Promise<void>;
    isCreatingWorkspace: boolean;
}

const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
    organizations,
    selectedOrganization,
    isSwitching,
    newWorkspaceName,
    onWorkspaceNameChange,
    onCreateWorkspace,
    onSelectOrganization,
    isCreatingWorkspace,
}) => {
    return (
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_28px_48px_rgba(8,15,35,0.55)] backdrop-blur">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.45em] text-indigo-200/80">Active workspace</p>
                    <h2 className="text-2xl font-semibold text-white">
                        {selectedOrganization?.organization.name ?? 'Select a workspace'}
                    </h2>
                    {selectedOrganization && (
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                            <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.4em] text-slate-200">
                                {selectedOrganization.membership.role}
                            </span>
                            <span className="rounded-full border border-white/10 px-3 py-1 text-slate-300">
                                {selectedOrganization.seats.used}
                                {typeof selectedOrganization.seats.limit === 'number'
                                    ? ` / ${selectedOrganization.seats.limit}`
                                    : ' / ∞'}{' '}
                                seats
                            </span>
                            <span className="rounded-full border border-white/10 px-3 py-1 text-slate-300">
                                Plan {selectedOrganization.organization.planId}
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <select
                        value={selectedOrganization?.organization.id ?? ''}
                        onChange={event => {
                            void onSelectOrganization(event.target.value);
                        }}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-200 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        disabled={organizations.length === 0 || isSwitching}
                    >
                        {organizations.map(org => (
                            <option key={org.organization.id} value={org.organization.id}>
                                {org.organization.name}
                            </option>
                        ))}
                    </select>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <input
                            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-200 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            placeholder="New workspace name"
                            value={newWorkspaceName}
                            onChange={event => onWorkspaceNameChange(event.target.value)}
                        />
                        <button
                            onClick={() => {
                                void onCreateWorkspace();
                            }}
                            className="rounded-2xl border border-indigo-400/60 bg-indigo-500/70 px-4 py-2 text-sm font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-indigo-500 disabled:border-white/20 disabled:bg-slate-700"
                            disabled={isCreatingWorkspace || !newWorkspaceName.trim()}
                        >
                            {isCreatingWorkspace ? 'Creating…' : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WorkspaceHeader;

