# ComplyIQ Pre-Deployment Checklist

## 🔐 SECURITY & CONFIGURATION

### Backend Environment
- [ ] Generate new `SECRET_KEY` and `JWT_SECRET_KEY` (min 32 chars)
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(32))"
  ```
- [ ] Set `DEBUG=false` in production
- [ ] Set `ENVIRONMENT=production`
- [ ] Update `CORS_ORIGINS` with actual frontend URL
- [ ] Include `chrome-extension://*` in CORS_ORIGINS
- [ ] Set `LOG_LEVEL=WARNING` (not DEBUG)
- [ ] Enable HTTPS for all external URLs
- [ ] Database: Use managed service (RDS, DigitalOcean Database)
- [ ] Database password: Change from default
- [ ] Redis: Enable password authentication
- [ ] Redis: Use managed service if possible
- [ ] JWT expiration: 15 min access token, 7 day refresh
- [ ] Rate limiting: 20 req/min for production
- [ ] API key validation: Verify rate limiting works
- [ ] SSL/TLS: Enforce HTTPS-only communication

### Database
- [ ] Backup strategy: Daily automated backups
- [ ] Backup retention: Keep 30+ days of backups
- [ ] Connection pooling: Set pool_size=20, max_overflow=10
- [ ] Enable slow query logging (logs queries > 1s)
- [ ] Monitor disk space (alert at 80% capacity)
- [ ] Run migrations: `alembic upgrade head`
- [ ] Verify all tables exist and have data
- [ ] Test database failover (if backup available)

### Redis Cache
- [ ] Password protected: Yes
- [ ] Memory limit policy: `allkeys-lru` (evict oldest)
- [ ] Persistence: Enabled (RDB or AOF)
- [ ] Monitor memory usage (alert at 80%)
- [ ] Set TTL on all keys (already configured: 24h)

### Frontend
- [ ] Update `VITE_API_URL` to production backend
- [ ] Verify React build: `npm run build` succeeds
- [ ] Bundle size < 200KB (gzip)
- [ ] No console errors in production build
- [ ] Update favicon & meta tags
- [ ] Test all pages load without errors
- [ ] Verify API key input works (localStorage)
- [ ] Test CORS errors are handled gracefully

### Chrome Extension
- [ ] Update backend URL in `extension/src/background.js`
- [ ] Background script: Verify API calls work
- [ ] Content script: Verify field detection works
- [ ] Popup: Verify rating badge displays
- [ ] Options page: Verify settings persist
- [ ] Test on Chrome (latest version)
- [ ] Test on Edge (optional but recommended)
- [ ] No API keys hardcoded in code
- [ ] Permission request message is clear

---

## 🏗️ DEPLOYMENT INFRASTRUCTURE

### Vercel (Frontend)
- [ ] Create Vercel account
- [ ] Link GitHub repository
- [ ] Configure build settings:
  - Framework: Vite
  - Build command: `npm run build --legacy-peer-deps`
  - Output: `dist`
  - Root: `./frontend`
- [ ] Add environment variables (VITE_API_URL)
- [ ] Enable GitHub integration for auto-deploy
- [ ] Add custom domain (optional)
- [ ] Enable Vercel Analytics
- [ ] Configure error reporting
- [ ] Test preview deployment first

### Railway (Backend)
- [ ] Create Railway account
- [ ] Connect GitHub repository
- [ ] Select `/backend` as root directory
- [ ] Add PostgreSQL service
- [ ] Add Redis service
- [ ] Configure environment variables
- [ ] Set resource limits (prevent overage)
- [ ] Enable auto-deploy on push
- [ ] Run migrations on deployment
- [ ] Configure health checks
- [ ] Set up alerts for high resource usage

### GitHub Actions (CI/CD)
- [ ] Create `.github/workflows/deploy.yml`
- [ ] Add secrets to GitHub:
  - `RAILWAY_TOKEN`
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`
  - `DOCKER_USERNAME` (if using Docker Hub)
  - `DOCKER_PASSWORD` (if using Docker Hub)
- [ ] Run tests before deploy
- [ ] Build Docker image (if self-hosted)
- [ ] Test deployment workflow with dry-run

---

## 📋 API ENDPOINTS

### Test All Endpoints
- [ ] GET `/health` — Returns 200 OK with status
- [ ] POST `/api/v1/scans/check` — Creates new scan
- [ ] GET `/api/v1/scans/{id}` — Fetches scan result
- [ ] GET `/api/v1/scans` — Lists all scans
- [ ] GET `/api/v1/scans/domain/{domain}` — Domain history
- [ ] Invalid API key → Returns 401 Unauthorized
- [ ] Rate limit exceeded → Returns 429 Too Many Requests

### Response Format
- [ ] All responses return JSON
- [ ] Error responses include `error` and `status_code`
- [ ] Success responses include data
- [ ] Timestamps are in ISO 8601 format
- [ ] Numeric values maintain precision

---

## 🧪 FUNCTIONALITY TESTING

### End-to-End Flow
1. **Frontend Dashboard**
   - [ ] Page loads without errors
   - [ ] Navigation links work
   - [ ] Settings page accessible

2. **Settings Configuration**
   - [ ] Enter backend URL
   - [ ] Save API key (localStorage)
   - [ ] Test connection succeeds

3. **Scan Creation**
   - [ ] Enter valid URL
   - [ ] Click "Scan"
   - [ ] Scan ID returned
   - [ ] Status shows "pending"

4. **Real-Time Polling**
   - [ ] Frontend polls GET /scans/{id}
   - [ ] Progress indicator animates
   - [ ] Polling stops when status changes

5. **Scan Completion**
   - [ ] Results display correctly
   - [ ] Rating scores calculated
   - [ ] Verdict determined
   - [ ] Findings listed

6. **Scan History**
   - [ ] Recent scans displayed
   - [ ] Search filters work
   - [ ] Sort options work
   - [ ] Click detail page loads full report

7. **Error Handling**
   - [ ] Backend error → User sees message
   - [ ] Network error → Retry available
   - [ ] Invalid URL → Validation message

---

## 🔍 MONITORING & LOGGING

### Application Monitoring
- [ ] Sentry setup (error tracking):
  - [ ] Configured in backend
  - [ ] Receives error notifications
  - [ ] Dashboard accessible

- [ ] Logging:
  - [ ] Backend logs requests
  - [ ] Failed scans logged
  - [ ] API errors logged
  - [ ] Log retention: 7 days minimum

- [ ] Database:
  - [ ] Query times < 1s
  - [ ] Connection pool healthy
  - [ ] No connection errors

- [ ] Celery Tasks:
  - [ ] Tasks complete successfully
  - [ ] Failed tasks logged
  - [ ] Retry logic working
  - [ ] Dead letter queue empty

### Alerts Configuration
- [ ] High error rate (>1%) → Alert
- [ ] API response time > 2s → Alert
- [ ] Database connection failures → Alert
- [ ] Redis cache failures → Alert
- [ ] Disk space > 80% → Alert
- [ ] Memory usage > 85% → Alert
- [ ] CPU usage > 90% → Alert

---

## 🔄 BACKUP & DISASTER RECOVERY

### Database Backups
- [ ] Automated daily backups enabled
- [ ] Backups stored in separate location (S3, etc.)
- [ ] Backup retention: 30+ days
- [ ] Test backup restoration (verify data intact)
- [ ] Backup encryption enabled

### Data Recovery Plan
- [ ] RTO (Recovery Time Objective): < 1 hour
- [ ] RPO (Recovery Point Objective): < 24 hours
- [ ] Documented recovery procedure
- [ ] Team trained on recovery process

---

## 📊 PERFORMANCE OPTIMIZATION

### Frontend
- [ ] Lighthouse score > 80
- [ ] First Contentful Paint < 2s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] Time to Interactive < 3s
- [ ] Bundle size measured and acceptable

### Backend
- [ ] API response time < 1s (p95)
- [ ] Database query time < 500ms (p95)
- [ ] Scan completion time < 30s (average)
- [ ] Cache hit rate > 70%
- [ ] No N+1 queries detected

### Database
- [ ] Indexes created on frequently queried columns
- [ ] Query execution plans analyzed
- [ ] Slow query threshold: 1s
- [ ] Analyze queries regularly

---

## 🔑 SSL/CERTIFICATES

- [ ] HTTPS enabled on all domains
- [ ] Certificate valid and not self-signed
- [ ] Certificate expires: Automated renewal
- [ ] Certificate chain complete (all intermediate certs)
- [ ] Mixed content warnings: None
- [ ] SSL/TLS version: 1.2+
- [ ] Cipher suites: Strong only (no weak ciphers)

---

## 📱 CROSS-PLATFORM TESTING

### Framework Support
- [ ] Chrome (latest) → Tests pass
- [ ] Edge (latest) → Tests pass
- [ ] Firefox (latest) → Tests pass
- [ ] Safari (latest) → Tests pass
- [ ] Chrome Mobile → Responsive works

### Accessibility
- [ ] WCAG 2.1 Level AA compliance
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast adequate
- [ ] Focus indicators visible

---

## 📋 DOCUMENTATION

- [ ] README.md updated
  - [ ] Installation instructions
  - [ ] Configuration guide
  - [ ] Deployment steps
  - [ ] API documentation
  - [ ] Troubleshooting guide

- [ ] Deployment guide created
  - [ ] Prerequisites listed
  - [ ] Step-by-step instructions
  - [ ] Environment variables documented
  - [ ] Rollback procedure documented

- [ ] Team onboarded
  - [ ] Access credentials shared securely
  - [ ] Deployment procedures documented
  - [ ] On-call runbook created
  - [ ] Escalation procedures defined

---

## ✅ FINAL CHECKS

Before pushing live:

- [ ] All items in this checklist completed
- [ ] Code reviewed by another team member (if available)
- [ ] Tests pass locally and in CI/CD
- [ ] Staging deployment tested
- [ ] No secrets committed to repository
- [ ] Dependencies audited for security issues
- [ ] License compliance verified
- [ ] Privacy policy updated (if needed)
- [ ] Terms of Service updated (if needed)
- [ ] GDPR compliance verified (if applicable)

---

## 🚀 DEPLOYMENT DAY

1. **Pre-Deployment (30 min before)**
   - [ ] Team on standby
   - [ ] Staging environment tested
   - [ ] Rollback plan documented
   - [ ] Monitoring dashboards open

2. **Deployment (during)**
   - [ ] Deploy backend first
   - [ ] Run database migrations
   - [ ] Verify backend health
   - [ ] Deploy frontend
   - [ ] Test end-to-end flow
   - [ ] Update Chrome Extension (if needed)

3. **Post-Deployment (1 hour after)**
   - [ ] Monitor error logs
   - [ ] Monitor performance metrics
   - [ ] Check user reports
   - [ ] Verify backups working
   - [ ] Document any issues

4. **Follow-up (24 hours after)**
   - [ ] Collect metrics/stats
   - [ ] Performance review
   - [ ] Security check
   - [ ] Database integrity check

---

## 📞 SUPPORT CONTACTS

| Platform | Contact | Priority |
|----------|---------|----------|
| Vercel | support@vercel.com | High |
| Railway | support@railway.app | High |
| PostgreSQL | docs.postgresql.org | Medium |
| Redis | redis.io/support | Medium |
| DNS Provider | depends | High |

---

**Status: Ready for Production Deployment ✅**

Print this checklist and verify each item before going live!
