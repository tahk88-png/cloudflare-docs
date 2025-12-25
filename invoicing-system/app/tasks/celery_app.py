"""Celery application configuration."""

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings


celery_app = Celery(
    "invoicing_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
)

# Configure periodic tasks (Celery Beat)
celery_app.conf.beat_schedule = {
    # Process email queue every minute
    "process-email-queue": {
        "task": "app.tasks.email_tasks.process_email_queue",
        "schedule": 60.0,  # Every minute
    },
    # Process reminders daily at 9 AM UTC
    "process-reminders-daily": {
        "task": "app.tasks.reminder_tasks.process_reminders",
        "schedule": crontab(hour=9, minute=0),
    },
    # Check for overdue invoices daily at midnight UTC
    "check-overdue-invoices": {
        "task": "app.tasks.invoice_tasks.check_overdue_invoices",
        "schedule": crontab(hour=0, minute=0),
    },
}

# Autodiscover tasks
celery_app.autodiscover_tasks(["app.tasks"])
