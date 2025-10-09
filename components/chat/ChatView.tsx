import React, { useEffect, useRef } from 'react';
import { ChatMessage as Message } from '../../types';
import ChatMessage from '../ChatMessage';

interface ChatViewProps {
    messages: Message[];
    isLoading: boolean;
    onEditMessage: (index: number, newText: string) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ messages, isLoading, onEditMessage }) => {
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    return (
        <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {messages.map((msg, index) => (
                <ChatMessage 
                    key={index} 
                    message={msg} 
                    index={index}
                    onEditMessage={onEditMessage}
                />
            ))}
            {isLoading && <ChatMessage isLoading={true} />}
            <div ref={messagesEndRef} />
        </main>
    );
};

export default ChatView;
