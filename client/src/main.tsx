import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import 'leaflet/dist/leaflet.css';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { RefreshCw } from 'lucide-react';

// Lazy-loaded routes for optimal bundle code-splitting
const LandingPage = lazy(() => import('./pages/LandingPage'));
const ScanPage = lazy(() => import('./pages/ScanPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const ComparisonPage = lazy(() => import('./pages/ComparisonPage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const SecurityPage = lazy(() => import('./pages/SecurityPage'));
const CookiePage = lazy(() => import('./pages/CookiePage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyPage = lazy(() => import('./pages/VerifyPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex items-center justify-center font-mono p-4">
      <div className="console-panel p-6 text-center space-y-2.5 rounded-xl border border-[var(--border-technical)]">
        <RefreshCw className="h-6 w-6 animate-spin text-[var(--accent-primary)] mx-auto" />
        <p className="text-xs text-[var(--text-secondary)] font-bold tracking-wider uppercase">
          INITIALIZING WORKSTATION MODULE…
        </p>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/scan/:scanId" element={<ScanPage />} />
                <Route path="/report/:scanId" element={<ReportPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/compare/:baseId/:targetId" element={<ComparisonPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/verify" element={<VerifyPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/cookies" element={<CookiePage />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/security" element={<SecurityPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
