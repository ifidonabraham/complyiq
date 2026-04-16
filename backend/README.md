# ===========================
# ComplyIQ Backend Project README
# ===========================

## Architecture Overview

This is the FastAPI backend for ComplyIQ - a privacy & compliance intelligence platform for Nigeria.

## Folder Structure

```
backend/
├── app/                           # Main application package
│   ├── core/                      # Configuration, security, constants
│   ├── models/                    # SQLAlchemy ORM models
│   ├── schemas/                   # Pydantic request/response models
│   ├── services/                  # Business logic layers
│   │   ├── website_scanner.py     # MODULE 1: Technical security assessment
│   │   └── data_collection_analyzer.py  # MODULE 2: Privacy/compliance assessment
│   ├── api/                       # FastAPI route handlers
│   ├── tasks/                     # Celery async tasks
│   ├── db/                        # Database connection management
│   └── main.py                    # FastAPI application factory
├── alembic/                       # Database migrations
├── requirements.txt               # Python dependencies
├── docker-compose.yml             # Full stack (FastAPI, PostgreSQL, Redis, Celery)
├── Dockerfile                     # Backend container image
├── .env.example                   # Environment template
├── .env                           # Environment variables (local dev)
└── README.md                      # This file
```

## Quick Start

### Option 1: Docker Compose (Recommended for development)

```bash
# Navigate to project root
cd /path/to/ComplyIQ

# Start entire stack
docker-compose up -d

# Run database migrations
docker-compose exec backend alembic upgrade head

# Check health
curl http://localhost:8000/health

# View API docs
http://localhost:8000/docs
```

Services will be available at:
- **FastAPI Backend**: http://localhost:8000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **Celery Flower (task monitoring)**: http://localhost:5555

### Option 2: Local development (manual)

```bash
# Create Python 3.12 virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Set up .env file
cp .env.example .env
# Edit .env with your local database/Redis connection strings

# Run database migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# In another terminal, start Celery worker
celery -A app.tasks worker --loglevel=info
```

## Core Modules

### Module 1: Website Scanner (website_scanner.py)
Performs technical security assessment:
- HTTPS/SSL certificate validation
- DNS records analysis
- Security headers check (CSP, X-Frame-Options, etc)
- Third-party script detection
- Phishing risk assessment
- Generates **Trust Score** (0-100)

**Trust Score Breakdown:**
- HTTPS Grade: 30%
- DNS Configuration: 20%
- Security Headers: 25%
- Tracker Count: 15%
- Phishing Risk: 10%

### Module 2: Data Collection Analyzer (data_collection_analyzer.py)
Performs privacy & compliance assessment:
- Privacy policy detection and quality rating
- Consent/cookie banner detection
- Sensitive field inventory (BVN, NIN, email, phone, card)
- NDPA compliance indicators
- Third-party data processor identification
- Generates **Compliance Score** (0-100)

**Compliance Score Breakdown:**
- Privacy Policy: 30%
- Consent Banner: 20%
- NDPA Indicators: 25%
- Sensitive Field Protection: 15%
- Data Processor Disclosure: 10%

### Combined Score: ComplyIQ Rating
```
ComplyIQ Rating = (Trust Score × 0.5) + (Compliance Score × 0.5)
Range: 0-100
```

## API Endpoints

### Scanning

**POST /api/v1/scans/check** - Initiate website scan
```bash
curl -X POST "http://localhost:8000/api/v1/scans/check?api_key=your-key" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**GET /api/v1/scans/{scan_id}** - Get scan results
```bash
curl http://localhost:8000/api/v1/scans/42
```

**GET /api/v1/scans** - List recent scans
```bash
curl "http://localhost:8000/api/v1/scans?limit=10&offset=0"
```

**GET /api/v1/scans/domain/{domain}** - Get scan history for domain
```bash
curl http://localhost:8000/api/v1/scans/domain/example.com
```

### Health & Status

**GET /health** - System health check
```bash
curl http://localhost:8000/health
```

**GET /** - API root
```bash
curl http://localhost:8000/
```

## Database Schema

### Core Tables
- **users**: User accounts, subscription tiers, API quotas
- **api_keys**: API keys for programmatic access
- **scan_results**: Website scan results (main table)
- **audit_logs**: Audit trail for compliance monitoring

All tables are versioned via Alembic migrations in `alembic/versions/`.

## Task Processing (Celery)

Scans are processed asynchronously:

1. Client calls `POST /api/v1/scans/check`
2. FastAPI creates ScanResult record (status: "pending")
3. Returns immediately with scan ID
4. Celery worker picks up `scan_website_task` from queue
5. Worker runs both Module 1 + Module 2 concurrently
6. Results stored in database
7. Client polls `GET /api/v1/scans/{scan_id}` until completed

**Monitoring Tasks**: http://localhost:5555 (Flower UI)

## Configuration

All configuration via environment variables (see `.env.example`):
- API settings (debug, CORS, logging)
- Database (PostgreSQL connection)
- Cache/Task broker (Redis)
- Security (JWT secret, algorithm)
- Scanning (timeouts, policies)
- NDPA rules (Nigerian-specific checks)

## Logging

Structured JSON logging via `structlog`:
```json
{
  "event": "scan_completed",
  "scan_id": 42,
  "domain": "example.com",
  "rating": 78.5,
  "timestamp": "2026-04-16T10:30:45Z"
}
```

View logs:
```bash
docker-compose logs -f backend
```

## Security

- ✅ Password hashing: bcrypt (Argon2 optional)
- ✅ JWT tokens with short expiry (15 min access, 7 day refresh)
- ✅ API key validation & rate limiting
- ✅ CORS protection
- ✅ HTTPS enforcement (production)
- ✅ Audit logging for all major operations

## Performance Considerations

- **Caching**: Redis (24h TTL for scan results) prevents duplicate scans
- **Rate Limiting**: 10 scans/minute per API key, 100/day free tier
- **Async Processing**: Celery handles long-running scans without blocking API
- **Database Indexes**: Critical queries optimized for scan history lookups
- **Connection Pooling**: SQLAlchemy manages PostgreSQL connections efficiently

## Future Roadmap

### Phase 2 (Post-MVP):
- [ ] Extension UI (Chrome Manifest V3)
- [ ] Frontend dashboard (React + TypeScript)
- [ ] AI-powered privacy policy analysis (OpenAI integration)
- [ ] Browser extension with real-time form field warnings
- [ ] Multi-tenant support
- [ ] Advanced analytics dashboard
- [ ] SMS/Email alerts
- [ ] Compliance reporting

### Phase 3:
- [ ] Mobile app (React Native)
- [ ] API marketplace for third-party integrations
- [ ] Custom NDPA rule builder
- [ ] Competitor domain tracking
- [ ] Enterprise SLA & support

## Testing

```bash
# Run tests
pytest

# With coverage
pytest --cov=app
```

## Production Deployment

1. **Build Docker image**: `docker build -t complyiq-backend:latest ./backend`
2. **Push to registry**: `docker push your-registry/complyiq-backend:latest`
3. **Deploy to Kubernetes/ECS/etc**
4. **Run migrations**: `alembic upgrade head`
5. **Scale workers**: `kubectl scale deployment celery-worker --replicas=3`

## Contributing

1. Branch from `main`
2. Follow existing code style (Black formatting, type hints everywhere)
3. Write tests for new modules
4. Document API endpoints
5. Submit PR for review

## License

Proprietary - ComplyIQ Platform
