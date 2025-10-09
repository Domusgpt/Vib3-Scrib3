import React from 'react';
import ChatView from '../components/chat/ChatView';
import ChatInput from '../components/ChatInput';
import { AuthState, ChatMessage, LLMProvider } from '../types';

interface DashboardProps {
  authState: AuthState;
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string) => Promise<void>;
  onEditMessage: (index: number, newText: string) => void;
  selectedProvider: LLMProvider;
  onProviderChange: (provider: LLMProvider) => void;
  hasActiveSubscription: boolean;
}

const providers = [
  { id: LLMProvider.GEMINI, label: 'Gemini 2.5 Flash' },
  { id: LLMProvider.OPENAI, label: 'GPT-4o mini' },
];

const Dashboard: React.FC<DashboardProps> = ({
  authState,
  messages,
  isLoading,
  onSendMessage,
  onEditMessage,
  selectedProvider,
  onProviderChange,
  hasActiveSubscription,
}) => {
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    await onSendMessage(text);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900/60">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Workspace</h2>
          <p className="text-sm text-slate-400">
            {authState.isAuthenticated
              ? 'Compose, refine, and publish in your own voice.'
              : 'Sign in to unlock personalized drafting and integrations.'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs uppercase tracking-wide text-slate-400">Provider</span>
          <div className="flex space-x-2">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => onProviderChange(provider.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  selectedProvider === provider.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {provider.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {!hasActiveSubscription && authState.isAuthenticated && (
        <div className="bg-amber-500/10 text-amber-300 text-sm px-4 py-3 border-b border-amber-400/40">
          Your workspace is in read-only mode until you activate a subscription. Head over to Billing to pick a plan or continue exploring past drafts.
        </div>
      )}
      <div className="flex-1 flex flex-col">
        <ChatView messages={messages} isLoading={isLoading} onEditMessage={onEditMessage} />
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading || !hasActiveSubscription} />
      </div>
    </div>
  );
};

export default Dashboard;
