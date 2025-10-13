import React from 'react';
import { OrganizationMember, OrganizationRole } from '../../types';

interface TeamMembersSectionProps {
    members: OrganizationMember[];
    onChangeRole: (memberId: string, role: OrganizationRole) => void | Promise<void>;
    onRemoveMember: (memberId: string) => void | Promise<void>;
    updatingMemberId: string | null;
    removingMemberId: string | null;
}

const ROLE_OPTIONS: OrganizationRole[] = ['owner', 'admin', 'author', 'viewer'];

const TeamMembersSection: React.FC<TeamMembersSectionProps> = ({
    members,
    onChangeRole,
    onRemoveMember,
    updatingMemberId,
    removingMemberId,
}) => {
    return (
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_28px_48px_rgba(8,15,35,0.55)] backdrop-blur space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Team members</h3>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-slate-400">
                    {members.length} active
                </span>
            </div>
            <ul className="space-y-3">
                {members.map(({ membership, user }) => {
                    const isOwner = membership.role === 'owner';
                    const memberName = user?.name ?? membership.userId;
                    return (
                        <li
                            key={membership.id}
                            className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-slate-950/60 px-4 py-4 shadow-inner"
                        >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-white">{memberName}</p>
                                    <p className="text-xs text-slate-400">{user?.email ?? 'No email available'}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                                    <span>
                                        Joined{' '}
                                        {membership.joinedAt
                                            ? new Date(membership.joinedAt).toLocaleDateString()
                                            : '—'}
                                    </span>
                                    {membership.lastActiveAt && (
                                        <span>· Active {new Date(membership.lastActiveAt).toLocaleDateString()}</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3 text-xs text-slate-300">
                                    <span className="uppercase tracking-[0.35em] text-slate-500">Role</span>
                                    <select
                                        value={membership.role}
                                        onChange={event => {
                                            void onChangeRole(membership.id, event.target.value as OrganizationRole);
                                        }}
                                        disabled={isOwner || updatingMemberId === membership.id}
                                        className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1 text-xs text-slate-100 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                    >
                                        {ROLE_OPTIONS.map(option => (
                                            <option key={option} value={option}>
                                                {option.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                    {updatingMemberId === membership.id && <span className="text-indigo-200">Updating…</span>}
                                </div>
                                <button
                                    onClick={() => {
                                        void onRemoveMember(membership.id);
                                    }}
                                    className="self-start rounded-2xl border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-white/10 sm:self-auto"
                                    disabled={isOwner || removingMemberId === membership.id}
                                >
                                    {removingMemberId === membership.id ? 'Removing…' : 'Remove member'}
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>
            {members.length === 0 && (
                <p className="text-sm text-slate-400">Invite collaborators to start building together.</p>
            )}
        </section>
    );
};

export default TeamMembersSection;

