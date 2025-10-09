import React, { useState, useEffect } from 'react';
import { ChatMessage, MessageAuthor } from '../types';
import { UserIcon, BotIcon, ToolIcon, WandIcon, CheckCircleIcon, PencilIcon, ClipboardDocumentIcon, CheckIcon, XMarkIcon } from './icons';
import Loader from './Loader';

interface ChatMessageProps {
  message?: ChatMessage;
  isLoading?: boolean;
  index?: number;
  onEditMessage?: (index: number, newText: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLoading, index, onEditMessage }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
      if (message?.text) {
          setEditedText(message.text);
      }
  }, [message?.text]);
  
  if (isLoading) {
    return (
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
            <BotIcon className="w-5 h-5 text-indigo-400" />
        </div>
        <div className="flex items-center space-x-2 p-3 bg-slate-700/50 rounded-lg">
            <Loader className="w-4 h-4 text-slate-300" />
            <span className="text-slate-400 text-sm">Thinking...</span>
        </div>
      </div>
    );
  }

  if (!message) return null;

  const { author, text, functionCall, functionResponse } = message;

  const isUser = author === MessageAuthor.USER;
  const isBot = author === MessageAuthor.BOT;
  const isSystem = author === MessageAuthor.SYSTEM;

  const handleSave = () => {
      if (onEditMessage && index !== undefined) {
          onEditMessage(index, editedText);
      }
      setIsEditing(false);
  };

  const handleCancel = () => {
      setEditedText(text || '');
      setIsEditing(false);
  };
  
  const handleCopy = () => {
      navigator.clipboard.writeText(text || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const authorClasses = isUser ? 'bg-indigo-600' : isSystem ? 'bg-slate-600' : 'bg-slate-700';
  
  const authorIcon = isUser 
    ? <UserIcon className="w-5 h-5 text-white" /> 
    : isSystem 
    ? <CheckCircleIcon className="w-5 h-5 text-green-400" />
    : <BotIcon className="w-5 h-5 text-indigo-400" />;

  const messageContainerClasses = isUser ? 'flex-row-reverse' : 'flex-row';
  
  const messageBubbleClasses = isUser 
    ? 'bg-indigo-600 text-white rounded-br-none' 
    : isSystem
    ? 'bg-slate-700/50 text-slate-300 italic rounded-bl-none'
    : 'bg-slate-700/50 text-slate-200 rounded-bl-none';

  return (
    <div 
        className={`group flex items-start space-x-4 ${messageContainerClasses} animate-fade-in relative`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${authorClasses}`}>
        {authorIcon}
      </div>
      <div className={`max-w-xl p-4 rounded-xl shadow ${messageBubbleClasses}`}>
        {isEditing ? (
            <div className="w-[500px] max-w-full">
                <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y custom-scrollbar text-sm"
                    rows={Math.max(3, editedText.split('\n').length)}
                />
                <div className="flex justify-end space-x-2 mt-2">
                    <button onClick={handleCancel} className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded-md text-xs font-semibold transition-colors">Cancel</button>
                    <button onClick={handleSave} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-md text-xs font-semibold transition-colors">Save</button>
                </div>
            </div>
        ) : (
            <>
                {text && <p className="whitespace-pre-wrap">{text}</p>}
                {functionCall && (
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-slate-400 text-sm">
                            <ToolIcon className="w-4 h-4 text-purple-400"/>
                            <span>Using tool: <strong>{functionCall.name}</strong></span>
                        </div>
                        <pre className="text-xs bg-slate-800 p-2 rounded-md overflow-x-auto custom-scrollbar">
                            <code>{JSON.stringify(functionCall.args, null, 2)}</code>
                        </pre>
                    </div>
                )}
                {functionResponse && (
                    <div className="space-y-2 opacity-70">
                        <div className="flex items-center space-x-2 text-slate-400 text-sm">
                            <WandIcon className="w-4 h-4 text-green-400"/>
                            <span>Tool result: <strong>{functionResponse.name}</strong></span>
                        </div>
                        <pre className="text-xs bg-slate-800 p-2 rounded-md overflow-x-auto custom-scrollbar">
                            <code>{JSON.stringify(functionResponse.response, null, 2)}</code>
                        </pre>
                    </div>
                )}
            </>
        )}
      </div>
      {isHovered && !isEditing && isBot && text && (
         <div className={`absolute bottom-0 flex items-center space-x-1 p-1 bg-slate-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isUser ? 'right-12' : 'left-12'}`}>
              <button onClick={() => setIsEditing(true)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md" title="Edit">
                  <PencilIcon className="w-4 h-4" />
              </button>
              <button onClick={handleCopy} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md" title="Copy">
                  {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
              </button>
          </div>
      )}
    </div>
  );
};

export default ChatMessage;
