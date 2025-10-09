import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import ChatView from '../components/chat/ChatView';
import ChatInput from '../components/ChatInput';
import ProfileModal from '../components/ProfileModal';
import AuthModal from '../components/AuthModal';
import { AuthState, ChatMessage, MessageAuthor, ProfileSource, StyleProfile, IntegrationName } from '../types';
import * as apiService from '../services/apiService';

const HomePage: React.FC = () => {
    const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false, user: null, license: null });
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [profiles, setProfiles] = useState<StyleProfile[]>([]);
    const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);

    const fetchInitialData = useCallback(async () => {
        setIsLoading(true);
        try {
            const auth = await apiService.getAuthState();
            setAuthState(auth);
            if (auth.isAuthenticated) {
                const fetchedProfiles = await apiService.getProfiles();
                setProfiles(fetchedProfiles);
                if (fetchedProfiles.length > 0 && !activeProfileId) {
                    const newActiveId = fetchedProfiles[0].id;
                    setActiveProfileId(newActiveId);
                    await apiService.setActiveProfile(newActiveId);
                }
                 if (messages.length === 0) {
                     setMessages([{ author: MessageAuthor.BOT, text: "Welcome back! I'm ready to assist you. Select a style profile or ask me to create a new one." }]);
                 }
            } else {
                setMessages([{ author: MessageAuthor.BOT, text: "Welcome to Scribe AI! Please sign in to create writing profiles and start generating text." }]);
            }
        } catch (error) {
            console.error("Failed to fetch initial data:", error);
            setMessages([{ author: MessageAuthor.SYSTEM, text: "Failed to load session. Please refresh the page." }]);
        }
        setIsLoading(false);
    }, [activeProfileId, messages.length]);

    useEffect(() => {
        fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSendMessage = async (text: string) => {
        if (!authState.isAuthenticated) {
            setAuthModalOpen(true);
            return;
        }

        const userMessage: ChatMessage = { author: MessageAuthor.USER, text };
        const currentMessages = [...messages, userMessage];
        setMessages(currentMessages);
        setIsLoading(true);

        try {
            const response = await apiService.continueConversation({
                prompt: text,
                history: messages, // Send the full history for context
                context: { activeProfileId }
            });
            // Check if the AI created a new profile, and if so, refresh the list
            if (response.text?.includes("created a new style profile")) {
                const fetchedProfiles = await apiService.getProfiles();
                setProfiles(fetchedProfiles);
                // Optionally, make the new profile active
                if(fetchedProfiles.length > profiles.length) {
                    setActiveProfileId(fetchedProfiles[0].id);
                    await apiService.setActiveProfile(fetchedProfiles[0].id);
                }
            }
            setMessages([...currentMessages, response]);
        } catch (error) {
            const errorMessage: ChatMessage = {
                author: MessageAuthor.SYSTEM,
                text: error instanceof Error ? `Error: ${error.message}` : "An unknown error occurred."
            };
            setMessages([...currentMessages, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleProfileSelect = async (id: string) => {
        setActiveProfileId(id);
        await apiService.setActiveProfile(id);
        const profileName = profiles.find(p => p.id === id)?.name;
        if (profileName) {
            setMessages(prev => [...prev, {
                author: MessageAuthor.SYSTEM,
                text: `Style profile "${profileName}" is now active.`
            }]);
        }
    };
    
    const handleCreateProfile = async (name: string, source: ProfileSource) => {
        setIsLoading(true);
        setProfileModalOpen(false);
        setMessages(prev => [...prev, {
            author: MessageAuthor.SYSTEM,
            text: `Creating new profile "${name}" from ${source.type}... this may take a moment.`
        }]);
        
        // This is a special command to the AI, so we use handleSendMessage
        let prompt = '';
        if (source.type === 'text') {
            prompt = `Create a new writing style profile for me. The name of the profile should be "${name}". Please analyze the following text to create it: """${source.content}"""`;
        } else {
            prompt = `Create a new writing style profile for me named "${name}" by analyzing my writing from my connected ${source.type} account.`;
        }
        await handleSendMessage(prompt);
    };
    
    const handleLogout = async () => {
        await apiService.logout();
        setAuthState({ isAuthenticated: false, user: null, license: null });
        setProfiles([]);
        setActiveProfileId(null);
        setMessages([{ author: MessageAuthor.BOT, text: "You have been logged out." }]);
    };
    
    const handleEditMessage = (index: number, newText: string) => {
        const historyUpToIndex = messages.slice(0, index);
        const userMessageToResend: ChatMessage = { author: MessageAuthor.USER, text: newText };
        setMessages([...historyUpToIndex, userMessageToResend]);
        
        // We need to re-run the conversation from this point
        setIsLoading(true);
        apiService.continueConversation({
            prompt: newText,
            history: historyUpToIndex,
            context: { activeProfileId }
        }).then(response => {
             if (response.text?.includes("created a new style profile")) {
                apiService.getProfiles().then(fetchedProfiles => {
                    setProfiles(fetchedProfiles);
                });
            }
            setMessages([...historyUpToIndex, userMessageToResend, response]);
        }).catch(error => {
            const errorMessage: ChatMessage = {
                author: MessageAuthor.SYSTEM,
                text: error instanceof Error ? error.message : "An unknown error occurred."
            };
            setMessages([...historyUpToIndex, userMessageToResend, errorMessage]);
        }).finally(() => {
            setIsLoading(false);
        });
    };

    const handleDisconnectIntegration = async (integration: IntegrationName) => {
        try {
            await apiService.disconnectIntegration(integration);
            // Refresh auth state to update the UI
            const auth = await apiService.getAuthState();
            setAuthState(auth);
            setMessages(prev => [...prev, {
                author: MessageAuthor.SYSTEM,
                text: `${integration.charAt(0).toUpperCase() + integration.slice(1)} has been disconnected.`
            }]);
        } catch (error) {
             const errorMessage: ChatMessage = {
                author: MessageAuthor.SYSTEM,
                text: error instanceof Error ? error.message : `Failed to disconnect ${integration}.`
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    };


    return (
        <div className="h-screen w-screen bg-slate-800 text-slate-200 flex font-sans">
            <Sidebar 
                authState={authState}
                profiles={profiles}
                activeProfileId={activeProfileId}
                onProfileSelect={handleProfileSelect}
                onProfileCreate={() => authState.isAuthenticated ? setProfileModalOpen(true) : setAuthModalOpen(true)}
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
                authState={authState}
            />
            {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />}
        </div>
    );
};

export default HomePage;