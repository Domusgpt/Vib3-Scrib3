import React from 'react';
import { CheckCircleIcon, LightningBoltIcon, XMarkIcon } from '../icons';

type NotificationType = 'error' | 'success' | 'info';

interface NotificationBannerProps {
    type: NotificationType;
    message: string;
    onDismiss?: () => void;
}

const COLORS: Record<NotificationType, string> = {
    error: 'border-red-500/30 bg-red-500/10 text-red-100',
    success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
    info: 'border-sky-400/30 bg-sky-500/10 text-sky-100',
};

const ICONS: Record<NotificationType, React.ReactElement> = {
    error: <XMarkIcon className="h-5 w-5" />,
    success: <CheckCircleIcon className="h-5 w-5" />,
    info: <LightningBoltIcon className="h-5 w-5" />,
};

const NotificationBanner: React.FC<NotificationBannerProps> = ({ type, message, onDismiss }) => {
    return (
        <div
            className={`flex items-start justify-between gap-4 rounded-3xl border px-5 py-4 text-sm shadow-[0_24px_45px_rgba(8,15,35,0.45)] backdrop-blur ${COLORS[type]}`}
        >
            <div className="flex items-start gap-3">
                <span className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
                    {ICONS[type]}
                </span>
                <p className="leading-relaxed text-slate-100">{message}</p>
            </div>
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-white/80 transition hover:bg-white/10"
                >
                    Dismiss
                </button>
            )}
        </div>
    );
};

export default NotificationBanner;
