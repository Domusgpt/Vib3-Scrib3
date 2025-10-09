import React, { useMemo, useState } from 'react';
import { XMarkIcon, LightningBoltIcon } from '../icons';

interface AppShellProps {
    sidebar?: React.ReactNode;
    eyebrow?: string;
    title?: string;
    description?: string;
    actions?: React.ReactNode;
    headerContent?: React.ReactNode;
    children: React.ReactNode;
}

const backgroundOrbs = [
    'bg-indigo-500/30',
    'bg-sky-500/25',
    'bg-purple-500/25',
];

const AppShell: React.FC<AppShellProps> = ({
    sidebar,
    eyebrow = 'Control Deck',
    title,
    description,
    actions,
    headerContent,
    children,
}) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const orbPositions = useMemo(
        () => [
            '-top-32 -left-24 h-72 w-72',
            'top-1/3 -right-24 h-80 w-80',
            'bottom-[-20%] left-1/2 h-96 w-[32rem] -translate-x-1/2',
        ],
        [],
    );

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#05070f] text-slate-100">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {orbPositions.map((position, index) => (
                    <div
                        key={position}
                        className={`absolute ${position} rounded-full blur-3xl transition-all duration-700 ${backgroundOrbs[index % backgroundOrbs.length]}`}
                    />
                ))}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.08),transparent_55%)]" />
            </div>

            {sidebar && (
                <div
                    className={`fixed inset-0 z-40 flex lg:hidden ${isSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
                >
                    <div
                        className={`relative ml-auto flex h-full w-[320px] max-w-full transform flex-col bg-slate-950/95 p-6 shadow-2xl transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
                    >
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="mb-4 inline-flex items-center gap-2 self-end rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:bg-white/10"
                            aria-label="Close navigation"
                        >
                            <XMarkIcon className="h-4 w-4" />
                            Close
                        </button>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            {sidebar}
                        </div>
                    </div>
                    <div
                        className={`h-full flex-1 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}
                        onClick={() => setIsSidebarOpen(false)}
                    />
                </div>
            )}

            <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1440px] flex-col lg:flex-row">
                {sidebar && (
                    <div className="hidden w-[320px] shrink-0 px-6 py-10 lg:flex lg:flex-col">
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            {sidebar}
                        </div>
                    </div>
                )}

                <div className="flex min-h-screen flex-1 flex-col">
                    <header className="relative border-b border-white/5 px-6 pb-6 pt-7 sm:px-10">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    {sidebar && (
                                        <button
                                            onClick={() => setIsSidebarOpen(true)}
                                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:bg-white/10 lg:hidden"
                                            aria-label="Open navigation"
                                        >
                                            <LightningBoltIcon className="h-4 w-4 text-indigo-300" />
                                            Menu
                                        </button>
                                    )}
                                    <span className="text-xs font-semibold uppercase tracking-[0.45em] text-indigo-200/80">
                                        {eyebrow}
                                    </span>
                                </div>
                                {title && <h1 className="text-2xl font-semibold leading-tight text-slate-100 sm:text-3xl">{title}</h1>}
                                {description && (
                                    <p className="max-w-2xl text-sm text-slate-400 sm:text-base">
                                        {description}
                                    </p>
                                )}
                            </div>
                            {actions && <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">{actions}</div>}
                        </div>
                        {headerContent && <div className="mt-6">{headerContent}</div>}
                    </header>

                    <main className="flex-1 pb-16 pt-8">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default AppShell;

