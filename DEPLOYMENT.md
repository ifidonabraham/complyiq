# ComplyIQ Production Deployment Guide

## RECOMMENDED OPTION: Vercel + Railway ⚡ (15 minutes, Free Tier)

**Why this combo?**
- ✅ Vercel: Free frontend hosting (optimized for React/Next.js)
- ✅ Railway: Free PostgreSQL + Redis + FastAPI deployment
- ✅ Zero DevOps knowledge required
- ✅ Automatic deployments on git push
- ✅ HTTPS + custom domain included

---

## 🚀 DEPLOYMENT OPTION 1: VERCEL + RAILWAY (Recommended)

### **Part A: Prepare Repository**

1. **Initialize Git (if not already)**
   ```bash
   cd c:\Users\PC\Documents\ComplyIQ
   git init
   git add .
   git commit -m "Initial ComplyIQ deployment"
   ```

2. **Create GitHub Repository**
   - Go to github.com/new
   - Create private repo: `complyiq`
   - Push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/complyiq.git
   git branch -M main
   git push -u origin main
   ```

3. **Create `.github/workflows/deploy.yml` for auto-deployment**
   ```yaml
   name: Deploy
   on:
     push:
       branches: [main]
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: 18
         - run: cd frontend && npm install --legacy-peer-deps && npm run build
   ```

---

### **Part B: Deploy Backend on Railway**

1. **Sign up:** railway.app (free tier: $5/month credits)

2. **Create Backend App**
   - Dashboard → New Project
   - Select "Deploy from GitHub"
   - Select your `complyiq` repo
   - Select `backend` as root directory
   - Wait for build (5-10 minutes)

3. **Add Services (Database + Cache)**
   - Click "+" → PostgreSQL (free tier: 10GB)
   - Click "+" → Redis (free tier: 30MB)
   - Click "+" → MongoDB (optional, for audit logs)

4. **Configure Environment**
   ```
   DATABASE_URL=postgresql://postgres:PASSWORD@postgres-host:5432/complyiq_db
   REDIS_URL=redis://:PASSWORD@redis-host:6379/0
   SECRET_KEY=generate-random-32-chars-token
   CORS_ORIGINS=https://your-domain.vercel.app,chrome-extension://*
   ENVIRONMENT=production
   LOG_LEVEL=INFO
   ```
   - Railway auto-generates DATABASE_URL from PostgreSQL plugin
   - Copy Railway-provided URLs to Project Variables

5. **Deploy Migrations**
   ```bash
   railway run alembic upgrade head
   ```

6. **Get Backend URL**
   - Railway generates: `https://complyiq-backend-production.up.railway.app`
   - Copy this URL

---

### **Part C: Deploy Frontend on Vercel**

1. **Sign up:** vercel.com (free tier included)

2. **Deploy Frontend**
   - Dashboard → New Project
   - Import GitHub repo `complyiq`
   - Framework preset: Vite
   - Root directory: `./frontend`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Click "Deploy"

3. **Add Environment Variables**
   ```
   VITE_API_URL=https://complyiq-backend-production.up.railway.app/api/v1
   ```

4. **Add Custom Domain (Optional)**
   - Domain Settings → Add domain
   - Point DNS to Vercel nameservers

5. **Get Frontend URL**
   - Vercel generates: `https://complyiq-production.vercel.app`

---

### **Part D: Update Chrome Extension for Production**

In `extension/src/background.js`, update:
```javascript
const CONFIG = {
  BACKEND_URL: 'https://complyiq-backend-production.up.railway.app',
  CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
}
```

Then zip and upload to Chrome Web Store (paid $5 one-time developer fee)

---

## 🚀 DEPLOYMENT OPTION 2: DigitalOcean App Platform (30 min, $12/month)

**Why?** All-in-one platform, better performance than Railway free tier, includes backups

### **Step 1: Create DigitalOcean Account**
- Sign up: digitalocean.com
- Add billing method

### **Step 2: Deploy Entire Stack**
```bash
# Option A: Use DigitalOcean CLI
doctl auth init  # Login
doctl apps create --spec=app.yaml  # Deploy from config
```

### **Step 3: Create `app.yaml` Configuration**
```yaml
name: complyiq
services:
  - name: backend
    github:
      branch: main
      repo: YOUR_USERNAME/complyiq
    build_command: pip install -r requirements.txt
    run_command: uvicorn app.main:app --host 0.0.0.0 --port 8080
    http_port: 8080
    source_dir: backend/
    envs:
      - key: DATABASE_URL
        value: ${db.username}:${db.password}@${db.host}:${db.port}/${db.name}?sslmode=require
      
  - name: frontend
    github:
      branch: main
      repo: YOUR_USERNAME/complyiq
    build_command: npm install --legacy-peer-deps && npm run build
    source_dir: frontend/
    http_port: 3000
    envs:
      - key: VITE_API_URL
        value: https://${backend.ondigitalocean.app}/api/v1

databases:
  - engine: PG
    name: complyiq_db
    version: "14"
  - engine: REDIS
    name: complyiq_redis
```

### **Step 4: Deploy**
```bash
doctl apps create --spec=app.yaml
```

---

## 🚀 DEPLOYMENT OPTION 3: Self-Hosted Docker (VPS + Docker Swarm)

**Best for:** Full control, custom domain, sensitive data

### **Prerequisites**
- VPS: AWS EC2 ($5/month), Linode ($5/month), Hetzner ($3/month)
- SSH access to server
- Docker + Docker Compose installed

### **Step 1: Setup VPS**

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-Linux-x86_64 -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

### **Step 2: Clone Repository**

```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/complyiq.git
cd complyiq
```

### **Step 3: Create Production `.env.prod`**

```env
# Database (External managed service - RDS/Managed Database)
DATABASE_URL=postgresql://user:password@prod-db-host:5432/complyiq_prod

# Redis (External managed service)
REDIS_URL=redis://:password@prod-redis-host:6379/0

# Security
SECRET_KEY=generate-random-64-char-token-for-production
JWT_SECRET_KEY=another-random-64-char-token

# API Configuration
API_TITLE=ComplyIQ
CORS_ORIGINS=https://your-domain.com,https://app.your-domain.com,chrome-extension://*

# OpenAI (if enabled)
OPENAI_API_KEY=sk-prod-key

# Environment
ENVIRONMENT=production
LOG_LEVEL=WARNING
DEBUG=false

# Rate Limiting
RATE_LIMIT_REQUESTS=20
RATE_LIMIT_PERIOD=60
```

### **Step 4: Update docker-compose for Production**

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    image: complyiq-backend:latest
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - SECRET_KEY=${SECRET_KEY}
      - ENVIRONMENT=production
    restart: always
    deploy:
      replicas: 3  # 3 instances for load balancing
      update_config:
        parallelism: 1
        delay: 10s

  celery_worker:
    image: complyiq-backend:latest
    command: celery -A app.tasks.celery_app worker --loglevel=warning --concurrency=8
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    restart: always
    deploy:
      replicas: 2

  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl  # SSL certificates
    depends_on:
      - backend
    restart: always
```

### **Step 5: Setup Nginx Reverse Proxy**

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
        server backend:8000;
        server backend:8000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### **Step 6: Deploy with SSL (Let's Encrypt)**

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Generate certificate
certbot certonly --standalone -d your-domain.com

# Copy certificates
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/key.pem

# Start stack
docker-compose -f docker-compose.prod.yml up -d
```

### **Step 7: Setup Auto-Renewal**

```bash
# Cron job to renew SSL automatically
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl restart nginx") | crontab -
```

---

## 📊 DEPLOYMENT COMPARISON

| Feature | Vercel + Railway | DigitalOcean App | Self-Hosted VPS |
|---------|-----------------|------------------|-----------------|
| **Cost** | Free-tier (limited) | $12/month | $3-20/month |
| **Setup Time** | 10 minutes | 20 minutes | 60 minutes |
| **Scalability** | Auto-scaling | Auto-scaling | Manual scaling |
| **Backups** | Basic | Automatic | Manual/Custom |
| **Performance** | Excellent | Very Good | Good-Excellent |
| **Control** | Low | Medium | High |
| **Support** | Community | 24/7 Support | Self-support |
| **DevOps Needed** | None | Minimal | Moderate |

**Recommendation:** Start with **Vercel + Railway** for MVP, upgrade to **DigitalOcean** for production

---

## 🔒 SECURITY CHECKLIST

Before going live, verify:

### **Backend Security**
- [ ] Change all default passwords
- [ ] Enable HTTPS/SSL
- [ ] Setup rate limiting (10 req/min)
- [ ] Enable CORS for specific domains only (not *)
- [ ] Use environment variables for secrets (never hardcode)
- [ ] Enable JWT expiration (15 min access, 7 day refresh)
- [ ] Setup audit logging
- [ ] Enable request logging/monitoring
- [ ] Use managed database (RDS/DigitalOcean Database) not self-hosted
- [ ] Enable database backups (automated daily)
- [ ] Setup Redis password + SSL encryption
- [ ] Configure firewall rules (allow only necessary ports)

### **Frontend Security**
- [ ] Never store passwords in localStorage (API keys only)
- [ ] Use httpOnly cookies for session tokens
- [ ] Enable CORS strictly (whitelist domains)
- [ ] Implement CSP (Content Security Policy) headers
- [ ] Add X-Frame-Options header
- [ ] Setup analytics (Vercel Analytics by default)

### **Extension Security**
- [ ] Remove hardcoded backend URL (use content script injection)
- [ ] Sign extension with private key before publishing to Chrome Store
- [ ] Add privacy policy
- [ ] Request minimum permissions

---

## 📈 MONITORING & ALERTING

### **Production Monitoring Stack**

1. **Application Monitoring**
   ```bash
   # Add to backend requirements.txt
   sentry-sdk==1.39.0
   python-json-logger==2.0.7
   ```

2. **Setup Sentry (Error Tracking)**
   ```python
   # In app/main.py
   import sentry_sdk
   sentry_sdk.init(dsn="https://your-sentry-dsn@sentry.io/...")
   ```

3. **Database Monitoring**
   - Enable PostgreSQL slow query logs
   - Setup pg_stat_statements
   - Monitor connection pool usage

4. **Alerts**
   - High error rate (>1%)
   - Database connection failures
   - Redis cache misses
   - API response time > 2 seconds
   - CPU/Memory > 80%

---

## 🚀 CI/CD PIPELINE

### **Automated Testing Before Deploy**

Create `.github/workflows/test.yml`:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - run: pip install -r backend/requirements.txt
      - run: cd backend && pytest tests/
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd frontend && npm install --legacy-peer-deps && npm run build
```

---

## 📋 POST-DEPLOYMENT CHECKLIST

After deploying:

- [ ] Test all API endpoints from production URL
- [ ] Verify database backups are working
- [ ] Test scan functionality end-to-end
- [ ] Verify extension connects to production backend
- [ ] Check frontend loads without errors
- [ ] Verify HTTPS certificates (no warnings)
- [ ] Test rate limiting (should reject >10 req/min)
- [ ] Monitor logs for errors (first 24 hours)
- [ ] Setup uptime monitoring (UptimeRobot, Pingdom)
- [ ] Document deployment (passwords, URLs, access)
- [ ] Schedule backup verification (weekly)
- [ ] Setup on-call alerting

---

## 🔧 TROUBLESHOOTING

### **Deployment Issues**

**Issue:** `DATABASE_URL` not connecting
- **Solution:** Verify database is accessible (check firewall rules, IP whitelisting)
- **Solution:** Check connection pooling settings

**Issue:** CORS errors from frontend
- **Solution:** Update CORS_ORIGINS in backend `.env.prod`
- **Solution:** Include `chrome-extension://*` for extension

**Issue:** High memory usage
- **Solution:** Increase Celery worker timeouts
- **Solution:** Reduce concurrent scans limit

**Issue:** SSL certificate errors**
- **Solution:** Verify certificate paths in Nginx config
- **Solution:** Check certificate expiration date
- **Solution:** Regenerate with `certbot renew`

---

## 📞 SUPPORT

**Choose your deployment option and respond with:**
- `vercel` — Step-by-step Vercel + Railway setup
- `digitalocean` — Setup DigitalOcean App Platform
- `vps` — VPS deployment with Nginx + SSL
- `k8s` — Kubernetes deployment guide (advanced)

---

**Recommended:** Start with **Vercel + Railway** (free tier), scale to **DigitalOcean** later
