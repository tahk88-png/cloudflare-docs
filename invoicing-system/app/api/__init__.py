"""API module initialization."""

from fastapi import APIRouter

from app.api.routes import invoices, auth, customers, payments, webhooks, view

api_router = APIRouter()

# Include all route modules
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])

# Public routes (no auth required)
public_router = APIRouter()
public_router.include_router(view.router, tags=["Public"])
