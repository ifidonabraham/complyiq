# app/tasks/__init__.py
from app.tasks.celery_app import celery_app, scan_website_task

__all__ = ["celery_app", "scan_website_task"]
