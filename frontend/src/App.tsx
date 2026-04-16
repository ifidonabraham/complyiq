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

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
