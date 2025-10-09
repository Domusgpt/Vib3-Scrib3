import React from 'react';
import { Invitation, OrganizationRole } from '../../types';

interface InvitationsSectionProps {
    invitations: Invitation[];
    email: string;
    role: OrganizationRole;
    onEmailChange: (value: string) => void;
    onRoleChange: (role: OrganizationRole) => void;
    onInvite: () => void;
    onRevoke: (invitationId: string) => void;
    isInviting: boolean;
    revokingInvitationId: string | null;
}

const ROLE_OPTIONS: OrganizationRole[] = ['admin', 'author', 'viewer'];

const InvitationsSection: React.FC<InvitationsSectionProps> = ({
    invitations,
    email,
    role,
    onEmailChange,
    onRoleChange,
    onInvite,
    onRevoke,
    isInviting,
    revokingInvitationId,
}) => {
    return (
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_28px_48px_rgba(8,15,35,0.55)] backdrop-blur space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Pending invitations</h3>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-slate-400">
                    {invitations.length} outstanding
                </span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <input
                    value={email}
                    onChange={event => onEmailChange(event.target.value)}
                    placeholder="collaborator@company.com"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-200 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    type="email"
                />
                <select
                    value={role}
                    onChange={event => onRoleChange(event.target.value as OrganizationRole)}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-200 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                    {ROLE_OPTIONS.map(option => (
                        <option key={option} value={option}>
                            {option.toUpperCase()}
                        </option>
                    ))}
                </select>
                <button
                    onClick={onInvite}
                    className="rounded-2xl border border-indigo-400/60 bg-indigo-500/80 px-4 py-2 text-sm font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-indigo-500 disabled:border-white/20 disabled:bg-slate-700"
                    disabled={!email || isInviting}
                >
                    {isInviting ? 'Sending…' : 'Send invite'}
                </button>
            </div>
            <p className="text-xs text-slate-500">
                Invite limits automatically page operations — overrides require an owner confirmation.
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
                {invitations.map(invitation => (
                    <li
                        key={invitation.id}
                        className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-slate-950/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="space-y-1">
                            <p className="font-semibold text-white">{invitation.email}</p>
                            <p className="text-xs text-slate-400">
                                Role {invitation.role.toUpperCase()} · Expires{' '}
                                {new Date(invitation.expiresAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-slate-400">
                                {invitation.status.toUpperCase()}
                            </span>
                            {invitation.status === 'pending' && (
                                <button
                                    onClick={() => onRevoke(invitation.id)}
                                    className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-white/10"
                                    disabled={revokingInvitationId === invitation.id}
                                >
                                    {revokingInvitationId === invitation.id ? 'Revoking…' : 'Revoke'}
                                </button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
            {invitations.length === 0 && (
                <p className="text-sm text-slate-400">No pending invitations — invite someone above to get started.</p>
            )}
        </section>
    );
};

export default InvitationsSection;

