import { useCallback, useEffect, useMemo, useState } from 'react';
import { useConsole } from './useConsoleContext';
import { useBillingActions } from './useBillingActions';

interface UseConsolePageStateOptions {
    billingOrganizationId?: string | null;
    autoOpenAuthModal?: boolean;
    onRequireAuth?: () => void;
    refreshUsage?: (organizationId?: string) => Promise<unknown>;
}

export const useConsolePageState = ({
    billingOrganizationId = null,
    autoOpenAuthModal = false,
    onRequireAuth,
    refreshUsage,
}: UseConsolePageStateOptions = {}) => {
    const consoleState = useConsole();
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);

    const resolvedOrganizationId = useMemo(() => {
        return (
            billingOrganizationId
                ?? consoleState.activeOrganization?.organization.id
                ?? consoleState.activeOrganizationId
                ?? consoleState.organizations[0]?.organization.id
                ?? null
        );
    }, [
        billingOrganizationId,
        consoleState.activeOrganization,
        consoleState.activeOrganizationId,
        consoleState.organizations,
    ]);

    const handleRequireAuth = useCallback(() => {
        if (autoOpenAuthModal) {
            setAuthModalOpen(true);
        }
        onRequireAuth?.();
    }, [autoOpenAuthModal, onRequireAuth]);

    useEffect(() => {
        if (consoleState.authState.isAuthenticated) {
            setAuthModalOpen(false);
        }
    }, [consoleState.authState.isAuthenticated]);

    const billingActions = useBillingActions({
        authState: consoleState.authState,
        activeOrganizationId: resolvedOrganizationId,
        refreshAuthState: consoleState.refreshAuthState,
        refreshUsage: refreshUsage ?? consoleState.refreshUsage,
        onRequireAuth: autoOpenAuthModal || onRequireAuth ? handleRequireAuth : onRequireAuth,
    });

    const openAuthModal = useCallback(() => setAuthModalOpen(true), []);
    const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

    const requireAuth = useCallback(
        (onAuthenticated?: () => void) => {
            if (consoleState.authState.isAuthenticated) {
                onAuthenticated?.();
                return true;
            }

            handleRequireAuth();
            return false;
        },
        [consoleState.authState.isAuthenticated, handleRequireAuth],
    );

    return {
        ...consoleState,
        activeOrganization: consoleState.activeOrganization ?? null,
        billingActions,
        billingOrganizationId: resolvedOrganizationId,
        requireAuth,
        authModal: {
            isOpen: isAuthModalOpen,
            open: openAuthModal,
            close: closeAuthModal,
        },
    } as const;
};

