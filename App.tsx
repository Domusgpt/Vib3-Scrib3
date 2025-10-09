import React from 'react';
import HomePage from './pages/HomePage';

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
        <HomePage />
    );
};

export default App;
