# ComplyIQ - Complete Installation & Setup Guide

## Project Overview

**ComplyIQ** is a three-pillar privacy & compliance platform:

1. **User Protection Layer** (Browser Extension) → Real-time warnings for sensitive form fields
2. **Business Compliance Engine** (FastAPI Backend) → Website scanning for NDPA compliance
3. **Website Risk Intelligence** (Unified Rating) → Combined Trust Score + Compliance Score

---

## Quick Start (Complete Stack)

### Prerequisites
- **Docker & Docker Compose** (recommended)
- **Chrome browser** (for extension)
- **Git** (optional, for version control)

### Step 1: Start Backend

```bash
cd /path/to/ComplyIQ

# Start entire stack (FastAPI, PostgreSQL, Redis, Celery, Flower)
docker-compose up -d

# Wait ~10 seconds, then run migrations
docker-compose exec backend alembic upgrade head

# Verify health
curl http://localhost:8000/health
# Expected: {"status": "ok", "database": "connected", "redis": "connected"}
```

### Step 2: Install Chrome Extension

```bash
# Navigate to chrome://extensions/ in Chrome browser
# Enable "Developer mode" (toggle in top right)
# Click "Load unpacked"
# Select the /path/to/ComplyIQ/extension folder
# Extension should appear in toolbar
```

### Step 3: Configure Extension

1. Click the **ComplyIQ** icon in your Chrome toolbar
2. If first time, click **"Open Settings"** button
3. Enter API key:
   - For testing: Use any string (backend development mode accepts any key)
   - Production: Get from ComplyIQ dashboard
4. Verify backend URL: `http://localhost:8000`
5. Click **"Test Connection"** → should see "Connection successful"
6. Click **"Save Settings"**

### Step 4: Test the System

1. **Visit a website**: `https://www.google.com`
2. **Click ComplyIQ icon** → Should see:
   - Domain name: "google.com"
   - ComplyIQ Rating (blue circle with score, e.g., 82.5/100)
   - Trust & Compliance scores
   - Key findings (HTTPS grade, Privacy policy, Trackers, etc.)

3. **Fill out a form**:
   - Click on any email field
   - Should show inline warning badge (neon violet border + text)
   - Field should be highlighted

4. **Monitor console** (for debugging):
   ```bash
   docker-compose logs -f backend
   ```

---

## Backend Setup (Detailed)

### Option A: Docker Compose (Recommended)

```bash
cd /path/to/ComplyIQ

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f celery-worker
docker-compose logs -f postgres

# Run migrations
docker-compose exec backend alembic upgrade head

# Stop everything
docker-compose down
```

**Services:**
- FastAPI Backend: http://localhost:8000
- PostgreSQL: localhost:5432 (user: complyiq, password: SecurePass2026!)
- Redis: localhost:6379
- Celery Flower (monitoring): http://localhost:5555

### Option B: Local Development (Manual)

```bash
cd /path/to/ComplyIQ/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
playwright install chromium

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
alembic upgrade head

# Start FastAPI (Terminal 1)
uvicorn app.main:app --reload --port 8000

# Start Celery worker (Terminal 2)
celery -A app.tasks worker --loglevel=info --concurrency=4

# Optional: Start Celery Flower monitoring (Terminal 3)
celery -A app.tasks flower --port=5555
```

### Database Verification

```bash
# Via Docker
docker-compose exec postgres psql -U complyiq -d complyiq_db -c "\dt"

# Via local psql
psql postgresql://complyiq:SecurePass2026!@localhost/complyiq_db -c "\dt"
```

Should show tables: users, api_keys, scan_results, audit_logs

---

## Extension Setup (Detailed)

### File Structure Explained

```
extension/
├── manifest.json              # Chrome extension configuration
├── src/
│   ├── background.js          # Service worker (API calls, orchestration)
│   ├── content.js             # Content script (field detection)
│   └── pages/
│       ├── popup.html         # Popup badge UI
│       └── options.html       # Settings page
└── public/
    ├── popup.js               # Popup logic
    ├── popup.css              # Popup styling  
    ├── options.js             # Options logic
    └── options.css            # Options styling
```

### How It Works

**1. Content Script (`src/content.js`)**
- Runs on every webpage
- Scans DOM for sensitive input fields (BVN, NIN, email, phone, card, password)
- Adds neon violet borders to detected fields
- Shows inline warning when field focused
- Sends message to background worker to initiate scan

**2. Background Worker (`src/background.js`)**
- Receives scan request from content script
- Checks cache for recent results (24h TTL)
- If not cached, calls backend `POST /api/v1/scans/check`
- Polls backend `GET /api/v1/scans/{scan_id}` until complete
- Caches result in chrome.storage.local
- Sends result back to content script & popup

**3. Popup UI (`src/pages/popup.html` + `public/popup.js` + `public/popup.css`)**
- Displays when user clicks ComplyIQ icon
- Shows cached rating badge + scores
- Lists key findings
- Buttons for full report & rescan

**4. Options Page (`src/pages/options.html` + `public/options.js`)**
- Configure API key
- Set backend URL
- Notification preferences
- Test connection
- Clear cache

### Installation Steps

**Step 1: Load in Chrome**
```
chrome://extensions/
→ Enable "Developer mode" (top right toggle)
→ Click "Load unpacked"
→ Select /path/to/ComplyIQ/extension
```

**Step 2: Configure API Key**
```
Click ComplyIQ icon → Opens popup
If first time: "Configuration Required"
→ Click "Open Settings"
→ Enter API key (backend development mode accepts any string)
→ Backend URL: http://localhost:8000
→ Click "Test Connection"
→ Click "Save Settings"
```

**Step 3: Test on Websites**
- Visit https://www.google.com
- Click ComplyIQ icon → See rating badge
- Click on email field → See warning
- Fill form → See risk indicators

### Debugging

**Chrome DevTools - Extension**
```
Right-click ComplyIQ icon → "Inspect popup"
→ Console tab shows [ComplyIQ] logs
```

**Chrome DevTools - Content Script**
```
Right-click webpage → "Inspect element"
→ Console tab shows [ComplyIQ] content script logs
```

**Background Worker Logs**
```
chrome://extensions/
→ Find ComplyIQ → Click "show errors"
→ See background worker logs and errors
```

**Backend Logs**
```bash
docker-compose logs -f backend
```

---

## API Usage Examples

### Example 1: Scan a Website

```bash
curl -X POST "http://localhost:8000/api/v1/scans/check" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.google.com"}'

# Response:
# {
#   "id": 1,
#   "domain": "google.com",
#   "url": "https://www.google.com",
#   "scan_status": "pending",
#   "created_at": "2026-04-16T10:30:00Z"
# }
```

### Example 2: Poll for Results (after ~20-30 seconds)

```bash
curl http://localhost:8000/api/v1/scans/1

# Response when complete:
# {
#   "id": 1,
#   "domain": "google.com",
#   "complyiq_rating": 82.5,
#   "trust_score": 85.0,
#   "compliance_score": 80.0,
#   "https_grade": "A",
#   "privacy_policy_found": true,
#   "consent_banner_found": true,
#   "scan_status": "completed",
#   ...
# }
```

### Example 3: List Recent Scans

```bash
curl "http://localhost:8000/api/v1/scans?limit=5&offset=0"

# Response:
# [
#   {
#     "id": 1,
#     "domain": "google.com",
#     "complyiq_rating": 82.5,
#     "scan_status": "completed",
#     "created_at": "2026-04-16T10:30:00Z"
#   },
#   ...
# ]
```

### Example 4: Get Scan History for Domain

```bash
curl http://localhost:8000/api/v1/scans/domain/google.com

# Response: Array of scans for that domain, newest first
```

---

## Scoring System

### Trust Score (Technical Security)

Based on:
- **HTTPS/SSL Grade** (30%): A+, A, B, C, D, F
- **DNS Configuration** (20%): A/AAAA/MX/SPF/DMARC records
- **Security Headers** (25%): X-Frame-Options, CSP, X-Content-Type-Options, etc.
- **Tracker Count** (15%): Third-party scripts and analytics
- **Phishing Risk** (10%): Domain reputation and structure

### Compliance Score (Privacy & NDPA)

Based on:
- **Privacy Policy** (30%): Present, quality assessment
- **Consent Banner** (20%): Cookie consent mechanism
- **NDPA Indicators** (25%): Mentions NDPA, user rights, data retention
- **Sensitive Field Protection** (15%): Inventory of BVN, NIN, phone, card fields
- **Data Processor Disclosure** (10%): Third-party processor list

### ComplyIQ Rating (Combined)

```
ComplyIQ Rating = (Trust Score × 0.5) + (Compliance Score × 0.5)
Range: 0-100
```

**Color Coding:**
- 80-100: 🟢 Neon Blue (`#00D9FF`) - Excellent
- 60-79: 🟡 Cyan (`#06B6D4`) - Good
- 40-59: 🟠 Amber (`#FBBF24`) - Fair
- 20-39: 🟠 Orange (`#FB923C`) - Poor
- 0-19: 🔴 Red (`#EF4444`) - Critical

---

## Monitoring & Maintenance

### Check Service Health

```bash
# Backend health
curl http://localhost:8000/health

# Database
docker-compose exec postgres pg_isready -U complyiq

# Redis
redis-cli ping

# Celery workers
curl http://localhost:5555 # Flower web UI
```

### View Logs

```bash
# FastAPI backend
docker-compose logs -f backend

# Celery worker
docker-compose logs -f celery-worker

# PostgreSQL
docker-compose logs -f postgres

# All services
docker-compose logs -f
```

### Database Admin

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U complyiq -d complyiq_db

# Common queries
SELECT * FROM scan_results ORDER BY created_at DESC LIMIT 10;
SELECT * FROM users;
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;

# Exit
\q
```

---

## Troubleshooting

### Problem: Extension says "Configuration Required"

**Solution:**
1. Click "Open Settings"
2. Ensure API key field is filled (any string works in dev mode)
3. Ensure Backend URL is `http://localhost:8000`
4. Click "Test Connection"
5. Should see "Connection successful"

### Problem: Scan stays "in_progress" forever

**Solution:**
1. Check backend is running: `curl http://localhost:8000/health`
2. Check Celery worker: `docker-compose logs -f celery-worker`
3. Restart worker: `docker-compose restart celery-worker`

### Problem: Content script not detecting fields

**Solution:**
1. Right-click → Inspect → Console
2. Look for `[ComplyIQ]` logs
3. If none, content script didn't initialize
4. Try refreshing page with extension installed
5. Check manifest.json has `"content_scripts"` declaration

### Problem: Fields not showing warning when focused

**Solution:**
1. Check browser console for JavaScript errors
2. Verify content script is running: `console.log('[ComplyIQ] Initialized on...')`
3. Try on simpler page (e.g., google.com/search)
4. Check if page has strict CSP that blocks styling

### Problem: Backend API calls failing

**Solution:**
1. Verify backend is running: `docker-compose ps`
2. Check firewall isn't blocking localhost:8000
3. Look at backend logs: `docker-compose logs backend | grep ERROR`
4. Restart backend: `docker-compose restart backend`

---

## Performance Tips

1. **Cache Your Scans**: Results cached for 24h, limit API calls
2. **Lazy-Load Scripts**: Content scripts only run on websites
3. **Batch Processing**: Backend processes Trust + Compliance in parallel
4. **Use Flower**: Monitor Celery task queue at http://localhost:5555

---

## Next Steps / Future Features

- [ ] React Dashboard (scan history, detailed reports)
- [ ] OpenAI Privacy Policy Analysis
- [ ] Multi-tenant Support (user accounts)
- [ ] Mobile App (React Native)
- [ ] SMS/Email Alerts
- [ ] Competitor domain tracking
- [ ] Advanced NDPA rule builder

---

## Support & Documentation

- **Backend Docs**: [backend/README.md](backend/README.md)
- **Extension Docs**: [extension/README.md](extension/README.md)
- **CLAUDE.md**: [Project Instructions](CLAUDE.md)

---

**You now have a complete, production-ready privacy & compliance platform!**

Start scanning → identify risky websites → protect users in real-time.
