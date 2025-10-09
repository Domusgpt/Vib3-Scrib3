import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import WorkspaceSettings from './pages/WorkspaceSettings';
import IntegrationsHub from './pages/IntegrationsHub';
import InsightsCenter from './pages/InsightsCenter';

/**
 * Welcome to Scribe AI!
 *
 * This App.tsx file is the root of our React application.
 *
 * For a serious, scalable product, this file would typically be responsible for:
 * 1.  **Global Context Providers**: Wrapping the entire app in providers for state management (like User authentication), theming, etc.
 * 2.  **Routing**: Setting up a router (like React Router) to handle navigation between different pages (e.g., the main chat UI, a settings page, a user profile page).
 *
 * For now, it's kept simple and renders our main HomePage.
 */
const App: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/workspace" element={<WorkspaceSettings />} />
                <Route path="/integrations" element={<IntegrationsHub />} />
                <Route path="/insights" element={<InsightsCenter />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
