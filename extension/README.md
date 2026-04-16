# ComplyIQ Browser Extension

**Production-ready Chrome Extension (Manifest V3)** that delivers real-time user protection by monitoring sensitive form fields and warning users about risky websites.

## Features

✅ **Real-time Sensitive Field Detection**
- Detects BVN (Bank Verification Number) fields
- Detects NIN (National ID Number) fields
- Detects email, phone, card number, and password inputs
- Works on dynamically loaded pages (React SPAs, Vue, etc.)

✅ **Website Risk Intelligence**
- Displays ComplyIQ Rating (0-100) in popup badge
- Shows Trust Score (technical security: HTTPS, headers, trackers)
- Shows Compliance Score (privacy: policy, consent, NDPA indicators)
- Caches results for 24h to prevent duplicate scans

✅ **Interactive Warnings**
- Inline warning badges for sensitive fields
- Risk banners when entering data on unsafe sites
- Form submission confirmation for critical-risk domains
- Glowing neon indicators (cyber-tech theme)

✅ **Smart Trigger Logic**
- Only warns when user actually focuses/types in sensitive fields
- Debounced to prevent false positives
- Respects user preferences (can disable specific warnings)

✅ **Secure Configuration**
- API key stored in Chrome's encrypted storage (`chrome.storage.sync`)
- Never logs BVN/NIN/card data
- Backend communication always over HTTPS
- No cross-site request forgery (proper message passing)

## Architecture

```
┌─────────────────────────────────────────────┐
│ Website Page (DOM)                          │
│                                             │
│  ┌ Input: BVN field                        │
│  │ ↓ (Content Script detects)              │
│  ├─ Highlight field (neon violet border)   │
│  ├─ Show inline warning               
│  └─ Listen for focus/input events         │
│                                             │
│     ↕ (Message Passing)                    │
│                                             │
├─────────────────────────────────────────────┤
│ Background Service Worker                   │
│                                             │
│  ├─ Receive "SCAN_DOMAIN" message          │
│  ├─ Check cache (Redis-like via localStorage)
│  ├─ Call backend POST /api/v1/scans/check  │
│  ├─ Poll for results GET /api/v1/scans/{id}
│  ├─ Cache result in chrome.storage.local   │
│  └─ Send result back to content script     │
│                                             │
├─────────────────────────────────────────────┤
│ Popup UI                                    │
│                                             │
│  ├─ Receive cached result                  │
│  ├─ Display rating badge (80/100 = blue)   │
│  ├─ Show quick stats (Trust/Compliance)    │
│  ├─ List key findings                      │
│  └─ CTA buttons (Full Report, Rescan)      │
│                                             │
├─────────────────────────────────────────────┤
│ Options Page (Settings)                     │
│                                             │
│  ├─ Input API key (stored in storage.sync)
│  ├─ Set backend URL (advanced)              │
│  ├─ Configure notification preferences      │
│  ├─ Test backend connection                 │
│  └─ Clear cache                             │
└─────────────────────────────────────────────┘
```

## File Structure

```
extension/
├── manifest.json              # Manifest V3 configuration
├── package.json              # NPM dependencies (optional build tools)
│
├── src/
│   ├── background.js         # Service Worker - API calls, caching, orchestration
│   ├── content.js            # Content Script - DOM monitoring, field detection
│   └── pages/
│       ├── popup.html        # Popup badge UI
│       └── options.html      # Settings page
│
├── public/
│   ├── popup.js              # Popup logic & rendering
│   ├── popup.css             # Popup styling (dark cyber-tech)
│   ├── options.js            # Options page logic
│   └── options.css           # Options page styling
│       
└── README.md                 # This file
```

## Installation (Development)

### Prerequisites
- Chrome browser (v88+)
- ComplyIQ backend running (http://localhost:8000)

### Steps

1. **Clone repository**
   ```bash
   cd /path/to/ComplyIQ
   ```

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `extension` folder
   - Extension should appear in your toolbar

3. **Configure API Key**
   - Click ComplyIQ icon in toolbar
   - If first time, should show "Configuration Required"
   - Click "Open Settings"
   - Enter your API key (get from backend or use test key)
   - Click "Test Connection" to verify
   - Click "Save Settings"

4. **Test It**
   - Visit any website (e.g., https://www.google.com)
   - Click ComplyIQ icon to see rating badge
   - Look for the popup with:
     - ComplyIQ Rating (0-100)
     - Trust & Compliance scores
     - Key findings
   - Fill out a form with sensitive fields
     - Should show inline warnings
     - Should highlight fields with neon violet border

## API Integration

### Backend Endpoints Used

**1. POST /api/v1/scans/check** - Initiate scan
```javascript
// Request
{
  "url": "https://www.google.com"
}

// Response
{
  "id": 42,
  "domain": "google.com",
  "url": "https://www.google.com",
  "scan_status": "pending",
  "created_at": "2026-04-16T10:30:00Z"
}
```

**2. GET /api/v1/scans/{scan_id}** - Poll for results
```javascript
// Response (completed)
{
  "id": 42,
  "complyiq_rating": 82.5,
  "trust_score": 85.0,
  "compliance_score": 80.0,
  "https_grade": "A",
  "privacy_policy_found": true,
  "consent_banner_found": true,
  "scan_status": "completed",
  "created_at": "2026-04-16T10:30:00Z",
  "completed_at": "2026-04-16T10:31:15Z",
  ...
}
```

**3. GET /health** - Health check (test connection)
```javascript
// Response
{
  "status": "ok",
  "version": "1.0.0",
  "database": "connected",
  "redis": "connected"
}
```

## Chrome Storage API Usage

### `chrome.storage.sync` (Encrypted by Chrome)
```javascript
// Store API key (syncs across Chrome devices if signed in)
chrome.storage.sync.set({ complyiq_api_key: "sk_live_..." });

// Retrieve
chrome.storage.sync.get("complyiq_api_key", (result) => {
  console.log(result.complyiq_api_key);
});
```

### `chrome.storage.local` (Local device only)
```javascript
// Cache scan results
chrome.storage.local.set({
  cache_example.com: {
    result: { /* full scan result */ },
    timestamp: Date.now()
  }
});

// Retrieve
chrome.storage.local.get("cache_example.com", (result) => {
  console.log(result.cache_example.com);
});
```

## Messaging & Inter-Process Communication

### Content Script → Background Worker
```javascript
chrome.runtime.sendMessage(
  {
    type: "SCAN_DOMAIN",
    domain: "example.com",
    url: "https://example.com"
  },
  (response) => {
    console.log(response.data); // Scan result
  }
);
```

### Popup → Background Worker
```javascript
chrome.runtime.sendMessage(
  { type: "SCAN_DOMAIN", domain: currentDomain, url: currentTab.url },
  (response) => {
    handleScanResult(response.data);
  }
);
```

## Sensitive Field Detection Logic

### Field Matching (via Selectors + Patterns)

**BVN Fields:**
- Selector: `input[name*='bvn' i]`
- Pattern: `/\b\d{11}\b/` (11-digit number)

**NIN Fields:**
- Selector: `input[name*='nin' i]`
- Pattern: `/\b\d{11}\b/` (11-digit number)

**Email Fields:**
- Selector: `input[type='email']`, `input[name*='email' i]`
- Pattern: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

**Phone Fields (Nigerian):**
- Selector: `input[type='tel']`, `input[name*='phone' i]`
- Pattern: `/(\+?234|0)[789]\d{9}/`

**Card Fields:**
- Selector: `input[name*='card' i]`, `input[placeholder*='credit' i]`
- Pattern: `/\b\d{13,19}\b/` (PAN)

**Password Fields:**
- Selector: `input[type='password']`
- Always treated as sensitive

### Field Monitoring Flow

1. **Content script loads** → Scan DOM for sensitive field selectors
2. **Field found** → Add neon violet border + glow
3. **User focuses field** → Show inline warning badge
4. **User types data** → Check against patterns
5. **Real data detected** → Request domain risk score from background
6. **Low rating (<60)** → Show risk warning banner
7. **User submits form** → If critical risk (<40), ask confirmation

## Manifest V3 Migration Notes

This extension uses Manifest V3 (Chrome's latest security standard):

**Key Differences from Manifest V2:**
- ✅ Service Workers (not background pages)
- ✅ No content script direct API access (use message passing)
- ✅ Host permissions must be declared
- ✅ Web accessible resources require explicit declaration
- ✅ No eval() or inline scripts (security)

**Permissions Declared:**
- `storage`: Read/write Chrome storage
- `scripting`: Run content scripts
- `activeTab`: Access current tab
- `tabs`: Query tab information
- `webRequest`: Monitor network (deprecated, using fetch instead)

## Content Security Policy (CSP)

The extension follows Chrome's CSP guidelines:
- No inline scripts (all JS in external files)
- No `eval()` or `Function()`
- No `object-src` except `'self'`
- All resources must be from extension package

## Performance Optimizations

1. **Caching**: 24-hour TTL for scan results (prevents duplicate API calls)
2. **Debouncing**: Field detection debounced (don't scan on every keystroke)
3. **Lazy Loading**: Only inject content script where needed
4. **Message Batching**: Group multiple messages when possible
5. **Minimal Popup**: Fetch from cache (no re-scanning)

## Security Considerations

1. **API Key Storage**
   - Stored in `chrome.storage.sync` (Chrome encrypts)
   - Never exposed in logs or network requests
   - Only transmitted to ComplyIQ backend over HTTPS

2. **Content Injection**
   - Inline styles used (not scripts) for field highlighting
   - All DOM manipulation via standard APIs
   - No XSS vectors (no unsanitized user input)

3. **Message Passing**
   - Only responds to messages from known sources
   - Validates message types before processing
   - Never transmits sensitive data (BVN/NIN) to backend

4. **Network Communication**
   - Only connects to configured backend URL
   - Uses X-API-Key header (not URL parameter)
   - Validates SSL/TLS certificates

## Testing

### Manual Testing Checklist

- [ ] Install extension in Chrome
- [ ] Configure API key in options
- [ ] Visit https://www.google.com
  - [ ] Popup shows rating badge
  - [ ] Trust score visible
  - [ ] Compliance score visible
- [ ] Fill out email field
  - [ ] Field highlighted with neon violet
  - [ ] Inline warning shows
- [ ] Fill out phone field
  - [ ] Same indicators appear
- [ ] Visit low-risk site, enter data
  - [ ] No risk warnings appear
- [ ] Test on high-risk domain (use fake unsafe domain)
  - [ ] Risk banner should appear
- [ ] Test form submission
  - [ ] Confirmation dialog on critical risk
- [ ] Clear cache from options
  - [ ] Verify localStorage cleared
- [ ] Test connection from options
  - [ ] Should show "Connection successful" for valid key

## Known Limitations

1. **Manifest V3 Restrictions**
   - Service workers suspend after 5 minutes inactivity
   - Content scripts can't directly call backend
   - No unlimited persistent background execution

2. **Field Detection**
   - Regex patterns may have false positives/negatives
   - SPAs that create fields dynamically require MutationObserver
   - Some highly customized forms may not be detected

3. **Privacy Policy Parsing**
   - Backend-side via OpenAI (not in extension)
   - May miss policies that are non-standard markup

## Future Enhancements

- [ ] Sync scan history across devices
- [ ] Offline mode (cache recent scans)
- [ ] Custom field patterns per user
- [ ] Real-time form phishing detection
- [ ] SMS/Email alerts for critical sites
- [ ] Competitor domain tracking
- [ ] Extended data processor mapping

## Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit PR for review

## Support

- **Issues**: GitHub Issues
- **Documentation**: https://complyiq.io/docs
- **Email**: support@complyiq.io

## License

Proprietary - ComplyIQ Platform
