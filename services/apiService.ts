import {
    AuthState,
    ChatMessage,
    IntegrationName,
    ProfileSource,
    StyleProfile,
    Subscription,
    SubscriptionPlan,
    IntegrationSummary,
    UsageRecord,
    SubscriptionTier,
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
    if (!res.ok) {
        // Try to parse the error body, fall back to status text
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        // Create a custom error with the status for better handling
        throw new ApiError(errorData.message || 'An unknown error occurred.', res.status);
    }
    return res.json();
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
            return { isAuthenticated: false, user: null, license: null };
        }
        return handleResponse(res);
    } catch (err) {
        // Handle network error specifically for the initial auth check
         console.error("Auth fetch failed:", err);
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
    provider?: string;
}

export const continueConversation = async (payload: ContinueConversationPayload & { provider?: string }): Promise<ChatMessage> => {
    return apiRequest('/api/chat/continue', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};

export const getSampleCount = async (source: 'gmail' | 'facebook'): Promise<{ source: string, count: number }> => {
    return apiRequest(`/api/chat/sample-count?source=${source}`);
};

export const getBillingPlans = async (): Promise<SubscriptionPlan[]> => {
    return apiRequest('/api/billing/plans');
};

export const getSubscription = async (): Promise<{ subscription: Subscription | null }> => {
    return apiRequest('/api/billing/subscription');
};

export const updateSubscription = async (planId: SubscriptionTier): Promise<{ subscription: Subscription }> => {
    return apiRequest('/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ planId }),
    });
};

export const getUsage = async (): Promise<{ usage: UsageRecord; subscription: Subscription | null; withinAllowance: boolean }> => {
    return apiRequest('/api/billing/usage');
};

export const getIntegrations = async (): Promise<{ integrations: IntegrationSummary[] }> => {
    return apiRequest('/api/integrations');
};

export const connectIntegration = async (integration: IntegrationName): Promise<{ message: string }> => {
    return apiRequest('/api/integrations/connect', {
        method: 'POST',
        body: JSON.stringify({ integration }),
    });
};

export const disconnectIntegration = async (integration: IntegrationName): Promise<{ message: string }> => {
    return apiRequest('/api/integrations/disconnect', {
        method: 'POST',
        body: JSON.stringify({ integration }),
    });
};

export const getWebhookSecret = async (): Promise<{ secret: string }> => {
    return apiRequest('/api/integrations/webhook-secret');
};