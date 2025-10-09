import { PlatformOverview } from '../types';

import { ApiError, withJson } from './shared';

const API_PREFIX = '/api/platform';

export const fetchOverview = async (): Promise<PlatformOverview> => {
    const res = await fetch(`${API_PREFIX}/overview`, { credentials: 'include' });
    if (res.status === 401) {
        throw new ApiError('Unauthorized', 401);
    }
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new ApiError(error.message || 'Failed to load platform overview.', res.status);
    }
    return res.json();
};

export const createApiKey = async (label: string) => {
    const res = await fetch(`${API_PREFIX}/api-keys`, withJson({
        method: 'POST',
        body: JSON.stringify({ label }),
    }));
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || 'Failed to create API key.');
    }
    return res.json();
};

export const revokeApiKey = async (id: string) => {
    const res = await fetch(`${API_PREFIX}/api-keys/${id}`, withJson({
        method: 'DELETE',
    }));
    if (!res.ok) {
        throw new Error('Failed to revoke API key.');
    }
};

export const requestCheckout = async (planId: string, billingInterval: 'monthly' | 'yearly' = 'monthly') => {
    const res = await fetch('/api/billing/checkout', withJson({
        method: 'POST',
        body: JSON.stringify({ planId, billingInterval }),
    }));
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || 'Failed to initiate checkout.');
    }
    return res.json();
};

export const activatePlan = async (planId: string, billingInterval: 'monthly' | 'yearly' = 'monthly') => {
    const res = await fetch('/api/billing/activate', withJson({
        method: 'POST',
        body: JSON.stringify({ planId, billingInterval }),
    }));
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || 'Failed to activate plan.');
    }
    return res.json();
};
