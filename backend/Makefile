.PHONY: help install dev test migrations docker-build docker-up docker-down clean lint

help:
	@echo "ComplyIQ Backend - Development Commands"
	@echo ""
	@echo "install         - Install dependencies"
	@echo "dev             - Start development server with auto-reload"
	@echo "worker          - Start Celery worker"
	@echo "migrations      - Run database migrations"
	@echo "test            - Run tests"
	@echo "docker-build    - Build Docker image"
	@echo "docker-up       - Start full stack with docker-compose"
	@echo "docker-down     - Stop docker-compose stack"
	@echo "lint            - Run linting checks"
	@echo "clean           - Clean cache and builds"

install:
	pip install -r requirements.txt
	playwright install chromium

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

worker:
	celery -A app.tasks worker --loglevel=info --concurrency=4

migrations:
	alembic upgrade head

test:
	pytest -v --cov=app

docker-build:
	docker build -t complyiq-backend:latest -f Dockerfile .

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

lint:
	black --check app
	flake8 app
	mypy app

clean:
	find . -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache/ .coverage htmlcov/ dist/ build/ *.egg-info/
