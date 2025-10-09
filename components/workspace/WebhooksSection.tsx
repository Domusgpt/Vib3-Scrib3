import React from 'react';
import { WebhookEvent, WebhookSubscription } from '../../types';

interface WebhooksSectionProps {
    webhooks: WebhookSubscription[];
    availableEvents: Array<{ label: string; value: WebhookEvent; description: string }>;
    selectedEvents: WebhookEvent[];
    onToggleEvent: (event: WebhookEvent) => void;
    url: string;
    onUrlChange: (value: string) => void;
    onCreateWebhook: () => void;
    creatingWebhook: boolean;
    onTestWebhook: (webhookId: string) => void;
    onDeleteWebhook: (webhookId: string) => void;
    testingWebhookId: string | null;
    deletingWebhookId: string | null;
}

const WebhooksSection: React.FC<WebhooksSectionProps> = ({
    webhooks,
    availableEvents,
    selectedEvents,
    onToggleEvent,
    url,
    onUrlChange,
    onCreateWebhook,
    creatingWebhook,
    onTestWebhook,
    onDeleteWebhook,
    testingWebhookId,
    deletingWebhookId,
}) => {
    return (
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_28px_48px_rgba(8,15,35,0.55)] backdrop-blur space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Webhooks</h3>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-slate-400">
                    {webhooks.length} endpoints
                </span>
            </div>
            <div className="space-y-3">
                <input
                    value={url}
                    onChange={event => onUrlChange(event.target.value)}
                    placeholder="https://app.example.com/webhooks/scribe"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-200 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {availableEvents.map(event => (
                        <label
                            key={event.value}
                            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-300"
                        >
                            <input
                                type="checkbox"
                                checked={selectedEvents.includes(event.value)}
                                onChange={() => onToggleEvent(event.value)}
                                className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-indigo-400 focus:ring-indigo-400"
                            />
                            <span>
                                <strong className="block text-slate-100">{event.label}</strong>
                                {event.description}
                            </span>
                        </label>
                    ))}
                </div>
                <button
                    onClick={onCreateWebhook}
                    className="rounded-2xl border border-indigo-400/60 bg-indigo-500/80 px-4 py-2 text-sm font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-indigo-500 disabled:border-white/20 disabled:bg-slate-700"
                    disabled={!url || creatingWebhook}
                >
                    {creatingWebhook ? 'Registering…' : 'Register webhook'}
                </button>
            </div>
            <ul className="space-y-2 text-sm text-slate-300">
                {webhooks.map(webhook => (
                    <li key={webhook.id} className="space-y-3 rounded-3xl border border-white/10 bg-slate-950/60 px-4 py-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="space-y-1">
                                <p className="font-semibold text-white">{webhook.url}</p>
                                <p className="text-xs text-slate-400">
                                    Events {webhook.events.map(event => event.replace('.', ' › ')).join(', ')}
                                </p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                                {webhook.lastDeliveredAt && (
                                    <span>Delivered {new Date(webhook.lastDeliveredAt).toLocaleString()}</span>
                                )}
                                {webhook.lastFailureAt && (
                                    <span className="text-red-300">
                                        Failed {new Date(webhook.lastFailureAt).toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-slate-400">
                                Secret {webhook.secret?.slice(0, 6)}…{webhook.secret?.slice(-4)}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onTestWebhook(webhook.id)}
                                    className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-white/10"
                                    disabled={testingWebhookId === webhook.id}
                                >
                                    {testingWebhookId === webhook.id ? 'Testing…' : 'Send test'}
                                </button>
                                <button
                                    onClick={() => onDeleteWebhook(webhook.id)}
                                    className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-white/10"
                                    disabled={deletingWebhookId === webhook.id}
                                >
                                    {deletingWebhookId === webhook.id ? 'Deleting…' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
            {webhooks.length === 0 && (
                <p className="text-sm text-slate-400">No webhooks configured — add one to monitor events in real time.</p>
            )}
        </section>
    );
};

export default WebhooksSection;

