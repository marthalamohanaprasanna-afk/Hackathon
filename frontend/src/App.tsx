import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AppLayout } from './layouts/AppLayout.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { DocumentsPage } from './pages/DocumentsPage.js';
import { UploadPage } from './pages/UploadPage.js';
import { DocumentDetailPage } from './pages/DocumentDetailPage.js';
import { DocumentReviewPage } from './pages/DocumentReviewPage.js';
import { ReviewQueuePage } from './pages/ReviewQueuePage.js';
import { AssistantPage } from './pages/AssistantPage.js';
import { InsightsPage } from './pages/InsightsPage.js';
import { KnowledgeGraphPage } from './pages/KnowledgeGraphPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { SignupPage } from './pages/SignupPage.js';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected Application Workspace */}
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="documents/upload" element={<UploadPage />} />
            <Route path="documents/:id" element={<DocumentDetailPage />} />
            <Route path="documents/:id/review" element={<DocumentReviewPage />} />
            <Route path="review-queue" element={<ReviewQueuePage />} />
            <Route path="assistant" element={<AssistantPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="knowledge-graph" element={<KnowledgeGraphPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
