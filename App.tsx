import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from './components/layout/AppLayout';
import OverviewPage from './pages/OverviewPage';
import ComposePage from './pages/ComposePage';
import IntegrationsPage from './pages/IntegrationsPage';
import BillingPage from './pages/BillingPage';
import ApiKeysPage from './pages/ApiKeysPage';
import { AuthProvider } from './providers/AuthProvider';
import { PlatformProvider } from './providers/PlatformProvider';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlatformProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/compose" element={<ComposePage />} />
              <Route path="/integrations" element={<IntegrationsPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/api-keys" element={<ApiKeysPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        </PlatformProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
