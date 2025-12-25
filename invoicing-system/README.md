# Production-Grade Invoicing System

A robust, accountant-approved invoicing system built with FastAPI, SQLAlchemy, and PostgreSQL. Designed to handle real-world failures including email bounces, payment retries, multi-tenant isolation, and full audit logging.

## Features

### Core Invoicing
- **Invoice Numbering**: Unique per-company, per-year sequence format `YYYY-000001`
- **Multiple Invoice Types**: Regular invoices, credit notes, and proforma invoices
- **Immutable After Sending**: Once sent, invoices and their PDFs become immutable
- **Credit Notes**: Create credit notes instead of editing sent invoices (accounting compliance)

### PDF Generation
- **Two Modes**: DRAFT (with watermark) and FINAL (without watermark)
- **Immutable Storage**: Final PDFs stored with SHA256 hash for integrity verification
- **Customizable Templates**: Jinja2-based HTML/CSS templates per company
- **WeasyPrint Integration**: High-quality PDF rendering

### Email Delivery
- **Queue System**: Reliable email queue with Celery/Redis
- **Retry Logic**: Configurable retries with exponential backoff
- **Delivery States**: `queued` → `sending` → `sent` → `delivered` or `bounced`/`failed`
- **Proper Headers**: `From: no-reply@domain`, `Reply-To: support@domain`
- **Bounce Handling**: Webhook support for bounce notifications

### Secure Invoice Viewing
- **Time-Limited Tokens**: Secure URLs that expire after configurable hours
- **View Logging**: Records `viewed_at`, `ip_address`, `user_agent` for each view
- **PDF Download Tracking**: Log when customers download PDFs
- **Payment Link Clicks**: Track engagement with payment links

### Payment Integration
- **Stripe Ready**: Full checkout session integration
- **Montonio Ready**: Baltic bank link payments
- **Status Flow**: `sent` → `payment_pending` → `paid`
- **Webhook Processing**: Secure signature verification
- **Partial Payments**: Support for partial payment scenarios
- **Refund Processing**: Full and partial refunds

### Automated Reminders
- **Configurable Schedule**: Per-company and per-customer settings
- **Multiple Reminders**: Default: 7, 14, 30 days after due date
- **Logging**: Each reminder send is logged with timestamp
- **Smart Scheduling**: Skip weekends, respect customer preferences

### Accounting Rules
- **VAT Rates**: Configurable (0%, 9%, 22% for Estonia)
- **Proper Rounding**: Bank-grade rounding to cents (HALF_UP)
- **Amounts in Cents**: All monetary values stored as integers
- **Credit Notes**: No editing after sending - create credit notes instead

### Multi-Tenant & Security
- **Full Isolation**: Each company's data completely isolated
- **RBAC Roles**: `owner`, `admin`, `accountant`, `viewer`
- **Permission System**: Granular permissions per action
- **JWT Authentication**: Secure token-based auth

### Audit Logging
- **Full Trail**: Every action logged with timestamp
- **Who/What/When**: User, action, entity, old/new values
- **Request Context**: IP address, user agent, request ID
- **Immutable Logs**: Append-only audit table

## Project Structure

```
invoicing-system/
├── app/
│   ├── api/                    # API routes
│   │   ├── dependencies.py     # Auth & RBAC dependencies
│   │   └── routes/
│   │       ├── auth.py         # Authentication endpoints
│   │       ├── invoices.py     # Invoice CRUD & actions
│   │       ├── customers.py    # Customer management
│   │       ├── payments.py     # Payment handling
│   │       ├── webhooks.py     # Payment provider webhooks
│   │       └── view.py         # Public invoice viewing
│   ├── core/
│   │   ├── config.py           # Settings from environment
│   │   └── database.py         # Async SQLAlchemy setup
│   ├── models/                 # SQLAlchemy models
│   │   ├── invoice.py          # Invoice & InvoiceItem
│   │   ├── customer.py         # Customer & ReminderSettings
│   │   ├── company.py          # Company & CompanySettings
│   │   ├── user.py             # User with RBAC
│   │   ├── email.py            # EmailLog
│   │   ├── payment.py          # Payment
│   │   ├── token.py            # ViewToken & ViewLog
│   │   ├── audit.py            # AuditLog
│   │   └── template.py         # InvoiceTemplate
│   ├── schemas/                # Pydantic schemas
│   ├── services/               # Business logic
│   │   ├── invoice.py          # Invoice operations
│   │   ├── pdf.py              # PDF generation
│   │   ├── email.py            # Email sending
│   │   ├── payment.py          # Payment processing
│   │   ├── token.py            # View token management
│   │   ├── reminder.py         # Automated reminders
│   │   └── audit.py            # Audit logging
│   ├── tasks/                  # Celery tasks
│   │   ├── celery_app.py       # Celery configuration
│   │   ├── email_tasks.py      # Email queue processing
│   │   ├── reminder_tasks.py   # Reminder processing
│   │   └── invoice_tasks.py    # Invoice maintenance
│   └── main.py                 # FastAPI application
├── migrations/                 # Alembic migrations
├── tests/                      # Test suite
├── requirements.txt
└── README.md
```

## API Endpoints

### Invoices
```
POST   /api/invoices                      # Create invoice
GET    /api/invoices                      # List invoices
GET    /api/invoices/{id}                 # Get invoice
PUT    /api/invoices/{id}                 # Update draft invoice
DELETE /api/invoices/{id}                 # Delete draft invoice
POST   /api/invoices/{id}/generate-pdf    # Generate PDF
POST   /api/invoices/{id}/send-email      # Send invoice email
POST   /api/invoices/{id}/credit-note     # Create credit note
POST   /api/invoices/{id}/void            # Void invoice
POST   /api/invoices/{id}/cancel          # Cancel draft
```

### Payments
```
POST   /api/payments                      # Record manual payment
GET    /api/payments                      # List payments
GET    /api/payments/{id}                 # Get payment
POST   /api/payments/create-link          # Create payment link
POST   /api/payments/{id}/refund          # Process refund
```

### Webhooks
```
POST   /api/webhooks/payments/stripe      # Stripe webhooks
POST   /api/webhooks/payments/montonio    # Montonio webhooks
POST   /api/webhooks/email/bounce         # Email bounce notifications
```

### Public (No Auth)
```
GET    /invoice-view/{token}              # View invoice
GET    /invoice-view/{token}/pdf          # Download PDF
GET    /invoice-view/{token}/pay          # Redirect to payment
```

## Installation

### Prerequisites
- Python 3.11+
- PostgreSQL 14+
- Redis (for Celery)

### Setup

```bash
# Clone and enter directory
cd invoicing-system

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your settings

# Run database migrations
alembic upgrade head

# Start the application
uvicorn app.main:app --reload

# Start Celery worker (separate terminal)
celery -A app.tasks.celery_app worker --loglevel=info

# Start Celery beat for scheduled tasks
celery -A app.tasks.celery_app beat --loglevel=info
```

## Configuration

### Environment Variables

```bash
# Application
APP_NAME="Invoicing System"
DEBUG=false
SECRET_KEY="your-secret-key-min-32-chars"

# Database
DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/invoicing"

# Redis
REDIS_URL="redis://localhost:6379/0"
CELERY_BROKER_URL="redis://localhost:6379/1"

# Email
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your-smtp-user"
SMTP_PASSWORD="your-smtp-password"
EMAIL_FROM_ADDRESS="no-reply@yourdomain.com"
EMAIL_REPLY_TO="support@yourdomain.com"

# PDF Storage
PDF_STORAGE_PATH="./storage/pdfs"
PDF_BASE_URL="https://yourdomain.com/storage/pdfs"

# Invoice View
INVOICE_VIEW_TOKEN_EXPIRE_HOURS=72
INVOICE_VIEW_BASE_URL="https://yourdomain.com/invoice-view"

# Payment Providers
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
MONTONIO_ACCESS_KEY="..."
MONTONIO_SECRET_KEY="..."

# VAT
DEFAULT_VAT_RATE=22
VAT_RATES="0,9,22"

# Reminders
DEFAULT_REMINDER_DAYS="7,14,30"
```

## Data Models

### Invoice
- Unique number per company/year (YYYY-000001)
- Types: `invoice`, `credit_note`, `proforma`
- Status: `draft` → `sent` → `viewed` → `payment_pending` → `paid`
- Amounts stored in cents (integers)
- Customer snapshot for immutability

### Invoice Items
- Description, quantity, unit, unit_price
- VAT rate per item (0%, 9%, 22%)
- Line-level discounts (percentage or fixed)

### Payments
- Providers: `manual`, `stripe`, `montonio`
- Status: `pending` → `completed` or `failed`
- Refund tracking with partial support

### Email Logs
- Full delivery tracking
- Retry count and scheduling
- Bounce/failure details

### Audit Logs
- Immutable, append-only
- Full entity history
- Request context (IP, user agent)

## User Roles & Permissions

| Role | Permissions |
|------|-------------|
| Owner | Full access including company deletion |
| Admin | Full access except company deletion |
| Accountant | Create, edit, send invoices; manage customers |
| Viewer | Read-only access to invoices and audit logs |

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_invoice_service.py -v
```

## Deployment

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install WeasyPrint dependencies
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Checklist

- [ ] Set strong `SECRET_KEY`
- [ ] Configure proper `DATABASE_URL`
- [ ] Set up SMTP credentials
- [ ] Configure Stripe/Montonio webhooks
- [ ] Set up Redis for Celery
- [ ] Configure CORS origins
- [ ] Set up SSL/TLS
- [ ] Configure log aggregation
- [ ] Set up monitoring (health checks)
- [ ] Configure backup strategy

## Architecture Decisions

1. **Amounts in Cents**: All monetary values stored as integers to avoid floating-point precision issues.

2. **Immutable Invoices**: Once sent, invoices cannot be modified. Use credit notes for corrections.

3. **PDF Hash**: SHA256 hash stored with PDF to verify integrity and detect tampering.

4. **Async Database**: Full async support with SQLAlchemy 2.0 for better performance.

5. **Task Queue**: Celery for reliable email delivery and scheduled tasks.

6. **Multi-Tenant**: Row-level isolation with company_id on all tables.

## License

MIT License - see LICENSE file for details.

## Support

For questions or issues, please open a GitHub issue or contact support@yourdomain.com.
