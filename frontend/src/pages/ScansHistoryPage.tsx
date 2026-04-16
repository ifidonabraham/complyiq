import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, AlertCircle, CheckCircle } from 'lucide-react'
import { scanApi } from '@/services/api'
import { RatingBadge } from '@/components/RatingBadge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { ScanListItem } from '@/types'

export const ScansHistoryPage: React.FC = () => {
  const [scans, setScans] = useState<ScanListItem[]>([])
  const [filteredScans, setFilteredScans] = useState<ScanListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending' | 'failed'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'rating-high' | 'rating-low'>('newest')

  useEffect(() => {
    loadScans()
  }, [])

  useEffect(() => {
    filterAndSortScans()
  }, [scans, searchQuery, filterStatus, sortBy])

  const loadScans = async () => {
    try {
      const data = await scanApi.listScans(100, 0)
      setScans(data)
    } catch (error) {
      console.error('Failed to load scans:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortScans = () => {
    let result = scans

    // Filter by search query
    if (searchQuery) {
      result = result.filter((scan) =>
        scan.domain?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter((scan) => scan.status === filterStatus)
    }

    // Sort
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortBy === 'rating-high') {
      result.sort((a, b) => b.complyiq_rating - a.complyiq_rating)
    } else if (sortBy === 'rating-low') {
      result.sort((a, b) => a.complyiq_rating - b.complyiq_rating)
    }

    setFilteredScans(result)
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

  const getStatusBg = (status: string) => {
    if (status === 'completed') return 'bg-green-900 bg-opacity-20'
    if (status === 'failed') return 'bg-red-900 bg-opacity-20'
    return 'bg-yellow-900 bg-opacity-20'
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold mb-2">Scan History</h1>
          <p className="text-gray-400">View all website scans and their results</p>
        </div>

        {/* Filters */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6 mb-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative col-span-2">
              <Search className="absolute left-3 top-3 text-gray-500 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by domain..."
                className="w-full pl-10 pr-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-blue"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-neon-blue cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-neon-blue cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="rating-high">Highest Rating</option>
              <option value="rating-low">Lowest Rating</option>
            </select>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner message="Loading scans..." size="md" />
          </div>
        ) : filteredScans.length === 0 ? (
          <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center">
            <p className="text-gray-400">
              {scans.length === 0 ? 'No scans yet.' : 'No scans match your filters.'}
            </p>
          </div>
        ) : (
          <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-bg border-b border-dark-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Domain</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Rating</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Verdict</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {filteredScans.map((scan) => (
                    <tr key={scan.id} className="hover:bg-dark-bg transition-colors">
                      <td className="px-6 py-4 text-sm font-medium">
                        <a
                          href={`https://${scan.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-neon-blue hover:underline"
                        >
                          {scan.domain || 'Unknown'}
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <RatingBadge rating={scan.complyiq_rating} size="sm" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBg(scan.status)} ${getStatusColor(scan.status)}`}>
                          {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          {getVerdictIcon(scan.verdict)}
                          <span>{scan.verdict?.charAt(0).toUpperCase() + (scan.verdict?.slice(1) || '')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(scan.created_at).toLocaleDateString()} {new Date(scan.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link
                          to={`/scan/${scan.id}`}
                          className="text-neon-blue hover:underline font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results Summary */}
        {!isLoading && scans.length > 0 && (
          <div className="mt-6 text-center text-gray-400 text-sm">
            Showing {filteredScans.length} of {scans.length} scans
          </div>
        )}
      </div>
    </div>
  )
}
