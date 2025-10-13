import React, { useState } from 'react';
import { LLMProvider } from '../types';
import { SendIcon } from './icons';
import Loader from './Loader';

export interface ProviderOption {
    value: LLMProvider;
    label: string;
    description: string;
    badge?: string;
    accentClass: string;
}

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    isLoading: boolean;
    provider: LLMProvider;
    providerOptions: readonly ProviderOption[];
    onProviderChange: (provider: LLMProvider) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, provider, providerOptions, onProviderChange }) => {
    const [text, setText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim() && !isLoading) {
            onSendMessage(text);
            setText('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    }

    return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_18px_38px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-300">LLM Provider</p>
                <div className="flex flex-wrap gap-2">
                    {providerOptions.map(option => {
                        const isActive = option.value === provider;
                        const activeClasses = isActive
                            ? `bg-gradient-to-r ${option.accentClass} text-slate-950 shadow-[0_12px_28px_rgba(15,23,42,0.45)]`
                            : 'bg-slate-950/40 text-slate-200 hover:bg-slate-900/60';
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    if (!isActive) {
                                        onProviderChange(option.value);
                                    }
                                }}
                                disabled={isLoading}
                                className={`group flex max-w-xs flex-col gap-1 rounded-2xl border border-white/10 px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-400/70 disabled:cursor-not-allowed disabled:opacity-70 ${activeClasses}`}
                                aria-pressed={isActive}
                            >
                                <span className="flex items-center gap-2 text-sm font-semibold">
                                    {option.label}
                                    {option.badge && (
                                        <span className="rounded-full bg-white/20 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wider text-white/90">
                                            {option.badge}
                                        </span>
                                    )}
                                </span>
                                <span className="text-xs text-slate-200/80 group-disabled:text-slate-200/60">
                                    {option.description}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
            <form onSubmit={handleSubmit} className="flex items-end gap-3">
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask your scribe to analyze text or orchestrate a new workflow..."
                    className="custom-scrollbar min-h-[56px] max-h-60 flex-1 resize-none rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
                    disabled={isLoading}
                    rows={1}
                    onInput={e => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                    }}
                />
                <button
                    type="submit"
                    disabled={isLoading || !text.trim()}
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-indigo-500/60 bg-indigo-500/80 text-white shadow-[0_12px_24px_rgba(79,70,229,0.45)] transition hover:scale-105 hover:bg-indigo-500 disabled:border-white/10 disabled:bg-slate-700"
                    aria-label="Send message"
                >
                    {isLoading ? <Loader className="h-5 w-5" /> : <SendIcon className="h-5 w-5" />}
                </button>
            </form>
        </div>
    );
};

export default ChatInput;
