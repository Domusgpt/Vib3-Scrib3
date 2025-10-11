import React from 'react';

interface ConsoleBootStateProps {
    eyebrow?: string;
    message?: string;
    hint?: string;
}

const ConsoleBootState: React.FC<ConsoleBootStateProps> = ({
    eyebrow = 'Bootstrapping',
    message = 'Loading workspace context…',
    hint,
}) => {
    return (
        <div
            className="flex w-full max-w-md flex-col items-center gap-5 rounded-[28px] border border-white/10 bg-white/[0.04] px-8 py-12 text-center shadow-[0_32px_60px_rgba(8,15,35,0.55)] backdrop-blur"
            role="status"
            aria-live="polite"
        >
            <span className="text-xs font-semibold uppercase tracking-[0.45em] text-indigo-200/80">
                {eyebrow}
            </span>
            <div
                className="h-14 w-14 animate-spin rounded-full border-2 border-indigo-400/60 border-t-transparent"
                aria-hidden="true"
            />
            <p className="text-sm text-slate-300">{message}</p>
            {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
        </div>
    );
};

export default ConsoleBootState;
