import React, { useCallback, useEffect, useState } from 'react';

import ComposeSidebar from '../components/compose/ComposeSidebar';
import ChatView from '../components/chat/ChatView';
import ChatInput from '../components/ChatInput';
import ProfileModal from '../components/ProfileModal';
import AuthModal from '../components/AuthModal';
import { ChatMessage, MessageAuthor, ProfileSource, StyleProfile, IntegrationName } from '../types';
import * as apiService from '../services/apiService';
import { useAuth } from '../providers/AuthProvider';

const ComposePage: React.FC = () => {
  const { auth, refresh, logout } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profiles, setProfiles] = useState<StyleProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  const loadProfiles = useCallback(async () => {
    if (!auth.isAuthenticated) {
      setProfiles([]);
      setActiveProfileId(null);
      return;
    }

    setIsLoading(true);
   try {
     const { profiles: fetchedProfiles, activeProfileId: serverActive } = await apiService.getProfiles();
     setProfiles(fetchedProfiles);
     const nextActive = serverActive ?? fetchedProfiles[0]?.id ?? null;
     if (nextActive) {
       setActiveProfileId(nextActive);
       if (!serverActive) {
         await apiService.setActiveProfile(nextActive);
       }
     }
   } catch (error) {
     console.error('Failed to load profiles', error);
      setMessages((prev) => [
        ...prev,
        { author: MessageAuthor.SYSTEM, text: 'Failed to load profiles. Please refresh.' },
      ]);
   } finally {
     setIsLoading(false);
   }
 }, [auth.isAuthenticated]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      setMessages((prev) =>
        prev.length > 0
          ? prev
          : [{ author: MessageAuthor.BOT, text: "Welcome back! I'm ready to assist you. Select a style profile or ask me to create a new one." }]
      );
      loadProfiles();
    } else {
      setMessages([{ author: MessageAuthor.BOT, text: 'Welcome to Scribe AI! Please sign in to create writing profiles and start generating text.' }]);
      setProfiles([]);
      setActiveProfileId(null);
    }
  }, [auth.isAuthenticated, auth.user?.id, loadProfiles]);

  const handleSendMessage = async (text: string) => {
    if (!auth.isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    const userMessage: ChatMessage = { author: MessageAuthor.USER, text };
    const history = [...messages, userMessage];
    setMessages(history);
    setIsLoading(true);

    try {
      const response = await apiService.continueConversation({
        prompt: text,
        history: messages,
        context: { activeProfileId },
      });

      if (response.text?.includes('created a new style profile')) {
        await loadProfiles();
      }

      setMessages([...history, response]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        author: MessageAuthor.SYSTEM,
        text: error instanceof Error ? `Error: ${error.message}` : 'An unknown error occurred.',
      };
      setMessages([...history, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSelect = async (id: string) => {
    setActiveProfileId(id);
    await apiService.setActiveProfile(id);
    const profileName = profiles.find((profile) => profile.id === id)?.name;
    if (profileName) {
      setMessages((prev) => [
        ...prev,
        {
          author: MessageAuthor.SYSTEM,
          text: `Style profile "${profileName}" is now active.`,
        },
      ]);
    }
  };

  const handleCreateProfile = async (name: string, source: ProfileSource) => {
    if (!auth.isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    setIsLoading(true);
    setProfileModalOpen(false);
    setMessages((prev) => [
      ...prev,
      {
        author: MessageAuthor.SYSTEM,
        text: `Creating new profile "${name}" from ${source.type}... this may take a moment.`,
      },
    ]);

    const prompt =
      source.type === 'text'
        ? `Create a new writing style profile for me. The name of the profile should be "${name}". Please analyze the following text to create it: """${source.content}"""`
        : `Create a new writing style profile for me named "${name}" by analyzing my writing from my connected ${source.type} account.`;

    await handleSendMessage(prompt);
  };

  const handleLogout = async () => {
    await logout();
    await refresh();
    setProfiles([]);
    setActiveProfileId(null);
    setMessages([{ author: MessageAuthor.BOT, text: 'You have been logged out.' }]);
  };

  const handleEditMessage = (index: number, newText: string) => {
    const historyUpToIndex = messages.slice(0, index);
    const userMessageToResend: ChatMessage = { author: MessageAuthor.USER, text: newText };
    setMessages([...historyUpToIndex, userMessageToResend]);

    setIsLoading(true);
    apiService
      .continueConversation({
        prompt: newText,
        history: historyUpToIndex,
        context: { activeProfileId },
      })
      .then((response) => {
        loadProfiles();
        setMessages([...historyUpToIndex, userMessageToResend, response]);
      })
      .catch((error) => {
        const errorMessage: ChatMessage = {
          author: MessageAuthor.SYSTEM,
          text: error instanceof Error ? error.message : 'An unknown error occurred.',
        };
        setMessages([...historyUpToIndex, userMessageToResend, errorMessage]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleDisconnectIntegration = async (integration: IntegrationName) => {
    try {
      await apiService.disconnectIntegration(integration);
      await refresh();
      setMessages((prev) => [
        ...prev,
        {
          author: MessageAuthor.SYSTEM,
          text: `${integration.charAt(0).toUpperCase() + integration.slice(1)} has been disconnected.`,
        },
      ]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        author: MessageAuthor.SYSTEM,
        text: error instanceof Error ? error.message : `Failed to disconnect ${integration}.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-800 text-slate-200 flex font-sans">
      <ComposeSidebar
        authState={auth}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onProfileSelect={handleProfileSelect}
        onProfileCreate={() => (auth.isAuthenticated ? setProfileModalOpen(true) : setAuthModalOpen(true))}
        onLogout={handleLogout}
        onDisconnect={handleDisconnectIntegration}
      />
      <div className="flex-1 flex flex-col bg-slate-900/50">
        <ChatView messages={messages} isLoading={isLoading} onEditMessage={handleEditMessage} />
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onCreate={handleCreateProfile}
        isLoading={isLoading}
        authState={auth}
      />
      {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />}
    </div>
  );
};

export default ComposePage;
