import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Navigation } from '@/components/Navigation'
import { DashboardPage } from '@/pages/DashboardPage'
import { ScansHistoryPage } from '@/pages/ScansHistoryPage'
import { ScanDetailPage } from '@/pages/ScanDetailPage'
import { SettingsPage } from '@/pages/SettingsPage'
import './App.css'

function App() {
  const hasApiKey = localStorage.getItem('complyiq_api_key') || localStorage.getItem('complyiq_backend_url')

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-dark-bg text-white">
        {hasApiKey && <Navigation />}
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
          {hasApiKey ? (
            <>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/scans" element={<ScansHistoryPage />} />
              <Route path="/scan/:scanId" element={<ScanDetailPage />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/settings" replace />} />
          )}
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
