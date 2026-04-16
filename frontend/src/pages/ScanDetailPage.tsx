import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle, Shield, FileText } from 'lucide-react'
import { scanApi } from '@/services/api'
import { RatingBadge } from '@/components/RatingBadge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { ScanResult } from '@/types'

export const ScanDetailPage: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>()
  const navigate = useNavigate()
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadScan()
    // Poll every 2 seconds if pending
    const interval = setInterval(() => {
      if (scan?.status === 'pending') {
        loadScan()
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [scanId, scan?.status])

  const loadScan = async () => {
    if (!scanId) return
    try {
      const result = await scanApi.getScanResult(parseInt(scanId))
      setScan(result)
      setError('')
    } catch (error: any) {
      setError('Failed to load scan details')
      console.error(error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadScan()
  }

  const handleRescan = async () => {
    if (!scan) return
    setIsRefreshing(true)
    try {
      const result = await scanApi.checkWebsite(scan.url)
      setScan(result)
    } catch (error) {
      setError('Failed to rescan website')
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <LoadingSpinner message="Loading scan details..." />
      </div>
    )
  }

  if (error || !scan) {
    return (
      <div className="min-h-screen bg-dark-bg px-4 py-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-neon-blue hover:underline mb-6"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <div className="bg-dark-card border border-red-500 rounded-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400">{error || 'Scan not found'}</p>
        </div>
      </div>
    )
  }

  const trustFactors = [
    { label: 'HTTPS Grade', value: scan.https_grade },
    { label: 'DNS Valid', value: scan.dns_valid ? '✓' : '✗' },
    { label: 'Security Headers', value: scan.security_headers_count },
    { label: 'Trackers Found', value: scan.tracker_count },
  ]

  const complianceFactors = [
    { label: 'Privacy Policy', value: scan.privacy_policy_found ? '✓ Found' : '✗ Not found' },
    { label: 'Policy Quality', value: scan.privacy_policy_quality || 'N/A' },
    { label: 'Consent Banner', value: scan.consent_banner_detected ? '✓ Detected' : '✗ Not detected' },
    { label: 'NDPA Compliant', value: scan.ndpa_compliance_found ? '✓ Yes' : '✗ No' },
  ]

  const sensitiveFields = [
    { label: 'BVN Fields', found: scan.bvn_field_detected },
    { label: 'NIN Fields', found: scan.nin_field_detected },
    { label: 'Email Fields', found: scan.email_field_detected },
    { label: 'Phone Fields', found: scan.phone_field_detected },
    { label: 'Card Fields', found: scan.card_field_detected },
    { label: 'Password Fields', found: scan.password_field_detected },
  ]

  return (
    <div className="min-h-screen bg-dark-bg">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/scans')}
              className="flex items-center gap-2 text-neon-blue hover:underline"
            >
              <ArrowLeft size={18} />
              Back to Scans
            </button>
            <div>
              <h1 className="text-3xl font-bold">{scan.domain || scan.url}</h1>
              <p className="text-gray-400 text-sm mt-1">
                Scanned: {new Date(scan.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleRescan}
              disabled={isRefreshing}
              className="px-4 py-2 bg-dark-bg border border-neon-blue text-neon-blue rounded-lg hover:bg-blue-900 hover:bg-opacity-20 transition-colors disabled:opacity-50"
            >
              Rescan
            </button>
          </div>
        </div>

        {/* Status */}
        {scan.status === 'pending' && (
          <div className="mb-8 p-4 bg-yellow-900 bg-opacity-20 border border-yellow-600 rounded-lg flex items-center gap-3 text-yellow-400">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span>Scan in progress...</span>
          </div>
        )}
        {scan.status === 'failed' && (
          <div className="mb-8 p-4 bg-red-900 bg-opacity-20 border border-red-600 rounded-lg flex items-center gap-3 text-red-400">
            <AlertCircle size={18} />
            <span>{scan.error_message || 'Scan failed'}</span>
          </div>
        )}

        {/* Main Scores */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="bg-dark-card border border-dark-border rounded-lg p-8 text-center shadow-lg">
            <p className="text-gray-400 mb-4 text-sm">Trust Score</p>
            <div className="flex justify-center mb-4">
              <RatingBadge rating={scan.trust_score} size="lg" />
            </div>
            <p className="text-gray-300 text-xs">Based on SSL, DNS, Headers, Trackers</p>
          </div>

          <div className="bg-dark-card border border-dark-border rounded-lg p-8 text-center shadow-lg">
            <p className="text-gray-400 mb-4 text-sm">Compliance Score</p>
            <div className="flex justify-center mb-4">
              <RatingBadge rating={scan.compliance_score} size="lg" />
            </div>
            <p className="text-gray-300 text-xs">Based on Policy, Consent, NDPA, Fields</p>
          </div>

          <div className="bg-dark-card border border-dark-border rounded-lg p-8 text-center shadow-lg">
            <p className="text-gray-400 mb-4 text-sm">ComplyIQ Rating</p>
            <div className="flex justify-center mb-4">
              <RatingBadge rating={scan.complyiq_rating} size="lg" />
            </div>
            <p className="text-gray-300 text-xs">Overall Risk Assessment</p>
          </div>
        </div>

        {/* Trust Score Breakdown */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-8 mb-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-neon-blue" />
            <h2 className="text-xl font-semibold">Trust Factors</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {trustFactors.map((factor, i) => (
              <div key={i} className="p-4 bg-dark-bg rounded-lg border border-dark-border">
                <p className="text-gray-400 text-xs mb-2">{factor.label}</p>
                <p className="text-lg font-semibold text-neon-blue">{factor.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance Score Breakdown */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-8 mb-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-5 h-5 text-neon-violet" />
            <h2 className="text-xl font-semibold">Compliance Factors</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {complianceFactors.map((factor, i) => (
              <div key={i} className="p-4 bg-dark-bg rounded-lg border border-dark-border">
                <p className="text-gray-400 text-xs mb-2">{factor.label}</p>
                <p className="text-sm font-semibold text-neon-violet">{factor.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sensitive Fields */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-8 shadow-lg">
          <h2 className="text-xl font-semibold mb-6">Sensitive Fields Detected</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {sensitiveFields.map((field, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border ${
                  field.found
                    ? 'bg-red-900 bg-opacity-20 border-red-600'
                    : 'bg-green-900 bg-opacity-20 border-green-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  {field.found ? (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                  <span className={field.found ? 'text-red-400' : 'text-green-400'}>
                    {field.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-6">
            Total sensitive fields found: <span className="text-red-400 font-semibold">{scan.sensitive_field_count}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
