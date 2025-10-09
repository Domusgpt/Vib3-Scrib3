import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BillingSummary from '../components/billing/BillingSummary';
import NotificationBanner from '../components/workspace/NotificationBanner';
import WorkspaceHeader from '../components/workspace/WorkspaceHeader';
import TeamMembersSection from '../components/workspace/TeamMembersSection';
import InvitationsSection from '../components/workspace/InvitationsSection';
import ApiKeysSection from '../components/workspace/ApiKeysSection';
import WebhooksSection from '../components/workspace/WebhooksSection';
import AuditLogSection from '../components/workspace/AuditLogSection';
import AppShell from '../components/layout/AppShell';
import WorkspaceSummaryBar from '../components/dashboard/WorkspaceSummaryBar';
import {
    ApiKeySummary,
    ApiKeyWithSecret,
    ApiScope,
    AuditLog,
    BillingPlan,
    Invitation,
    OrganizationMember,
    OrganizationRole,
    OrganizationSummary,
    UsageSnapshot,
    WebhookEvent,
    WebhookSubscription,
    AuthState,
} from '../types';
import * as apiService from '../services/apiService';

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
    const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
    const selectedOrganization = useMemo(
        () => organizations.find(org => org.organization.id === selectedOrgId) ?? organizations[0],
        [organizations, selectedOrgId],
    );

    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [apiKeys, setApiKeys] = useState<ApiKeySummary[]>([]);
    const [newKey, setNewKey] = useState<ApiKeyWithSecret | null>(null);
    const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
    const [auditLog, setAuditLog] = useState<AuditLog[]>([]);

    const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
    const [usageSnapshot, setUsageSnapshot] = useState<UsageSnapshot | null>(null);

    const [loading, setLoading] = useState(true);
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

    const [billingActionLoading, setBillingActionLoading] = useState(false);

    const workspaceAuthState: AuthState = useMemo(
        () => ({
            isAuthenticated: true,
            user: null,
            license: null,
            subscription: selectedOrganization?.subscription ?? null,
            usage: usageSnapshot,
        }),
        [selectedOrganization?.subscription, usageSnapshot],
    );

    const refreshUsage = useCallback(
        async (organizationId: string) => {
            setIsUsageLoading(true);
            try {
                const usage = await apiService.getUsage(organizationId);
                setUsageSnapshot(usage);
            } catch (err) {
                console.error(err);
                setUsageSnapshot(null);
            } finally {
                setIsUsageLoading(false);
            }
        },
        [],
    );

    const loadOrganizationDetail = useCallback(
        async (organizationId: string) => {
            setDetailLoading(true);
            try {
                const [memberList, invitationList, keys, webhookList, audit] = await Promise.all([
                    apiService.getOrganizationMembers(organizationId),
                    apiService.getOrganizationInvitations(organizationId).catch(() => []),
                    apiService.listApiKeys(organizationId),
                    apiService.listWebhooks(organizationId),
                    apiService.getAuditLog(organizationId).catch(() => []),
                ]);
                setMembers(memberList);
                setInvitations(invitationList);
                setApiKeys(keys);
                setWebhooks(webhookList);
                setAuditLog(audit);
                setError(null);
                await refreshUsage(organizationId);
            } catch (err) {
                console.error(err);
                setError('Unable to load workspace details.');
            } finally {
                setDetailLoading(false);
            }
        },
        [refreshUsage],
    );

    const loadOrganizations = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiService.getOrganizations();
            setOrganizations(response.organizations);
            setSelectedOrgId(response.activeOrganizationId ?? response.organizations[0]?.organization.id ?? null);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Failed to load organizations.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOrganizations();
    }, [loadOrganizations]);

    useEffect(() => {
        if (selectedOrganization) {
            loadOrganizationDetail(selectedOrganization.organization.id);
        }
    }, [loadOrganizationDetail, selectedOrganization]);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const plans = await apiService.getBillingPlans();
                setBillingPlans(plans);
            } catch (err) {
                console.error('Failed to load billing plans', err);
            }
        };
        fetchPlans();
    }, []);

    useEffect(() => {
        if (!notification) return;
        const timeout = window.setTimeout(() => setNotification(null), 6000);
        return () => window.clearTimeout(timeout);
    }, [notification]);

    const handleSwitchOrganization = async (organizationId: string) => {
        setError(null);
        setNotification(null);
        setIsSwitchingOrg(true);
        try {
            await apiService.setActiveOrganization(organizationId);
            setSelectedOrgId(organizationId);
            setNotification({ type: 'info', message: 'Workspace switched.' });
        } catch (err) {
            console.error(err);
            setError('Unable to switch workspace.');
        } finally {
            setIsSwitchingOrg(false);
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
            setError('Failed to send invitation.');
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
            setError('Unable to create API key.');
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

    const handleCreateWorkspace = async () => {
        if (!newWorkspaceName.trim()) return;
        setIsCreatingWorkspace(true);
        setError(null);
        setNotification(null);
        try {
            const summary = await apiService.createOrganization(newWorkspaceName.trim());
            await loadOrganizations();
            setSelectedOrgId(summary.organization.id);
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
        setBillingActionLoading(true);
        setError(null);
        setNotification(null);
        try {
            await apiService.startTrial(planId, selectedOrganization.organization.id);
            await refreshUsage(selectedOrganization.organization.id);
            setNotification({ type: 'success', message: 'Trial started for this workspace.' });
        } catch (err) {
            console.error(err);
            setError('Unable to start a trial.');
        } finally {
            setBillingActionLoading(false);
        }
    };

    const handleUpgrade = async (planId: string, cadence: 'monthly' | 'yearly') => {
        if (!selectedOrganization) return;
        setBillingActionLoading(true);
        setError(null);
        setNotification(null);
        try {
            const session = await apiService.createCheckoutSession(
                planId,
                cadence,
                selectedOrganization.organization.id,
            );
            if (session?.checkoutUrl) {
                window.open(session.checkoutUrl, '_blank', 'noopener');
                setNotification({ type: 'info', message: 'Checkout opened in a new tab.' });
            }
        } catch (err) {
            console.error(err);
            setError('Unable to start checkout.');
        } finally {
            setBillingActionLoading(false);
        }
    };

    const handleOpenPortal = async () => {
        if (!selectedOrganization) return;
        setBillingActionLoading(true);
        setError(null);
        setNotification(null);
        try {
            const portal = await apiService.openBillingPortal(selectedOrganization.organization.id);
            if (portal?.url) {
                window.open(portal.url, '_blank', 'noopener');
            }
        } catch (err) {
            console.error(err);
            setError('Unable to open billing portal.');
        } finally {
            setBillingActionLoading(false);
        }
    };

    if (loading && organizations.length === 0) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#05070f] text-slate-300">
                <p className="text-xs font-semibold uppercase tracking-[0.45em] text-indigo-200/80">
                    Preparing workspace console…
                </p>
            </div>
        );
    }

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
                    organization={selectedOrganization}
                    usage={usageSnapshot}
                    isLoading={loading || detailLoading || isUsageLoading}
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
                    selectedOrganization={selectedOrganization}
                    isSwitching={isSwitchingOrg}
                    newWorkspaceName={newWorkspaceName}
                    onWorkspaceNameChange={setNewWorkspaceName}
                    onCreateWorkspace={handleCreateWorkspace}
                    onSelectOrganization={handleSwitchOrganization}
                    isCreatingWorkspace={isCreatingWorkspace}
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
                        authState={workspaceAuthState}
                        plans={billingPlans}
                        usage={usageSnapshot}
                        onStartTrial={handleStartTrial}
                        onUpgrade={handleUpgrade}
                        onOpenPortal={handleOpenPortal}
                        isActionLoading={billingActionLoading || isUsageLoading || detailLoading}
                    />
                    <AuditLogSection auditLog={auditLog} isLoading={detailLoading} />
                </div>
            </div>
        </AppShell>
    );
};

export default WorkspaceSettings;

