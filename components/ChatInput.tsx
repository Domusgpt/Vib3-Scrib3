import React, { useState } from 'react';
import { SendIcon } from './icons';
import Loader from './Loader';

interface ChatInputProps {
    onSendMessage: (message: string) => void | Promise<void>;
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
        <div className="p-4 bg-slate-900/50 border-t border-slate-700">
            <form onSubmit={handleSubmit} className="flex items-center space-x-3">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask your scribe to analyze text or write something for you..."
                    className="flex-1 p-3 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 resize-none custom-scrollbar disabled:opacity-50"
                    disabled={isLoading}
                    rows={1}
                    style={{ minHeight: '44px', maxHeight: '200px' }}
                    onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                    }}
                />
                <button
                    type="submit"
                    disabled={isLoading || !text.trim()}
                    className="flex-shrink-0 w-11 h-11 flex items-center justify-center bg-indigo-600 text-white font-semibold rounded-full shadow-md hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-110 disabled:scale-100"
                    aria-label="Send message"
                >
                    {isLoading ? <Loader className="w-5 h-5" /> : <SendIcon className="w-5 h-5" />}
                </button>
            </form>
        </div>
    );
};

export default ChatInput;
