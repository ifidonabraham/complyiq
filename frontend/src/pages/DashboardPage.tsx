import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, AlertCircle, CheckCircle } from 'lucide-react'
import { scanApi } from '@/services/api'
import { RatingBadge } from '@/components/RatingBadge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { ScanResult, ScanListItem } from '@/types'

export const DashboardPage: React.FC = () => {
  const [searchUrl, setSearchUrl] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [recentScans, setRecentScans] = useState<ScanListItem[]>([])
  const [isLoadingScans, setIsLoadingScans] = useState(true)

  // Load recent scans on mount
  useEffect(() => {
    loadRecentScans()
  }, [])

  const loadRecentScans = async () => {
    try {
      const scans = await scanApi.listScans(10, 0)
      setRecentScans(scans)
    } catch (error) {
      console.error('Failed to load scans:', error)
    } finally {
      setIsLoadingScans(false)
    }
  }

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchUrl.trim()) return

    setScanError('')
    setIsScanning(true)
    try {
      const result = await scanApi.checkWebsite(searchUrl)
      // Redirect to detail page
      window.location.href = `/scan/${result.id}`
    } catch (error: any) {
      setScanError(
        error.response?.data?.detail || 
        'Failed to start scan. Is your backend running?'
      )
    } finally {
      setIsScanning(false)
    }
  }

  const getVerdictIcon = (verdict: string | null) => {
    if (verdict === 'critical' || verdict === 'poor') {
      return <AlertCircle className="w-4 h-4 text-red-400" />
    }
    return <CheckCircle className="w-4 h-4 text-green-400" />
  }

  const getStatusColor = (status: string) => {
    if (status === 'completed') return 'text-green-400'
    if (status === 'failed') return 'text-red-400'
    return 'text-yellow-400'
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-400">Monitor website compliance and security risks</p>
        </div>

        {/* Quick Scan Section */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-8 mb-12 shadow-lg">
          <h2 className="text-xl font-semibold mb-6">Quick Scan</h2>
          <form onSubmit={handleScan} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-500 w-5 h-5" />
              <input
                type="url"
                value={searchUrl}
                onChange={(e) => setSearchUrl(e.target.value)}
                placeholder="Enter website URL (https://example.com)"
                className="w-full pl-10 pr-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-blue"
              />
            </div>
            <button
              type="submit"
              disabled={isScanning || !searchUrl}
              className="px-8 py-3 bg-gradient-neon text-dark-bg font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isScanning ? 'Scanning...' : 'Scan'}
            </button>
          </form>
          {scanError && (
            <div className="mt-4 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={18} />
              <span>{scanError}</span>
            </div>
          )}
        </div>

        {/* Recent Scans */}
        <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden shadow-lg">
          <div className="px-8 py-6 border-b border-dark-border">
            <h2 className="text-xl font-semibold">Recent Scans</h2>
          </div>

          {isLoadingScans ? (
            <div className="p-12 flex justify-center">
              <LoadingSpinner message="Loading scans..." size="sm" />
            </div>
          ) : recentScans.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p>No scans yet. Start by scanning a website above!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-bg">
                  <tr>
                    <th className="px-8 py-4 text-left text-sm font-semibold text-gray-300">Domain</th>
                    <th className="px-8 py-4 text-left text-sm font-semibold text-gray-300">Rating</th>
                    <th className="px-8 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                    <th className="px-8 py-4 text-left text-sm font-semibold text-gray-300">Verdict</th>
                    <th className="px-8 py-4 text-left text-sm font-semibold text-gray-300">Date</th>
                    <th className="px-8 py-4 text-left text-sm font-semibold text-gray-300">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {recentScans.map((scan) => (
                    <tr key={scan.id} className="hover:bg-dark-bg transition-colors">
                      <td className="px-8 py-4 text-sm">{scan.domain || 'Unknown'}</td>
                      <td className="px-8 py-4">
                        <div className="flex justify-center">
                          <RatingBadge rating={scan.complyiq_rating} size="sm" />
                        </div>
                      </td>
                      <td className="px-8 py-4 text-sm">
                        <span className={getStatusColor(scan.status)}>
                          {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          {getVerdictIcon(scan.verdict)}
                          <span>{scan.verdict || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-sm text-gray-400">
                        {new Date(scan.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-4 text-sm">
                        <Link
                          to={`/scan/${scan.id}`}
                          className="text-neon-blue hover:underline font-medium"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
