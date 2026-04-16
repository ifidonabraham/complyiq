import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Activity, BarChart3, Settings, LogOut } from 'lucide-react'
import clsx from 'clsx'

export const Navigation: React.FC = () => {
  const location = useLocation()

  const routes = [
    { path: '/', label: 'Dashboard', icon: BarChart3 },
    { path: '/scans', label: 'Scans', icon: Activity },
    { path: '/settings', label: 'Settings', icon: Settings },
  ]

  const handleLogout = () => {
    localStorage.removeItem('complyiq_api_key')
    window.location.href = '/settings'
  }

  return (
    <nav className="bg-dark-card border-b border-dark-border shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-neon rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-dark-bg" />
            </div>
            <span className="text-xl font-bold bg-gradient-neon bg-clip-text text-transparent">
              ComplyIQ
            </span>
          </Link>

          {/* Routes */}
          <div className="flex items-center gap-8">
            {routes.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                  location.pathname === path
                    ? 'text-neon-blue bg-blue-900 bg-opacity-20'
                    : 'text-gray-400 hover:text-white hover:bg-dark-bg'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-red-400 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}
