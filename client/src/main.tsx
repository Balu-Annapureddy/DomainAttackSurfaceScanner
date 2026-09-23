import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Dashboard from './pages/AdminDashboard'
import VisitorPage from './pages/VisitorPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/r/:token" element={<VisitorPage />} />
        <Route path="/d/:token" element={<VisitorPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
