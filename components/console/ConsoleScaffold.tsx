import React from 'react';
import AppShell from '../layout/AppShell';
import Sidebar from '../Sidebar';
import AuthModal from '../AuthModal';
import WorkspaceSummaryBar from '../dashboard/WorkspaceSummaryBar';
import { IntegrationName, OrganizationSummary, UsageSnapshot } from '../../types';
import { ConsolePageState } from '../../hooks/useConsolePageState';
import { useGuardedHandler } from '../../hooks/useGuardedHandler';

interface ConsoleScaffoldProps {
    state: ConsolePageState;
    eyebrow?: string;
    title?: string;
    description?: string;
    actions?: React.ReactNode;
    headerContent?: React.ReactNode;
    summaryOrganization?: OrganizationSummary | null;
    summaryUsage?: UsageSnapshot | null;
    summaryLoading?: boolean;
    banner?: React.ReactNode;
    children: React.ReactNode;
    showSidebar?: boolean;
    sidebarOverrides?: {
        onProfileSelect?: (id: string) => void | Promise<void>;
        onProfileCreate?: () => void | Promise<void>;
        onLogout?: () => void | Promise<void>;
        onDisconnect?: (integration: IntegrationName) => void | Promise<void>;
        onStartTrial?: (planId: string) => void | Promise<void>;
        onUpgrade?: (planId: string, cadence: 'monthly' | 'yearly') => void | Promise<void>;
        onOpenPortal?: () => void | Promise<void>;
        onOrganizationChange?: (organizationId: string) => void | Promise<void>;
    };
}

const ConsoleScaffold: React.FC<ConsoleScaffoldProps> = ({
    state,
    eyebrow,
    title,
    description,
    actions,
    headerContent,
    summaryOrganization,
    summaryUsage,
    summaryLoading,
    banner,
    children,
    showSidebar = true,
    sidebarOverrides,
}) => {
    const {
        authState,
        billingPlans,
        usageSnapshot,
        organizations,
        activeOrganizationId,
        activeOrganization,
        profiles,
        activeProfileId,
        selectProfile,
        switchOrganization,
        logout,
        billingActions,
        authModal,
        ensureAuthenticated,
        guardWithAuth,
    } = state;

    const { isLoading: isBillingActionLoading, startTrial, upgradePlan, openPortal } = billingActions;
    const { isOpen: isAuthModalOpen, close: closeAuthModal } = authModal;

    const guardedProfileSelect = useGuardedHandler(guardWithAuth, selectProfile);

    const guardedStartTrial = useGuardedHandler(guardWithAuth, startTrial);

    const guardedUpgradePlan = useGuardedHandler(guardWithAuth, upgradePlan);

    const guardedOpenPortal = useGuardedHandler(guardWithAuth, openPortal);

    const guardedSwitchOrganization = useGuardedHandler(guardWithAuth, switchOrganization);

    const defaultProfileSelect = React.useCallback(
        (id: string) => {
            void guardedProfileSelect(id);
        },
        [guardedProfileSelect],
    );

    const defaultLogout = React.useCallback(() => {
        void logout();
    }, [logout]);

    const defaultStartTrial = React.useCallback(
        (planId: string) => {
            void guardedStartTrial(planId);
        },
        [guardedStartTrial],
    );

    const defaultUpgradePlan = React.useCallback(
        (planId: string, cadence: 'monthly' | 'yearly') => {
            void guardedUpgradePlan(planId, cadence);
        },
        [guardedUpgradePlan],
    );

    const defaultOpenPortal = React.useCallback(() => {
        void guardedOpenPortal();
    }, [guardedOpenPortal]);

    const defaultSwitchOrganization = React.useCallback(
        (organizationId: string) => {
            void guardedSwitchOrganization(organizationId);
        },
        [guardedSwitchOrganization],
    );

    const defaultProfileCreate = React.useCallback(() => {
        void ensureAuthenticated({ openModal: true });
    }, [ensureAuthenticated]);

    const defaultDisconnect = React.useCallback(() => {
        void ensureAuthenticated({ openModal: true });
    }, [ensureAuthenticated]);

    const sidebar = showSidebar
        ? (
              <Sidebar
                  authState={authState}
                  profiles={profiles}
                  activeProfileId={activeProfileId}
                  onProfileSelect={sidebarOverrides?.onProfileSelect ?? defaultProfileSelect}
                  onProfileCreate={sidebarOverrides?.onProfileCreate ?? defaultProfileCreate}
                  onLogout={sidebarOverrides?.onLogout ?? defaultLogout}
                  onDisconnect={sidebarOverrides?.onDisconnect ?? defaultDisconnect}
                  billingPlans={billingPlans}
                  usage={usageSnapshot}
                  onStartTrial={sidebarOverrides?.onStartTrial ?? defaultStartTrial}
                  onUpgrade={sidebarOverrides?.onUpgrade ?? defaultUpgradePlan}
                  onOpenPortal={sidebarOverrides?.onOpenPortal ?? defaultOpenPortal}
                  isBillingActionLoading={isBillingActionLoading}
                  organizations={organizations}
                  activeOrganizationId={activeOrganizationId}
                  onOrganizationChange={sidebarOverrides?.onOrganizationChange ?? defaultSwitchOrganization}
              />
          )
        : undefined;

    const resolvedSummaryOrganization = summaryOrganization ?? activeOrganization ?? null;
    const resolvedSummaryUsage = summaryUsage ?? usageSnapshot;
    const resolvedSummaryLoading = summaryLoading ?? state.isBootstrapping;

    const resolvedHeaderContent =
        headerContent !== undefined
            ? headerContent
            : (
                  <WorkspaceSummaryBar
                      organization={resolvedSummaryOrganization ?? undefined}
                      usage={resolvedSummaryUsage}
                      isLoading={resolvedSummaryLoading}
                  />
              );

    return (
        <>
            <AppShell
                sidebar={sidebar}
                eyebrow={eyebrow}
                title={title}
                description={description}
                actions={actions}
                headerContent={resolvedHeaderContent}
            >
                {banner}
                {children}
            </AppShell>
            {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />}
        </>
    );
};

export default ConsoleScaffold;
