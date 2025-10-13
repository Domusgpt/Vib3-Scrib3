import { useMemo } from 'react';
import { ConsolePageState } from './useConsolePageState';

type GuardWithAuth = ConsolePageState['guardWithAuth'];

type GuardedHandlerOptions = {
    openModal?: boolean;
};

/**
 * Memoizes a handler that should only run for authenticated users using the shared guard.
 * The `handler` argument should already be wrapped in `useCallback` when it captures props or state.
 */
export const useGuardedHandler = <Args extends unknown[], ReturnType>(
    guardWithAuth: GuardWithAuth,
    handler: (...args: Args) => ReturnType,
    options: GuardedHandlerOptions = {},
) => {
    const openModal = options.openModal ?? true;

    return useMemo(() => guardWithAuth(handler, { openModal }), [guardWithAuth, handler, openModal]);
};

