import {
    ApiKeySummary,
    ApiKeyWithSecret,
    ApiScope,
    AuditLog,
    AuthState,
    BillingPlan,
    ChatMessage,
    IntegrationName,
    IntegrationSummary,
    Invitation,
    Membership,
    OrganizationMember,
    OrganizationRole,
    OrganizationSummary,
    WorkspacePulse,
    UsageTrendPoint,
    IncidentInsight,
    ProfileSource,
    StyleProfile,
    UsageSnapshot,
    WebhookEvent,
    WebhookSubscription,
} from '../types';

class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}


const fetch_retry = async (url: RequestInfo | URL, options: RequestInit | undefined, n: number): Promise<Response> => {
    try {
        return await fetch(url, options);
    } catch (err) {
        if (n === 1) throw err;
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, (5 - n) * 1000));
        return fetch_retry(url, options, n - 1);
    }
};

const handleResponse = async (res: Response) => {
    const rawText = await res.text();

    if (!res.ok) {
        let message = res.statusText;
        if (rawText) {
            try {
                const parsed = JSON.parse(rawText);
                message = (parsed && typeof parsed === 'object' ? parsed.message : undefined) ?? message;
            } catch {
                message = rawText;
            }
        }
        throw new ApiError(message || 'An unknown error occurred.', res.status);
    }

    if (!rawText) {
        return null;
    }

    try {
        return JSON.parse(rawText);
    } catch {
        return rawText as unknown;
    }
};

const apiRequest = async (url: string, options: RequestInit = {}) => {
    try {
        const res = await fetch_retry(url, {
            ...options,
            headers: { 'Content-Type': 'application/json', ...options.headers },
        }, 3);
        return handleResponse(res);
    } catch (err) {
        if (err instanceof ApiError) {
            // Re-throw the custom error for the component to handle
            throw err;
        }
        // Handle network errors or other fetch-related issues
        throw new Error('Network error: Could not connect to the server.');
    }
};


export const getAuthState = async (): Promise<AuthState> => {
    try {
        const res = await fetch('/auth/user');
        if (res.status === 401 || res.status === 404) {
            return { isAuthenticated: false, user: null, license: null, subscription: null, usage: null };
        }
        return handleResponse(res);
    } catch (err) {
        console.error('Auth fetch failed:', err);
        throw new Error('Network error: Could not connect to the server.');
    }
};

export const logout = async (): Promise<{ message: string }> => {
    return apiRequest('/auth/logout', { method: 'POST' });
};

export const getProfiles = async (): Promise<StyleProfile[]> => {
    return apiRequest('/api/profiles');
};

export const setActiveProfile = async (id: string): Promise<{ activeProfileId: string }> => {
    return apiRequest('/api/profiles/active', {
        method: 'POST',
        body: JSON.stringify({ id }),
    });
};

export interface CreateProfileResponse {
    message: string;
    profile: StyleProfile;
}

// This function is now deprecated in the client. The AI handles profile creation.
// Kept for potential future use or manual overrides.
export const createManualProfile = async (name: string, source: ProfileSource): Promise<CreateProfileResponse> => {
    return apiRequest('/api/profiles', {
        method: 'POST',
        body: JSON.stringify({ name, source }),
    });
};

export interface ContinueConversationPayload {
    prompt: string;
    history: ChatMessage[];
    context: {
        activeProfileId?: string | null;
    };
}

export const continueConversation = async (payload: ContinueConversationPayload): Promise<ChatMessage> => {
    return apiRequest('/api/chat/continue', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};

export const getSampleCount = async (source: 'gmail' | 'facebook'): Promise<{ source: string, count: number }> => {
    return apiRequest(`/api/sample-count?source=${source}`);
};


export const disconnectIntegration = async (integration: IntegrationName): Promise<{ message: string }> => {
    return apiRequest('/api/integrations/disconnect', {
        method: 'POST',
        body: JSON.stringify({ integration }),
    });
};

export interface IntegrationOverviewResponse {
    integrations: IntegrationSummary[];
    generatedAt: string;
}

export const getIntegrationOverview = async (): Promise<IntegrationOverviewResponse> => {
    return apiRequest('/api/integrations');
};

export const getBillingPlans = async (): Promise<BillingPlan[]> => {
    return apiRequest('/api/billing/plans');
};

export const getUsage = async (organizationId?: string): Promise<UsageSnapshot | null> => {
    const query = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
    return apiRequest(`/api/billing/usage${query}`);
};

export const startTrial = async (planId: string, organizationId?: string) => {
    return apiRequest('/api/billing/trial', {
        method: 'POST',
        body: JSON.stringify({ planId, organizationId }),
    });
};

export const createCheckoutSession = async (
    planId: string,
    cadence: 'monthly' | 'yearly',
    organizationId?: string,
) => {
    return apiRequest('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ planId, cadence, organizationId }),
    });
};

export const openBillingPortal = async (organizationId?: string): Promise<{ url: string }> => {
    return apiRequest('/api/billing/portal', {
        method: 'POST',
        body: JSON.stringify({ organizationId }),
    });
};

export const getWorkspacePulse = async (organizationId?: string): Promise<WorkspacePulse> => {
    const query = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
    return apiRequest(`/api/analytics/pulse${query}`);
};

export const getUsageTrend = async (
    organizationId?: string,
    months = 6,
): Promise<UsageTrendPoint[]> => {
    const params = new URLSearchParams();
    if (organizationId) {
        params.set('organizationId', organizationId);
    }
    if (months) {
        params.set('months', String(months));
    }
    const query = params.toString();
    const response = await apiRequest(`/api/analytics/usage-trend${query ? `?${query}` : ''}`);
    return response.trend as UsageTrendPoint[];
};

export const getIncidentFeed = async (
    organizationId?: string,
    limit = 8,
): Promise<IncidentInsight[]> => {
    const params = new URLSearchParams();
    if (organizationId) {
        params.set('organizationId', organizationId);
    }
    if (limit) {
        params.set('limit', String(limit));
    }
    const query = params.toString();
    const response = await apiRequest(`/api/analytics/incidents${query ? `?${query}` : ''}`);
    return response.incidents as IncidentInsight[];
};

export const getOrganizations = async (): Promise<{
    organizations: OrganizationSummary[];
    activeOrganizationId: string | null;
}> => {
    return apiRequest('/api/organizations');
};

export const createOrganization = async (name: string, planId?: string) => {
    return apiRequest('/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name, planId }),
    });
};

export const setActiveOrganization = async (organizationId: string) => {
    return apiRequest('/api/organizations/active', {
        method: 'POST',
        body: JSON.stringify({ organizationId }),
    });
};

export const getOrganizationMembers = async (organizationId: string): Promise<OrganizationMember[]> => {
    return apiRequest(`/api/organizations/${organizationId}/members`);
};

export const getOrganizationInvitations = async (organizationId: string): Promise<Invitation[]> => {
    return apiRequest(`/api/organizations/${organizationId}/invitations`);
};

export const inviteMember = async (
    organizationId: string,
    email: string,
    role: OrganizationRole,
): Promise<Invitation> => {
    return apiRequest(`/api/organizations/${organizationId}/invitations`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
    });
};

export const revokeInvitation = async (organizationId: string, invitationId: string) => {
    return apiRequest(`/api/organizations/${organizationId}/invitations/${invitationId}`, {
        method: 'DELETE',
    });
};

export const updateMemberRole = async (
    organizationId: string,
    memberId: string,
    role: OrganizationRole,
): Promise<Membership> => {
    return apiRequest(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
    });
};

export const removeMember = async (organizationId: string, memberId: string) => {
    return apiRequest(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: 'DELETE',
    });
};

export const listApiKeys = async (organizationId: string): Promise<ApiKeySummary[]> => {
    return apiRequest(`/api/organizations/${organizationId}/api-keys`);
};

export const createApiKey = async (
    organizationId: string,
    name: string,
    scopes: ApiScope[],
    expiresAt?: string,
): Promise<ApiKeyWithSecret> => {
    return apiRequest(`/api/organizations/${organizationId}/api-keys`, {
        method: 'POST',
        body: JSON.stringify({ name, scopes, expiresAt }),
    });
};

export const revokeApiKey = async (organizationId: string, keyId: string): Promise<ApiKeySummary> => {
    return apiRequest(`/api/organizations/${organizationId}/api-keys/${keyId}`, {
        method: 'DELETE',
    });
};

export const listWebhooks = async (organizationId: string): Promise<WebhookSubscription[]> => {
    return apiRequest(`/api/organizations/${organizationId}/webhooks`);
};

export const createWebhook = async (
    organizationId: string,
    url: string,
    events?: WebhookEvent[],
): Promise<WebhookSubscription> => {
    return apiRequest(`/api/organizations/${organizationId}/webhooks`, {
        method: 'POST',
        body: JSON.stringify({ url, events }),
    });
};

export const deleteWebhook = async (organizationId: string, webhookId: string) => {
    return apiRequest(`/api/organizations/${organizationId}/webhooks/${webhookId}`, {
        method: 'DELETE',
    });
};

export const testWebhook = async (organizationId: string, webhookId: string) => {
    return apiRequest(`/api/organizations/${organizationId}/webhooks/${webhookId}/test`, {
        method: 'POST',
    });
};

export const getAuditLog = async (organizationId: string): Promise<AuditLog[]> => {
    return apiRequest(`/api/audit/${organizationId}`);
};