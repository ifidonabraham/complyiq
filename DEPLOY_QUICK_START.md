# ComplyIQ Deployment: Vercel + Railway Quick Start

## OPTION 1: VERCEL + RAILWAY (⭐ RECOMMENDED - 15 minutes)

### Why this combo?
- Free tier covers both frontend + backend
- Automatic HTTPS
- Auto-scaling
- Zero DevOps required
- Integrated GitHub deployments

### Prerequisites
- GitHub account (free)
- Vercel account (free, link to GitHub)
- Railway account (free, $5 credits/month)

---

## 📋 QUICK START CHECKLIST

### Step 0: Prepare Repository (2 minutes)

```powershell
cd c:\Users\PC\Documents\ComplyIQ
git init
git add .
git commit -m "Initial ComplyIQ - ready for deployment"
git branch -M main
```

### Step 1: Push to GitHub (3 minutes)

1. Go to github.com → Sign in
2. Click **"+"** → New repository
3. Name: `complyiq` → Create repository (private recommended)
4. Follow instructions:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/complyiq.git
   git push -u origin main
   ```

### Step 2: Setup Railway Backend (5 minutes)

1. **Create Railway Account**
   - https://railway.app
   - Click "Start a New Project"
   - Select "GitHub"
   - Authorize railway.app
   - Select your `complyiq` repository
   - Click "Deploy Now"

2. **Configure Project**
   - Wait for build to complete (5-10 min)
   - Select `backend` as root directory
   - Click "Next"

3. **Add Database Services**
   - Click **"+ Add Service"** → PostgreSQL
   - Click **"+ Add Service"** → Redis
   - Wait for both to initialize

4. **Configure Environment Variables**
   - In Railway dashboard:
     - Go to "Variables"
     - Add from `.env.prod`:
       ```
       SECRET_KEY=<generate-random-token>
       JWT_SECRET_KEY=<generate-random-token>
       CORS_ORIGINS=https://your-vercel-domain.vercel.app,chrome-extension://*
       ENVIRONMENT=production
       LOG_LEVEL=INFO
       ```
     - PostgreSQL & Redis URLs auto-populate from plugins

5. **Run Migrations**
   ```bash
   railway run alembic upgrade head
   ```

6. **Get Backend URL**
   - Click on "backend" service
   - Copy public domain
   - Example: `https://complyiq-prod-abcd1234.railway.app`

---

### Step 3: Setup Vercel Frontend (5 minutes)

1. **Create Vercel Account**
   - https://vercel.com
   - Click "Import Project"
   - Select GitHub
   - Select `complyiq` repository

2. **Configure Build Settings**
   - Framework Preset: **Vite**
   - Root Directory: **./frontend**
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Add Environment Variables**
   ```
   VITE_API_URL=https://your-railway-backend-url/api/v1
   ```
   (Replace with URL from Step 2)

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Get Frontend URL
   - Example: `https://complyiq-prod.vercel.app`

5. **Update Backend CORS**
   - Go back to Railway → backend → Variables
   - Update: `CORS_ORIGINS=https://your-vercel-url.vercel.app,chrome-extension://*`

---

### Step 4: Update Chrome Extension (2 minutes)

1. In your repository, edit `extension/src/background.js`:
   ```javascript
   const CONFIG = {
     BACKEND_URL: 'https://your-railway-backend-url',
     CACHE_TTL: 24 * 60 * 60 * 1000,
   }
   ```

2. Commit & push:
   ```bash
   git add extension/src/background.js
   git commit -m "Production backend URL"
   git push
   ```

3. Future: Package extension for Chrome Web Store ($5 one-time fee)

---

## ✅ VERIFICATION CHECKLIST

Test everything works:

- [ ] Frontend loads: https://your-vercel-domain.vercel.app
- [ ] Settings page accessible: Add backend URL + test connection
- [ ] Backend health check: https://your-railway-backend-url/health
- [ ] Scan a test website
- [ ] Check Vercel & Railway dashboards for activity

---

## 💰 PRICING (After Free Tier)

| Service | Free Tier | Paid ($) |
|---------|-----------|----------|
| Vercel Frontend | Unlimited | $20/mo |
| Railway Backend | $5 credits/mo | $10-50/mo |
| PostgreSQL DB | 10GB | included |
| Redis Cache | 30MB | included |
| **Total/Month** | Free | $15-30 |

**Upgrade when:**
- > 100 scans/day → Railway Pro ($12/mo)
- > 1M requests/month → Vercel Pro ($20/mo)

---

## 🚀 AUTOMATED DEPLOYMENTS

After setup, every push to `main` triggers:
1. Tests run automatically
2. Backend built & deployed to Railway
3. Frontend built & deployed to Vercel
4. Production live in 5-10 minutes

Push new code:
```bash
git add .
git commit -m "Feature: add export PDF"
git push origin main
# Watch GitHub Actions → Deployments → Done!
```

---

## 🔒 SECURITY BEST PRACTICES

Before going live:

1. **Secrets Management**
   - Never commit .env files
   - Use Railway/Vercel secrets ✅
   - Rotate JWT keys periodically

2. **SSL/HTTPS**
   - Vercel: Automatic ✅
   - Railway: Automatic ✅
   - Extension: Enforces HTTPS-only ✅

3. **Database Password**
   - Railway: Auto-generated, secure ✅
   - Change it after setup

4. **Rate Limiting**
   - Already configured in backend ✅
   - 10 req/min per API key

---

## 🆘 TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| Frontend won't connect | Update VITE_API_URL with correct Railway URL |
| Railway build fails | Check `backend/requirements.txt` for syntax errors |
| Database migrations fail | Railway PostgreSQL not ready – retry after 1 min |
| CORS errors | Update CORS_ORIGINS in Railway variables |
| SSL certificate errors | Both platforms auto-renew – wait 1 hour |
| Slow scans | Reduce MAX_CONCURRENT_SCANS in environment |

---

## 📊 MONITORING

1. **Vercel Analytics**
   - Dashboard shows frontend metrics
   - Response times, error rates

2. **Railway Logs**
   - Real-time backend logs
   - Deployment status
   - Resource usage

3. **Recommended: Add Sentry**
   ```bash
   pip install sentry-sdk
   # Update backend/.env.prod with SENTRY_DSN
   ```

---

## 🎯 NEXT STEPS

After deployment:

1. **Custom Domain**
   - Vercel: Domains → Add your domain
   - Point DNS to Vercel nameservers

2. **Chrome Web Store**
   - Package extension
   - Publish ($5 one-time)
   - Add production backend URL

3. **Monitor & Scale**
   - Watch logs daily (first week)
   - Scale database when > 10GB used
   - Upgrade to Pro when needed

---

## 👥 NEED HELP?

- Railway support: railway.app/support
- Vercel support: vercel.com/support
- GitHub Discussions: github.com/YOUR_USERNAME/complyiq/discussions

---

**✨ Done! Your ComplyIQ is live in production!**

Share the frontend URL: https://your-vercel-domain.vercel.app
