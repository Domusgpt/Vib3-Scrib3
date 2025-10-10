import { useCallback, useMemo, useState } from 'react';
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

    const ensureAuthenticated = useCallback(
        (options: { openModal?: boolean } = {}) => {
            if (consoleState.authState.isAuthenticated) {
                return true;
            }

            const shouldOpenModal = options.openModal ?? autoOpenAuthModal;
            if (shouldOpenModal) {
                setAuthModalOpen(true);
            }

            onRequireAuth?.();
            return false;
        },
        [autoOpenAuthModal, consoleState.authState.isAuthenticated, onRequireAuth],
    );

    const requireAuthentication = useCallback(
        <Args extends unknown[], ReturnType>(
            action: (...args: Args) => ReturnType,
            options: { openModal?: boolean } = {},
        ) => {
            return (...args: Args): ReturnType | undefined => {
                if (!ensureAuthenticated(options)) {
                    return undefined;
                }
                return action(...args);
            };
        },
        [ensureAuthenticated],
    );

    const guardWithAuth = useCallback(
        <Args extends unknown[], ReturnType>(
            action: (...args: Args) => ReturnType,
            options: { openModal?: boolean } = {},
        ) =>
            requireAuthentication(action, {
                ...options,
                openModal: options.openModal ?? true,
            }),
        [requireAuthentication],
    );

    const billingActions = useBillingActions({
        authState: consoleState.authState,
        activeOrganizationId: resolvedOrganizationId,
        refreshAuthState: consoleState.refreshAuthState,
        refreshUsage: refreshUsage ?? consoleState.refreshUsage,
        onRequireAuth: () => {
            void ensureAuthenticated({ openModal: autoOpenAuthModal });
        },
    });

    const openAuthModal = useCallback(() => setAuthModalOpen(true), []);
    const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

    return {
        ...consoleState,
        activeOrganization: consoleState.activeOrganization ?? null,
        billingActions,
        billingOrganizationId: resolvedOrganizationId,
        ensureAuthenticated,
        requireAuthentication,
        guardWithAuth,
        authModal: {
            isOpen: isAuthModalOpen,
            open: openAuthModal,
            close: closeAuthModal,
        },
    } as const;
};

export type ConsolePageState = ReturnType<typeof useConsolePageState>;

