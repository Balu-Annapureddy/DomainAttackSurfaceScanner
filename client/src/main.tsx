import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import 'leaflet/dist/leaflet.css'
import LandingPage from './pages/LandingPage'
import ScanPage from './pages/ScanPage'
import HistoryPage from './pages/HistoryPage'
import ComparisonPage from './pages/ComparisonPage'
import ReportPage from './pages/ReportPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import SecurityPage from './pages/SecurityPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/scan/:scanId" element={<ScanPage />} />
        <Route path="/report/:scanId" element={<ReportPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/compare/:baseId/:targetId" element={<ComparisonPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/security" element={<SecurityPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
