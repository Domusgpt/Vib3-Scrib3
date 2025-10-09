import { useCallback, useEffect, useMemo, useState } from 'react';
import * as apiService from '../services/apiService';
import {
    AuthState,
    BillingPlan,
    OrganizationSummary,
    StyleProfile,
    UsageSnapshot,
} from '../types';

interface ConsoleBootstrapState {
    authState: AuthState;
    billingPlans: BillingPlan[];
    usageSnapshot: UsageSnapshot | null;
    organizations: OrganizationSummary[];
    activeOrganizationId: string | null;
    profiles: StyleProfile[];
    activeProfileId: string | null;
    isBootstrapping: boolean;
    error: string | null;
}

interface ConsoleBootstrapActions {
    initialize: () => Promise<void>;
    refreshAuthState: () => Promise<AuthState>;
    refreshUsage: (organizationId?: string) => Promise<UsageSnapshot | null>;
    reloadProfiles: () => Promise<StyleProfile[]>;
    selectProfile: (profileId: string) => Promise<void>;
    switchOrganization: (organizationId: string) => Promise<void>;
    logout: () => Promise<void>;
}

export const useConsoleBootstrap = (): ConsoleBootstrapState & ConsoleBootstrapActions => {
    const [authState, setAuthState] = useState<AuthState>({
        isAuthenticated: false,
        user: null,
        license: null,
        subscription: null,
        usage: null,
    });
    const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
    const [usageSnapshot, setUsageSnapshot] = useState<UsageSnapshot | null>(null);
    const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
    const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
    const [profiles, setProfiles] = useState<StyleProfile[]>([]);
    const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
    const [isBootstrapping, setIsBootstrapping] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const updateProfilesState = useCallback(
        (nextProfiles: StyleProfile[], explicitActiveId?: string | null) => {
            setProfiles(nextProfiles);
            if (nextProfiles.length === 0) {
                setActiveProfileId(null);
                return;
            }

            const nextActiveId = explicitActiveId
                ?? activeProfileId
                ?? nextProfiles[0]?.id
                ?? null;

            if (nextActiveId && nextActiveId !== activeProfileId) {
                setActiveProfileId(nextActiveId);
            }
        },
        [activeProfileId],
    );

    const refreshAuthState = useCallback(async () => {
        const nextAuth = await apiService.getAuthState();
        setAuthState(nextAuth);
        setUsageSnapshot(nextAuth.usage ?? null);
        setOrganizations(nextAuth.organizations ?? []);
        setActiveOrganizationId(nextAuth.activeOrganizationId ?? null);
        return nextAuth;
    }, []);

    const refreshUsage = useCallback(async (organizationId?: string) => {
        try {
            const usage = await apiService.getUsage(organizationId);
            setUsageSnapshot(usage);
            return usage;
        } catch (err) {
            console.error('Failed to refresh usage metrics:', err);
            setUsageSnapshot(null);
            return null;
        }
    }, []);

    const reloadProfiles = useCallback(async () => {
        if (!authState.isAuthenticated) {
            updateProfilesState([]);
            return [];
        }
        try {
            const fetched = await apiService.getProfiles();
            updateProfilesState(fetched);
            return fetched;
        } catch (err) {
            console.error('Failed to load profiles:', err);
            updateProfilesState([]);
            return [];
        }
    }, [authState.isAuthenticated, updateProfilesState]);

    const selectProfile = useCallback(
        async (profileId: string) => {
            if (!authState.isAuthenticated) return;
            try {
                await apiService.setActiveProfile(profileId);
                setActiveProfileId(profileId);
            } catch (err) {
                console.error('Failed to set active profile', err);
            }
        },
        [authState.isAuthenticated],
    );

    const switchOrganization = useCallback(
        async (organizationId: string) => {
            try {
                await apiService.setActiveOrganization(organizationId);
                setActiveOrganizationId(organizationId);
                await Promise.all([
                    refreshAuthState(),
                    refreshUsage(organizationId),
                ]);
            } catch (err) {
                console.error('Failed to switch organization', err);
            }
        },
        [refreshAuthState, refreshUsage],
    );

    const initialize = useCallback(async () => {
        setIsBootstrapping(true);
        setError(null);
        try {
            const [plans, auth] = await Promise.all([
                apiService.getBillingPlans(),
                apiService.getAuthState(),
            ]);
            setBillingPlans(plans);
            setAuthState(auth);
            setUsageSnapshot(auth.usage ?? null);
            setOrganizations(auth.organizations ?? []);
            setActiveOrganizationId(auth.activeOrganizationId ?? null);

            if (auth.isAuthenticated) {
                const fetchedProfiles = await apiService.getProfiles();
                updateProfilesState(fetchedProfiles);
            } else {
                updateProfilesState([]);
            }
        } catch (err) {
            console.error('Failed to bootstrap console state', err);
            setError('Unable to load workspace context. Please refresh.');
            setAuthState({
                isAuthenticated: false,
                user: null,
                license: null,
                subscription: null,
                usage: null,
            });
            updateProfilesState([]);
            setOrganizations([]);
            setActiveOrganizationId(null);
        } finally {
            setIsBootstrapping(false);
        }
    }, [updateProfilesState]);

    const logout = useCallback(async () => {
        await apiService.logout();
        await initialize();
    }, [initialize]);

    useEffect(() => {
        initialize();
    }, [initialize]);

    return useMemo(
        () => ({
            authState,
            billingPlans,
            usageSnapshot,
            organizations,
            activeOrganizationId,
            profiles,
            activeProfileId,
            isBootstrapping,
            error,
            initialize,
            refreshAuthState,
            refreshUsage,
            reloadProfiles,
            selectProfile,
            switchOrganization,
            logout,
        }),
        [
            activeOrganizationId,
            activeProfileId,
            authState,
            billingPlans,
            error,
            initialize,
            isBootstrapping,
            organizations,
            profiles,
            refreshAuthState,
            refreshUsage,
            reloadProfiles,
            selectProfile,
            switchOrganization,
            logout,
            usageSnapshot,
        ],
    );
};

