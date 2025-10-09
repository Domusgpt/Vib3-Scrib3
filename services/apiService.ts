import { AuthState, ChatMessage, IntegrationName, LLMProvider, ProfileSource, StyleProfile } from '../types';

import { ApiError, withJson } from './shared';

const fetch_retry = async (url: RequestInfo | URL, options: RequestInit | undefined, n: number): Promise<Response> => {
    try {
        return await fetch(url, options);
    } catch (err) {
        if (n === 1) throw err;
        await new Promise(resolve => setTimeout(resolve, (5 - n) * 1000));
        return fetch_retry(url, options, n - 1);
    }
};

const handleResponse = async (res: Response) => {
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        throw new ApiError(errorData.message || 'An unknown error occurred.', res.status);
    }
    return res.json();
};

const apiRequest = async (url: string, options: RequestInit = {}) => {
    try {
        const res = await fetch_retry(url, withJson(options), 3);
        return handleResponse(res);
    } catch (err) {
        if (err instanceof ApiError) {
            throw err;
        }
        throw new Error('Network error: Could not connect to the server.');
    }
};

export const getAuthState = async (): Promise<AuthState> => {
    try {
        const res = await fetch('/auth/user', { credentials: 'include' });
        if (res.status === 401 || res.status === 404) {
            return { isAuthenticated: false, user: null, license: null };
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

export interface ProfilesResponse {
    profiles: StyleProfile[];
    activeProfileId: string | null;
}

export const getProfiles = async (): Promise<ProfilesResponse> => {
    return apiRequest('/api/profiles');
};

export const setActiveProfile = async (id: string): Promise<{ activeProfileId: string }> => {
    return apiRequest('/api/profiles/active', withJson({
        method: 'POST',
        body: JSON.stringify({ id }),
    }));
};

export interface CreateProfileResponse {
    profile: StyleProfile;
    activeProfileId: string;
}

export const createManualProfile = async (name: string, source: ProfileSource, samples?: string): Promise<CreateProfileResponse> => {
    return apiRequest('/api/profiles', withJson({
        method: 'POST',
        body: JSON.stringify({ name, source: source.type, samples }),
    }));
};

export interface ContinueConversationPayload {
    prompt: string;
    history: ChatMessage[];
    provider?: LLMProvider;
    context?: {
        activeProfileId?: string | null;
    };
}

export const continueConversation = async (payload: ContinueConversationPayload): Promise<ChatMessage> => {
    return apiRequest('/api/chat/continue', withJson({
        method: 'POST',
        body: JSON.stringify(payload),
    }));
};

export const disconnectIntegration = async (integration: IntegrationName): Promise<void> => {
    await apiRequest('/api/integrations/disconnect', withJson({
        method: 'POST',
        body: JSON.stringify({ provider: integration }),
    }));
};

export const connectIntegration = async (integration: IntegrationName, scopes: string[] = []): Promise<void> => {
    await apiRequest('/api/integrations/connect', withJson({
        method: 'POST',
        body: JSON.stringify({ provider: integration, scopes }),
    }));
};
