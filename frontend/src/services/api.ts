/**
 * API service for ComplyIQ backend communication
 */

import axios from 'axios'
import type { ScanResult, ScanListItem, HealthCheck, ApiError } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor to add API key to requests
apiClient.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem('complyiq_api_key')
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey
  }
  return config
})

// Interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('complyiq_api_key')
      window.location.href = '/settings'
    }
    return Promise.reject(error)
  }
)

export const scanApi = {
  /**
   * Initiate a new website scan
   */
  async checkWebsite(url: string): Promise<ScanResult> {
    const response = await apiClient.post('/scans/check', { url })
    return response.data
  },

  /**
   * Get scan result by ID
   */
  async getScanResult(scanId: number): Promise<ScanResult> {
    const response = await apiClient.get(`/scans/${scanId}`)
    return response.data
  },

  /**
   * List all scans with pagination
   */
  async listScans(limit: number = 50, offset: number = 0): Promise<ScanListItem[]> {
    const response = await apiClient.get('/scans', {
      params: { limit, offset },
    })
    return response.data
  },

  /**
   * Get scan history for a specific domain
   */
  async getDomainHistory(domain: string): Promise<ScanListItem[]> {
    const response = await apiClient.get(`/scans/domain/${domain}`)
    return response.data
  },

  /**
   * Check backend health
   */
  async checkHealth(): Promise<HealthCheck> {
    const response = await apiClient.get('/health')
    return response.data
  },
}

export default apiClient
