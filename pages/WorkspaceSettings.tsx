import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BillingSummary from '../components/billing/BillingSummary';
import NotificationBanner from '../components/workspace/NotificationBanner';
import WorkspaceHeader from '../components/workspace/WorkspaceHeader';
import TeamMembersSection from '../components/workspace/TeamMembersSection';
import InvitationsSection from '../components/workspace/InvitationsSection';
import ApiKeysSection from '../components/workspace/ApiKeysSection';
import WebhooksSection from '../components/workspace/WebhooksSection';
import AuditLogSection from '../components/workspace/AuditLogSection';
import AccessPoliciesSection from '../components/workspace/AccessPoliciesSection';
import AppShell from '../components/layout/AppShell';
import WorkspaceSummaryBar from '../components/dashboard/WorkspaceSummaryBar';
import {
    ApiKeySummary,
    ApiKeyWithSecret,
    ApiScope,
    AuditLog,
    Invitation,
    OrganizationAuthPolicy,
    OrganizationAuthPolicyUpdate,
    OrganizationMember,
    OrganizationRole,
    WebhookEvent,
    WebhookSubscription,
} from '../types';
import * as apiService from '../services/apiService';
import { useBillingActions } from '../hooks/useBillingActions';
import { useConsole } from '../hooks/useConsoleContext';

const AVAILABLE_SCOPES: Array<{ label: string; value: ApiScope; description: string }> = [
    { label: 'Chat: write', value: 'chat:write', description: 'Generate content and consume tokens.' },
    { label: 'Chat: read', value: 'chat:read', description: 'Read message history and usage metrics.' },
    { label: 'Profiles: read', value: 'profiles:read', description: 'Fetch writing profiles and metadata.' },
    { label: 'Profiles: write', value: 'profiles:write', description: 'Create and update style profiles.' },
    { label: 'Billing: read', value: 'billing:read', description: 'Read usage and plan configuration.' },
];

const AVAILABLE_EVENTS: Array<{ label: string; value: WebhookEvent; description: string }> = [
    { label: 'Chat completed', value: 'chat.completed', description: 'Triggered when the AI responds to a conversation.' },
    { label: 'Profile created', value: 'profile.created', description: 'Fires when a new writing profile is generated.' },
    { label: 'Profile updated', value: 'profile.updated', description: 'Fires when a profile is edited.' },
    { label: 'Invoice created', value: 'billing.invoice.created', description: 'Notify your billing system when invoices are issued.' },
];

const WorkspaceSettings: React.FC = () => {
    const {
        authState,
        billingPlans,
        usageSnapshot,
        organizations,
        activeOrganizationId,
        activeOrganization,
        refreshAuthState,
        refreshUsage: refreshUsageFromConsole,
        switchOrganization,
        isBootstrapping,
    } = useConsole();

    const selectedOrganization = activeOrganization ?? organizations[0] ?? null;
    const selectedOrganizationId = selectedOrganization?.organization.id ?? null;

    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [apiKeys, setApiKeys] = useState<ApiKeySummary[]>([]);
    const [newKey, setNewKey] = useState<ApiKeyWithSecret | null>(null);
    const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
    const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
    const [authPolicy, setAuthPolicy] = useState<OrganizationAuthPolicy | null>(null);
    const [isAuthPolicyLoading, setIsAuthPolicyLoading] = useState(false);
    const [isUpdatingAuthPolicy, setIsUpdatingAuthPolicy] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [isSwitchingOrg, setIsSwitchingOrg] = useState(false);
    const [isUsageLoading, setIsUsageLoading] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<OrganizationRole>('author');
    const [isInviting, setIsInviting] = useState(false);

    const [apiKeyName, setApiKeyName] = useState('');
    const [apiKeyScopes, setApiKeyScopes] = useState<ApiScope[]>(['chat:write']);
    const [apiKeyExpiresAt, setApiKeyExpiresAt] = useState('');
    const [creatingApiKey, setCreatingApiKey] = useState(false);
    const [revokingApiKeyId, setRevokingApiKeyId] = useState<string | null>(null);

    const [webhookUrl, setWebhookUrl] = useState('');
    const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
    const [creatingWebhook, setCreatingWebhook] = useState(false);
    const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
    const [deletingWebhookId, setDeletingWebhookId] = useState<string | null>(null);

    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
    const [revokingInvitationId, setRevokingInvitationId] = useState<string | null>(null);
    const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);


    const [auditExportSince, setAuditExportSince] = useState('');
    const [isExportingAudit, setIsExportingAudit] = useState(false);

    const refreshUsage = useCallback(
        async (organizationId: string) => {
            setIsUsageLoading(true);
            try {
                await refreshUsageFromConsole(organizationId);
            } finally {
                setIsUsageLoading(false);
            }
        },
        [refreshUsageFromConsole],
    );

    const refreshUsageWithFallback = useCallback(
        async (organizationId?: string) => {
            const targetOrganizationId = organizationId ?? selectedOrganizationId;
            if (targetOrganizationId) {
                await refreshUsage(targetOrganizationId);
            }
        },
        [refreshUsage, selectedOrganizationId],
    );

    const {
        isLoading: billingActionLoading,
        startTrial,
        upgradePlan,
        openPortal,
    } = useBillingActions({
        authState,
        activeOrganizationId: selectedOrganizationId,
        refreshAuthState,
        refreshUsage: refreshUsageWithFallback,
    });

    const loadOrganizationDetail = useCallback(
        async (organizationId: string) => {
            setDetailLoading(true);
            setIsAuthPolicyLoading(true);
            try {
                const [memberList, invitationList, keys, webhookList, audit, policy] = await Promise.all([
                    apiService.getOrganizationMembers(organizationId),
                    apiService.getOrganizationInvitations(organizationId).catch(() => []),
                    apiService.listApiKeys(organizationId),
                    apiService.listWebhooks(organizationId),
                    apiService.getAuditLog(organizationId).catch(() => []),
                    apiService.getOrganizationAuthPolicy(organizationId).catch(() => null),
                ]);
                setMembers(memberList);
                setInvitations(invitationList);
                setApiKeys(keys);
                setWebhooks(webhookList);
                setAuditLog(audit);
                setAuthPolicy(policy);
                setError(null);
                await refreshUsage(organizationId);
            } catch (err) {
                console.error(err);
                setError('Unable to load workspace details.');
                setAuthPolicy(null);
            } finally {
                setDetailLoading(false);
                setIsAuthPolicyLoading(false);
            }
        },
        [refreshUsage],
    );

    useEffect(() => {
        if (selectedOrganizationId) {
            void loadOrganizationDetail(selectedOrganizationId);
        }
    }, [loadOrganizationDetail, selectedOrganizationId]);

    useEffect(() => {
        if (!notification) return;
        const timeout = window.setTimeout(() => setNotification(null), 6000);
        return () => window.clearTimeout(timeout);
    }, [notification]);

    const handleSwitchOrganization = async (organizationId: string) => {
        setError(null);
        setNotification(null);
        setIsSwitchingOrg(true);
        setIsUsageLoading(true);
        try {
            await switchOrganization(organizationId);
            setNotification({ type: 'info', message: 'Workspace switched.' });
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Unable to switch workspace.');
        } finally {
            setIsSwitchingOrg(false);
            setIsUsageLoading(false);
        }
    };

    const handleInvite = async () => {
        if (!selectedOrganization || !inviteEmail) return;
        setError(null);
        setNotification(null);
        setIsInviting(true);
        try {
            const invitation = await apiService.inviteMember(
                selectedOrganization.organization.id,
                inviteEmail,
                inviteRole,
            );
            setInvitations(prev => [invitation, ...prev]);
            setInviteEmail('');
            setNotification({ type: 'success', message: 'Invitation sent.' });
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'Failed to send invitation.';
            if (/rate limit/i.test(message)) {
                const confirmed = window.confirm(
                    'Invite rate limit reached. Override and alert the on-call team?',
                );
                if (confirmed) {
                    try {
                        const invitation = await apiService.inviteMember(
                            selectedOrganization.organization.id,
                            inviteEmail,
                            inviteRole,
                            { overrideRateLimit: true },
                        );
                        setInvitations(prev => [invitation, ...prev]);
                        setInviteEmail('');
                        setNotification({
                            type: 'info',
                            message: 'Invitation sent with override — operations alerted.',
                        });
                    } catch (overrideError) {
                        console.error(overrideError);
                        setError(
                            overrideError instanceof Error
                                ? overrideError.message
                                : 'Unable to override invitation limit.',
                        );
                    }
                    return;
                }
            }
            setError(message);
        } finally {
            setIsInviting(false);
        }
    };

    const handleCreateApiKey = async () => {
        if (!selectedOrganization || !apiKeyName) return;
        setCreatingApiKey(true);
        setError(null);
        setNotification(null);
        try {
            const created = await apiService.createApiKey(
                selectedOrganization.organization.id,
                apiKeyName,
                apiKeyScopes,
                apiKeyExpiresAt || undefined,
            );
            setNewKey(created);
            setApiKeys(prev => [created.key, ...prev]);
            setApiKeyName('');
            setApiKeyScopes(['chat:write']);
            setApiKeyExpiresAt('');
            setNotification({ type: 'success', message: 'API key created.' });
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'Unable to create API key.';
            if (/rate limit/i.test(message)) {
                const confirmed = window.confirm(
                    'API key rate limit reached. Override and alert the on-call team?',
                );
                if (confirmed) {
                    try {
                        const created = await apiService.createApiKey(
                            selectedOrganization.organization.id,
                            apiKeyName,
                            apiKeyScopes,
                            apiKeyExpiresAt || undefined,
                            { overrideRateLimit: true },
                        );
                        setNewKey(created);
                        setApiKeys(prev => [created.key, ...prev]);
                        setApiKeyName('');
                        setApiKeyScopes(['chat:write']);
                        setApiKeyExpiresAt('');
                        setNotification({
                            type: 'info',
                            message: 'API key issued with override — operations alerted.',
                        });
                    } catch (overrideError) {
                        console.error(overrideError);
                        setError(
                            overrideError instanceof Error
                                ? overrideError.message
                                : 'Unable to override API key limit.',
                        );
                    }
                    return;
                }
            }
            setError(message);
        } finally {
            setCreatingApiKey(false);
        }
    };

    const handleCreateWebhook = async () => {
        if (!selectedOrganization || !webhookUrl) return;
        setCreatingWebhook(true);
        setError(null);
        setNotification(null);
        try {
            const webhook = await apiService.createWebhook(
                selectedOrganization.organization.id,
                webhookUrl,
                webhookEvents.length > 0 ? webhookEvents : undefined,
            );
            setWebhooks(prev => [webhook, ...prev]);
            setWebhookUrl('');
            setWebhookEvents([]);
            setNotification({ type: 'success', message: 'Webhook registered.' });
        } catch (err) {
            console.error(err);
            setError('Unable to register webhook.');
        } finally {
            setCreatingWebhook(false);
        }
    };

    const handleSaveAuthPolicy = async (payload: OrganizationAuthPolicyUpdate) => {
        if (!selectedOrganization) return;
        setIsUpdatingAuthPolicy(true);
        setError(null);
        setNotification(null);
        try {
            const updated = await apiService.updateOrganizationAuthPolicy(selectedOrganization.organization.id, payload);
            setAuthPolicy(updated);
            setNotification({ type: 'success', message: 'Sign-on policy updated.' });
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Unable to update sign-on policy.');
        } finally {
            setIsUpdatingAuthPolicy(false);
        }
    };

    const handleCreateWorkspace = async () => {
        if (!newWorkspaceName.trim()) return;
        setIsCreatingWorkspace(true);
        setError(null);
        setNotification(null);
        try {
            const summary = await apiService.createOrganization(newWorkspaceName.trim());
            await refreshAuthState();
            if (summary?.organization?.id) {
                setIsUsageLoading(true);
                try {
                    await switchOrganization(summary.organization.id);
                } finally {
                    setIsUsageLoading(false);
                }
            }
            setNewWorkspaceName('');
            setNotification({ type: 'success', message: 'Workspace created.' });
        } catch (err) {
            console.error(err);
            setError('Unable to create workspace.');
        } finally {
            setIsCreatingWorkspace(false);
        }
    };

    const handleRevokeInvitation = async (invitationId: string) => {
        if (!selectedOrganization) return;
        if (!window.confirm('Revoke this invitation? The invite link will no longer work.')) {
            return;
        }
        setError(null);
        setNotification(null);
        setRevokingInvitationId(invitationId);
        try {
            await apiService.revokeInvitation(selectedOrganization.organization.id, invitationId);
            setInvitations(prev => prev.filter(invite => invite.id !== invitationId));
            setNotification({ type: 'info', message: 'Invitation revoked.' });
        } catch (err) {
            console.error(err);
            setError('Unable to revoke invitation.');
        } finally {
            setRevokingInvitationId(null);
        }
    };

    const handleRevokeApiKey = async (keyId: string) => {
        if (!selectedOrganization) return;
        if (!window.confirm('Revoke this API key? Applications using it will immediately lose access.')) {
            return;
        }
        setError(null);
        setNotification(null);
        setRevokingApiKeyId(keyId);
        try {
            const updated = await apiService.revokeApiKey(selectedOrganization.organization.id, keyId);
            setApiKeys(prev => prev.map(key => (key.id === keyId ? updated : key)));
            setNotification({ type: 'info', message: 'API key revoked.' });
        } catch (err) {
            console.error(err);
            setError('Unable to revoke API key.');
        } finally {
            setRevokingApiKeyId(null);
        }
    };

    const handleExportAuditLog = async () => {
        if (!selectedOrganization) return;
        setIsExportingAudit(true);
        setError(null);
        setNotification(null);
        try {
            const { blob, filename } = await apiService.exportAuditLog(
                selectedOrganization.organization.id,
                'csv',
                {
                    since: auditExportSince || undefined,
                },
            );
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            setNotification({ type: 'info', message: 'Audit log exported.' });
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Unable to export audit log.');
        } finally {
            setIsExportingAudit(false);
        }
    };

    const handleDeleteWebhook = async (webhookId: string) => {
        if (!selectedOrganization) return;
        if (!window.confirm('Delete this webhook endpoint? Events will stop sending immediately.')) {
            return;
        }
        setError(null);
        setNotification(null);
        setDeletingWebhookId(webhookId);
        try {
            await apiService.deleteWebhook(selectedOrganization.organization.id, webhookId);
            setWebhooks(prev => prev.filter(webhook => webhook.id !== webhookId));
            setNotification({ type: 'info', message: 'Webhook deleted.' });
        } catch (err) {
            console.error(err);
            setError('Unable to delete webhook.');
        } finally {
            setDeletingWebhookId(null);
        }
    };

    const handleTestWebhook = async (webhookId: string) => {
        if (!selectedOrganization) return;
        setError(null);
        setNotification(null);
        setTestingWebhookId(webhookId);
        try {
            const result = await apiService.testWebhook(selectedOrganization.organization.id, webhookId);
            const now = new Date().toISOString();
            setWebhooks(prev =>
                prev.map(webhook =>
                    webhook.id === webhookId
                        ? {
                              ...webhook,
                              lastDeliveredAt: result?.delivered ? now : webhook.lastDeliveredAt,
                              lastFailureAt: result?.delivered ? webhook.lastFailureAt : now,
                          }
                        : webhook,
                ),
            );
            if (result?.delivered) {
                const statusDetails = result.status ? ` (status ${result.status})` : '';
                setNotification({ type: 'success', message: `Test webhook delivered${statusDetails}.` });
            } else {
                setNotification({ type: 'info', message: 'Test webhook request could not be delivered.' });
            }
        } catch (err) {
            console.error(err);
            setError('Unable to send test webhook.');
        } finally {
            setTestingWebhookId(null);
        }
    };

    const handleChangeMemberRole = async (memberId: string, role: OrganizationRole) => {
        if (!selectedOrganization) return;
        setError(null);
        setNotification(null);
        setUpdatingMemberId(memberId);
        try {
            const membership = await apiService.updateMemberRole(selectedOrganization.organization.id, memberId, role);
            setMembers(prev =>
                prev.map(member =>
                    member.membership.id === memberId
                        ? { ...member, membership: { ...member.membership, role: membership.role, lastActiveAt: membership.lastActiveAt } }
                        : member,
                ),
            );
            setNotification({ type: 'success', message: 'Member role updated.' });
        } catch (err) {
            console.error(err);
            setError('Unable to update member role.');
        } finally {
            setUpdatingMemberId(null);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!selectedOrganization) return;
        if (!window.confirm('Remove this member from the workspace?')) {
            return;
        }
        setError(null);
        setNotification(null);
        setRemovingMemberId(memberId);
        try {
            await apiService.removeMember(selectedOrganization.organization.id, memberId);
            setMembers(prev => prev.filter(member => member.membership.id !== memberId));
            setNotification({ type: 'info', message: 'Member removed.' });
        } catch (err) {
            console.error(err);
            setError('Unable to remove member.');
        } finally {
            setRemovingMemberId(null);
        }
    };

    const handleStartTrial = async (planId: string) => {
        if (!selectedOrganization) return;
        setError(null);
        setNotification(null);
        const result = await startTrial(planId, { organizationId: selectedOrganization.organization.id });
        if (result.status === 'requires-auth') {
            return;
        }
        if (result.status === 'error') {
            console.error(result.message);
            setError('Unable to start a trial.');
            return;
        }
        if (result.status === 'success') {
            setNotification({ type: 'success', message: 'Trial started for this workspace.' });
        }
    };

    const handleUpgrade = async (planId: string, cadence: 'monthly' | 'yearly') => {
        if (!selectedOrganization) return;
        setError(null);
        setNotification(null);
        const result = await upgradePlan(planId, cadence, { organizationId: selectedOrganization.organization.id });
        if (result.status === 'requires-auth') {
            return;
        }
        if (result.status === 'error') {
            console.error(result.message);
            setError('Unable to start checkout.');
            return;
        }
        if (result.status === 'success') {
            const checkoutUrl = result.data?.checkoutUrl;
            if (checkoutUrl) {
                window.open(checkoutUrl, '_blank', 'noopener');
                setNotification({ type: 'info', message: 'Checkout opened in a new tab.' });
            }
        }
    };

    const handleOpenPortal = async () => {
        if (!selectedOrganization) return;
        setError(null);
        setNotification(null);
        const result = await openPortal({ organizationId: selectedOrganization.organization.id });
        if (result.status === 'requires-auth') {
            return;
        }
        if (result.status === 'error') {
            console.error(result.message);
            setError('Unable to open billing portal.');
            return;
        }
        if (result.status === 'success') {
            const portalUrl = result.data?.url;
            if (portalUrl) {
                window.open(portalUrl, '_blank', 'noopener');
            }
        }
    };

    if (isBootstrapping && organizations.length === 0) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#05070f] text-slate-300">
                <p className="text-xs font-semibold uppercase tracking-[0.45em] text-indigo-200/80">
                    Preparing workspace console…
                </p>
            </div>
        );
    }

    const canManagePolicies = selectedOrganization
        ? ['owner', 'admin'].includes(selectedOrganization.membership.role)
        : false;

    const headerActions = (
        <Link
            to="/"
            className="rounded-2xl border border-indigo-400/50 bg-indigo-500/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-100 transition hover:bg-indigo-500/40"
        >
            Return to composer
        </Link>
    );

    return (
        <AppShell
            eyebrow="Operations"
            title="Workspace command center"
            description="Administer organizations, rotate credentials, and monitor automations with a Nimbus Guardian inspired interface."
            actions={headerActions}
            headerContent={
                <WorkspaceSummaryBar
                    organization={selectedOrganization ?? undefined}
                    usage={usageSnapshot}
                    isLoading={isBootstrapping || detailLoading || isUsageLoading}
                />
            }
        >
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 sm:px-10">
                {error && <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />}
                {notification && (
                    <NotificationBanner
                        type={notification.type}
                        message={notification.message}
                        onDismiss={() => setNotification(null)}
                    />
                )}

                <WorkspaceHeader
                    organizations={organizations}
                    selectedOrganization={selectedOrganization ?? undefined}
                    isSwitching={isSwitchingOrg}
                    newWorkspaceName={newWorkspaceName}
                    onWorkspaceNameChange={setNewWorkspaceName}
                    onCreateWorkspace={handleCreateWorkspace}
                    onSelectOrganization={handleSwitchOrganization}
                    isCreatingWorkspace={isCreatingWorkspace}
                />

                <AccessPoliciesSection
                    policy={authPolicy}
                    loading={isAuthPolicyLoading}
                    updating={isUpdatingAuthPolicy}
                    canManage={canManagePolicies}
                    organizationName={selectedOrganization?.organization.name}
                    onSave={handleSaveAuthPolicy}
                />

                <div className="grid gap-6 lg:grid-cols-2">
                    <TeamMembersSection
                        members={members}
                        onChangeRole={handleChangeMemberRole}
                        onRemoveMember={handleRemoveMember}
                        updatingMemberId={updatingMemberId}
                        removingMemberId={removingMemberId}
                    />
                    <InvitationsSection
                        invitations={invitations}
                        email={inviteEmail}
                        role={inviteRole}
                        onEmailChange={setInviteEmail}
                        onRoleChange={setInviteRole}
                        onInvite={handleInvite}
                        onRevoke={handleRevokeInvitation}
                        isInviting={isInviting}
                        revokingInvitationId={revokingInvitationId}
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <ApiKeysSection
                        apiKeys={apiKeys}
                        availableScopes={AVAILABLE_SCOPES}
                        selectedScopes={apiKeyScopes}
                        apiKeyName={apiKeyName}
                        onApiKeyNameChange={setApiKeyName}
                        onToggleScope={scope =>
                            setApiKeyScopes(prev =>
                                prev.includes(scope) ? prev.filter(item => item !== scope) : [...prev, scope],
                            )
                        }
                        expiresAt={apiKeyExpiresAt}
                        onExpiresAtChange={setApiKeyExpiresAt}
                        onCreateKey={handleCreateApiKey}
                        creatingKey={creatingApiKey}
                        newKey={newKey}
                        onRevokeKey={handleRevokeApiKey}
                        revokingKeyId={revokingApiKeyId}
                    />
                    <WebhooksSection
                        webhooks={webhooks}
                        availableEvents={AVAILABLE_EVENTS}
                        selectedEvents={webhookEvents}
                        onToggleEvent={event =>
                            setWebhookEvents(prev =>
                                prev.includes(event) ? prev.filter(item => item !== event) : [...prev, event],
                            )
                        }
                        url={webhookUrl}
                        onUrlChange={setWebhookUrl}
                        onCreateWebhook={handleCreateWebhook}
                        creatingWebhook={creatingWebhook}
                        onTestWebhook={handleTestWebhook}
                        onDeleteWebhook={handleDeleteWebhook}
                        testingWebhookId={testingWebhookId}
                        deletingWebhookId={deletingWebhookId}
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <BillingSummary
                        authState={authState}
                        plans={billingPlans}
                        usage={usageSnapshot}
                        onStartTrial={handleStartTrial}
                        onUpgrade={handleUpgrade}
                        onOpenPortal={handleOpenPortal}
                        isActionLoading={billingActionLoading || isUsageLoading || detailLoading}
                    />
                    <AuditLogSection
                        auditLog={auditLog}
                        isLoading={detailLoading}
                        exportSince={auditExportSince}
                        onExportSinceChange={setAuditExportSince}
                        onExport={handleExportAuditLog}
                        isExporting={isExportingAudit}
                    />
                </div>
            </div>
        </AppShell>
    );
};

export default WorkspaceSettings;

