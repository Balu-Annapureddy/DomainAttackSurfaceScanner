import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import 'leaflet/dist/leaflet.css'
import LandingPage from './pages/LandingPage'
import ScanPage from './pages/ScanPage'
import HistoryPage from './pages/HistoryPage'
import ComparisonPage from './pages/ComparisonPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/scan/:scanId" element={<ScanPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/compare/:baseId/:targetId" element={<ComparisonPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
