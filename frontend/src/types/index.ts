/**
 * Type definitions for ComplyIQ API responses and data models
 */

export interface ScanResult {
  id: number
  url: string
  domain: string | null
  status: 'pending' | 'completed' | 'failed'
  
  // Trust Score Components
  https_grade: string | null
  trust_score: number
  ssl_valid: boolean | null
  dns_valid: boolean | null
  security_headers_count: number
  tracker_count: number
  phishing_risk: number
  
  // Compliance Components
  privacy_policy_found: boolean
  privacy_policy_quality: 'excellent' | 'good' | 'fair' | 'poor' | null
  consent_banner_detected: boolean
  ndpa_compliance_found: boolean
  compliance_score: number
  
  // Sensitive Fields
  bvn_field_detected: boolean
  nin_field_detected: boolean
  email_field_detected: boolean
  phone_field_detected: boolean
  card_field_detected: boolean
  password_field_detected: boolean
  sensitive_field_count: number
  
  // Final Score
  complyiq_rating: number
  verdict: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | null
  
  // Details
  full_report: Record<string, any> | null
  js_analysis: Record<string, any> | null
  data_processors: string[] | null
  error_message: string | null
  
  created_at: string
  updated_at: string
}

export interface ScanListItem {
  id: number
  domain: string | null
  complyiq_rating: number
  verdict: string | null
  status: string
  created_at: string
}

export interface HealthCheck {
  status: string
  version: string
  database: boolean
  redis: boolean
  celery: boolean
}

export interface ApiError {
  error: string
  detail?: string
  status_code: number
}

export interface DashboardStats {
  totalScans: number
  completedScans: number
  avgRating: number
  topRisks: Array<{
    domain: string
    rating: number
    verdict: string
  }>
}

export interface RatingColor {
  bg: string
  text: string
  border: string
  icon: string
}
