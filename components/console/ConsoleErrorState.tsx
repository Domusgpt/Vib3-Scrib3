import React, { useCallback, useState } from 'react';

interface ConsoleErrorStateProps {
    eyebrow?: string;
    title?: string;
    message?: string;
    hint?: string;
    actionLabel?: string;
    onRetry?: () => void | Promise<void>;
}

const ConsoleErrorState: React.FC<ConsoleErrorStateProps> = ({
    eyebrow = 'Workspace unavailable',
    title = 'We hit a snag',
    message = 'We couldn\'t load your workspace context. Please try again.',
    hint,
    actionLabel = 'Try again',
    onRetry,
}) => {
    const [isRetrying, setIsRetrying] = useState(false);

    const handleRetry = useCallback(async () => {
        if (!onRetry || isRetrying) {
            return;
        }

        try {
            setIsRetrying(true);
            await onRetry();
        } finally {
            setIsRetrying(false);
        }
    }, [isRetrying, onRetry]);

    return (
        <div
            className="flex w-full max-w-md flex-col items-center gap-5 rounded-[28px] border border-white/10 bg-white/[0.04] px-8 py-12 text-center shadow-[0_32px_60px_rgba(8,15,35,0.55)] backdrop-blur"
            role="alert"
            aria-live="assertive"
        >
            <span className="text-xs font-semibold uppercase tracking-[0.45em] text-rose-200/80">{eyebrow}</span>
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-rose-400/60 bg-rose-500/10">
                <span className="text-2xl text-rose-200" aria-hidden="true">
                    !
                </span>
            </div>
            <div className="space-y-2">
                <p className="text-base font-semibold text-white">{title}</p>
                <p className="text-sm text-slate-300">{message}</p>
                {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
            </div>
            <button
                type="button"
                onClick={() => {
                    void handleRetry();
                }}
                disabled={!onRetry || isRetrying}
                className="rounded-2xl border border-rose-400/60 bg-rose-500/70 px-5 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-slate-700"
            >
                {isRetrying ? 'Retrying…' : actionLabel}
            </button>
        </div>
    );
};

export default ConsoleErrorState;
