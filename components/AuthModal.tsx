import React from 'react';
import { GmailIcon, FacebookIcon, XMarkIcon } from './icons';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) {
        return null;
    }

    const handleLogin = (provider: 'google' | 'facebook') => {
        window.location.href = `/auth/${provider}`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-sm p-6 space-y-6 m-4 relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 p-1 text-slate-500 hover:text-slate-200 transition-colors">
                    <XMarkIcon className="w-6 h-6" />
                </button>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-100">Authentication Required</h2>
                    <p className="text-slate-400 mt-2">Please sign in to create profiles and chat with your scribe.</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => handleLogin('google')}
                        className="w-full flex items-center justify-center space-x-3 p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-semibold transition-colors"
                    >
                        <GmailIcon className="w-5 h-5" />
                        <span>Sign in with Google</span>
                    </button>
                    <button
                        onClick={() => handleLogin('facebook')}
                        className="w-full flex items-center justify-center space-x-3 p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-semibold transition-colors"
                    >
                        <FacebookIcon className="w-5 h-5" />
                        <span>Sign in with Facebook</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
