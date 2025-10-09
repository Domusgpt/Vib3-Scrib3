import React, { useState, useEffect } from 'react';
import Loader from './Loader';
import { AuthState, ProfileSource, ProfileSourceType } from '../types';
import { ClipboardDocumentIcon, GmailIcon, FacebookIcon } from './icons';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, source: ProfileSource) => void;
    isLoading: boolean;
    authState: AuthState;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onCreate, isLoading, authState }) => {
    const [name, setName] = useState('');
    const [samples, setSamples] = useState('');
    const [sourceType, setSourceType] = useState<ProfileSourceType>('text');
    const [sampleCounts] = useState<{ gmail?: number; facebook?: number }>({});

    useEffect(() => {
        if (isOpen) {
            // Reset form and fetch counts when modal opens
            setName('');
            setSamples('');
            setSourceType('text');
            setSampleCounts({});

            // In the new architecture we derive sample availability directly from integration metadata.
            // This placeholder state ensures backwards compatibility with legacy UI that expects counts.
        }
    }, [isOpen, authState.user]);

    if (!isOpen) {
        return null;
    }

    const canSubmit = (
        name.trim() !== '' &&
        !isLoading &&
        (sourceType === 'text' ? samples.trim().length > 50 : true) // Require some text if pasting
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (canSubmit) {
            if (sourceType === 'text') {
                onCreate(name, { type: 'text', content: samples });
            } else {
                onCreate(name, { type: sourceType });
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4 m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-slate-100">Create New Style Profile</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="profileName" className="block text-sm font-medium text-slate-400 mb-1">
                            Profile Name
                        </label>
                        <input
                            type="text"
                            id="profileName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., My Professional Email Style"
                            className="w-full p-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>

                    <div>
                         <label className="block text-sm font-medium text-slate-400 mb-2">
                            Writing Sample Source
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                           <SourceButton 
                                icon={<ClipboardDocumentIcon className="w-5 h-5"/>} 
                                label="Paste Text" 
                                isActive={sourceType === 'text'} 
                                onClick={() => setSourceType('text')}
                            />
                            <SourceButton 
                                icon={<GmailIcon className="w-5 h-5"/>} 
                                label="Gmail" 
                                isActive={sourceType === 'gmail'} 
                                onClick={() => setSourceType('gmail')}
                                disabled={!authState.user?.google}
                                title={!authState.user?.google ? "Connect your Google account first" : ""}
                                count={sampleCounts.gmail}
                            />
                            <SourceButton 
                                icon={<FacebookIcon className="w-5 h-5"/>} 
                                label="Facebook" 
                                isActive={sourceType === 'facebook'} 
                                onClick={() => setSourceType('facebook')}
                                disabled={!authState.user?.facebook}
                                title={!authState.user?.facebook ? "Connect your Facebook account first" : ""}
                                count={sampleCounts.facebook}
                            />
                        </div>
                    </div>

                    {sourceType === 'text' && (
                        <div>
                            <label htmlFor="writingSamples" className="block text-sm font-medium text-slate-400 mb-1">
                                Writing Samples
                            </label>
                            <textarea
                                id="writingSamples"
                                value={samples}
                                onChange={(e) => setSamples(e.target.value)}
                                placeholder="Paste in at least a few paragraphs of your writing (emails, messages, documents) for the best results."
                                className="w-full p-2 h-48 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y custom-scrollbar"
                                required
                            />
                        </div>
                    )}
                    
                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-md text-sm font-semibold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="px-4 py-2 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-sm font-semibold transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader className="w-4 h-4" />
                                    <span>Creating...</span>
                                </>
                            ) : (
                                'Create Profile'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const SourceButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    disabled?: boolean;
    title?: string;
    count?: number;
}> = ({ icon, label, isActive, onClick, disabled, title, count }) => (
     <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`flex flex-col items-center justify-between p-3 rounded-md text-sm font-medium border-2 transition-colors h-24
            ${isActive ? 'bg-slate-700 border-indigo-500' : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
    >
        <div className="flex items-center space-x-2">
            {icon}
            <span>{label}</span>
        </div>
        <div className="text-xs text-slate-400 h-4 flex items-center justify-center">
            {typeof count === 'number' && (
                <span>~{count} samples</span>
            )}
        </div>
    </button>
);


export default ProfileModal;
