import React, { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { scanApi } from '@/services/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export const SettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('')
  const [backgroundUrl, setBackgroundUrl] = useState('http://localhost:8000')
  const [showApiKey, setShowApiKey] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')

  // Load saved settings on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('complyiq_api_key')
    const savedUrl = localStorage.getItem('complyiq_backend_url')
    if (savedKey) setApiKey(savedKey)
    if (savedUrl) setBackgroundUrl(savedUrl)
  }, [])

  const handleSaveSettings = async () => {
    setSaveStatus('saving')
    try {
      localStorage.setItem('complyiq_api_key', apiKey)
      localStorage.setItem('complyiq_backend_url', backgroundUrl)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const handleTestConnection = async () => {
    setTestStatus('testing')
    try {
      const health = await scanApi.checkHealth()
      if (health.status === 'ok' || health.status === 'healthy') {
        setTestStatus('success')
        setTestMessage('✓ Connected successfully')
      } else {
        setTestStatus('error')
        setTestMessage('✗ Backend is not healthy')
      }
    } catch (error) {
      setTestStatus('error')
      setTestMessage('✗ Connection failed. Check your backend URL and API key.')
    }
    setTimeout(() => setTestStatus('idle'), 3000)
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-gray-400">Configure your ComplyIQ dashboard</p>
        </div>

        {/* Settings Card */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-8 shadow-lg">
          {/* Backend URL Section */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Backend URL
            </label>
            <input
              type="text"
              value={backgroundUrl}
              onChange={(e) => setBackgroundUrl(e.target.value)}
              placeholder="http://localhost:8000"
              className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-blue"
            />
            <p className="text-xs text-gray-500 mt-2">
              The URL where your ComplyIQ backend is running
            </p>
          </div>

          {/* API Key Section */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-... (optional for development)"
                className="w-full px-4 py-2 pr-10 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-blue"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-300"
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Leave empty for local development without authentication
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleSaveSettings}
              disabled={saveStatus === 'saving'}
              className="flex-1 px-4 py-2 bg-gradient-neon text-dark-bg font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className="flex-1 px-4 py-2 bg-dark-bg border border-neon-blue text-neon-blue font-semibold rounded-lg hover:bg-blue-900 hover:bg-opacity-20 transition-colors disabled:opacity-50"
            >
              {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          {/* Status Messages */}
          {saveStatus === 'success' && (
            <div className="mt-4 flex items-center gap-2 text-green-400">
              <CheckCircle size={18} />
              <span>Settings saved successfully</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="mt-4 flex items-center gap-2 text-red-400">
              <AlertCircle size={18} />
              <span>Failed to save settings</span>
            </div>
          )}
          {testStatus === 'success' && (
            <div className="mt-4 flex items-center gap-2 text-green-400">
              <CheckCircle size={18} />
              <span>{testMessage}</span>
            </div>
          )}
          {testStatus === 'error' && (
            <div className="mt-4 flex items-center gap-2 text-red-400">
              <AlertCircle size={18} />
              <span>{testMessage}</span>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-dark-card border border-dark-border rounded-lg p-8">
          <h2 className="text-lg font-semibold mb-4">Getting Started</h2>
          <ul className="space-y-3 text-sm text-gray-400">
            <li>1. Start your ComplyIQ backend with: <code className="text-neon-blue">docker-compose up -d</code></li>
            <li>2. Enter the backend URL above (default: http://localhost:8000)</li>
            <li>3. Click "Test Connection" to verify it's working</li>
            <li>4. Go to Dashboard to see your scans</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
