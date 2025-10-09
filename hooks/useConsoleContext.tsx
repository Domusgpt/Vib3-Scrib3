import React, { createContext, useContext } from 'react';
import { useConsoleBootstrap } from './useConsoleBootstrap';

type ConsoleContextValue = ReturnType<typeof useConsoleBootstrap>;

const ConsoleContext = createContext<ConsoleContextValue | undefined>(undefined);

export const ConsoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const value = useConsoleBootstrap();
    return <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>;
};

export const useConsole = (): ConsoleContextValue => {
    const context = useContext(ConsoleContext);
    if (!context) {
        throw new Error('useConsole must be used within a ConsoleProvider');
    }
    return context;
};
