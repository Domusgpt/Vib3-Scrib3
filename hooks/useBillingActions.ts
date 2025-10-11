import { useCallback, useState } from 'react';
import * as apiService from '../services/apiService';
import { AuthState } from '../types';

interface UseBillingActionsOptions {
    authState: AuthState;
    activeOrganizationId?: string | null;
    refreshAuthState?: () => Promise<AuthState>;
    refreshUsage?: (organizationId?: string) => Promise<unknown>;
    onRequireAuth?: () => void;
}

interface BillingActionOptions {
    organizationId?: string | null;
}

export type BillingActionResult<T = void> =
    | { status: 'success'; data?: T }
    | { status: 'error'; message: string }
    | { status: 'requires-auth' };

export const useBillingActions = ({
    authState,
    activeOrganizationId = null,
    refreshAuthState,
    refreshUsage,
    onRequireAuth,
}: UseBillingActionsOptions) => {
    const [isLoading, setIsLoading] = useState(false);

    const ensureAuthenticated = useCallback(() => {
        if (!authState.isAuthenticated) {
            onRequireAuth?.();
            return false;
        }
        return true;
    }, [authState.isAuthenticated, onRequireAuth]);

    const resolveOrganizationId = useCallback(
        (override?: string | null) => {
            const resolved = override ?? activeOrganizationId ?? undefined;
            return resolved ?? undefined;
        },
        [activeOrganizationId],
    );

    const runSideEffects = useCallback(
        async (organizationId: string | undefined) => {
            const tasks: Array<Promise<unknown>> = [];
            if (refreshAuthState) {
                tasks.push(refreshAuthState());
            }
            if (refreshUsage) {
                tasks.push(refreshUsage(organizationId));
            }
            if (tasks.length > 0) {
                await Promise.all(tasks);
            }
        },
        [refreshAuthState, refreshUsage],
    );

    const startTrial = useCallback(
        async (planId: string, options: BillingActionOptions = {}): Promise<BillingActionResult> => {
            if (!ensureAuthenticated()) {
                return { status: 'requires-auth' };
            }

            const organizationId = resolveOrganizationId(options.organizationId);
            setIsLoading(true);

            try {
                await apiService.startTrial(planId, organizationId);
                await runSideEffects(organizationId);
                return { status: 'success' };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unable to start trial.';
                return { status: 'error', message };
            } finally {
                setIsLoading(false);
            }
        },
        [ensureAuthenticated, resolveOrganizationId, runSideEffects],
    );

    const upgradePlan = useCallback(
        async (
            planId: string,
            cadence: 'monthly' | 'yearly',
            options: BillingActionOptions = {},
        ): Promise<BillingActionResult<{ checkoutUrl: string }>> => {
            if (!ensureAuthenticated()) {
                return { status: 'requires-auth' };
            }

            const organizationId = resolveOrganizationId(options.organizationId);
            setIsLoading(true);

            try {
                const { checkoutUrl } = await apiService.createCheckoutSession(planId, cadence, organizationId);
                return { status: 'success', data: { checkoutUrl } };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unable to start checkout session.';
                return { status: 'error', message };
            } finally {
                setIsLoading(false);
            }
        },
        [ensureAuthenticated, resolveOrganizationId],
    );

    const openPortal = useCallback(
        async (options: BillingActionOptions = {}): Promise<BillingActionResult<{ url: string }>> => {
            if (!ensureAuthenticated()) {
                return { status: 'requires-auth' };
            }

            const organizationId = resolveOrganizationId(options.organizationId);
            setIsLoading(true);

            try {
                const { url } = await apiService.openBillingPortal(organizationId);
                return { status: 'success', data: { url } };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unable to open billing portal.';
                return { status: 'error', message };
            } finally {
                setIsLoading(false);
            }
        },
        [ensureAuthenticated, resolveOrganizationId],
    );

    return {
        isLoading,
        startTrial,
        upgradePlan,
        openPortal,
    } as const;
};

