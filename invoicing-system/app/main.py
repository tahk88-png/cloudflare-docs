"""Main FastAPI application entry point."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api import api_router, public_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup
    # Ensure storage directories exist
    Path(settings.PDF_STORAGE_PATH).mkdir(parents=True, exist_ok=True)

    yield

    # Shutdown
    pass


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="""
        Production-grade invoicing system with:
        - Invoice management with YYYY-000001 numbering per tenant
        - PDF generation with draft/final modes
        - Email delivery with queue and retry support
        - Secure invoice viewing with time-limited tokens
        - Payment integration (Stripe/Montonio ready)
        - Automated payment reminders
        - Proper VAT/accounting rules with credit notes
        - Multi-tenant RBAC and full audit logging
        """,
        openapi_url=f"{settings.API_PREFIX}/openapi.json",
        docs_url=f"{settings.API_PREFIX}/docs",
        redoc_url=f"{settings.API_PREFIX}/redoc",
        lifespan=lifespan,
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if settings.DEBUG else ["https://yourdomain.com"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API routes
    app.include_router(api_router, prefix=settings.API_PREFIX)

    # Include public routes (no auth required)
    app.include_router(public_router)

    # Mount static files for PDF storage
    storage_path = Path(settings.PDF_STORAGE_PATH)
    if storage_path.exists():
        app.mount(
            "/storage/pdfs",
            StaticFiles(directory=str(storage_path)),
            name="pdfs",
        )

    # Global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        if settings.DEBUG:
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal server error",
                    "detail": str(exc),
                    "type": type(exc).__name__,
                },
            )
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"},
        )

    # Health check endpoint
    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
        }

    return app


# Create the application instance
app = create_application()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
