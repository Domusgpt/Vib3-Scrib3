import React, { useState } from 'react';
import { SendIcon } from './icons';
import Loader from './Loader';

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
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
