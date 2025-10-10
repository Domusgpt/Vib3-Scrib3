import { useMemo } from 'react';
import { ConsolePageState } from './useConsolePageState';

type GuardWithAuth = ConsolePageState['guardWithAuth'];

type GuardedHandlerOptions = {
    openModal?: boolean;
};

type HandlerMap = Record<string, ((...args: any[]) => any) | undefined>;

type GuardHandlersResult<T extends HandlerMap> = {
    [K in keyof T]: T[K];
};

export const useGuardedHandlers = <T extends HandlerMap>(
    guardWithAuth: GuardWithAuth,
    handlers: T,
    options: GuardedHandlerOptions = {},
): GuardHandlersResult<T> => {
    const openModal = options.openModal ?? true;

    return useMemo(() => {
        const entries = Object.entries(handlers).map(([key, handler]) => {
            if (typeof handler !== 'function') {
                return [key, handler];
            }

            return [key, guardWithAuth(handler, { openModal })];
        });

        return Object.fromEntries(entries) as GuardHandlersResult<T>;
    }, [guardWithAuth, handlers, openModal]);
};
