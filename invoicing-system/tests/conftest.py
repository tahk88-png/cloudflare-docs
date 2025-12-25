"""Test configuration and fixtures."""

import asyncio
from typing import AsyncGenerator, Generator
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.database import Base, get_db
from app.main import app


# Use SQLite for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async_session_factory = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with async_session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client."""
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
def company_id() -> str:
    """Generate a test company ID."""
    return str(uuid4())


@pytest.fixture
def user_id() -> str:
    """Generate a test user ID."""
    return str(uuid4())


@pytest.fixture
def customer_id() -> str:
    """Generate a test customer ID."""
    return str(uuid4())


@pytest.fixture
def sample_invoice_data(customer_id: str) -> dict:
    """Create sample invoice data."""
    return {
        "customer_id": customer_id,
        "invoice_type": "invoice",
        "currency": "EUR",
        "items": [
            {
                "description": "Consulting services",
                "quantity": "10",
                "unit": "hours",
                "unit_price": 15000,  # €150.00
                "vat_rate": 22,
            },
            {
                "description": "Travel expenses",
                "quantity": "1",
                "unit": "trip",
                "unit_price": 5000,  # €50.00
                "vat_rate": 22,
            },
        ],
        "notes": "Thank you for your business!",
    }


@pytest.fixture
def sample_company_data() -> dict:
    """Create sample company data."""
    return {
        "name": "Test Company OÜ",
        "legal_name": "Test Company OÜ",
        "registration_number": "12345678",
        "vat_number": "EE123456789",
        "email": "test@example.com",
        "phone": "+372 5555 5555",
        "address_line1": "Test Street 123",
        "city": "Tallinn",
        "postal_code": "10111",
        "country": "EE",
    }


@pytest.fixture
def sample_customer_data(company_id: str) -> dict:
    """Create sample customer data."""
    return {
        "name": "Client Company AS",
        "email": "client@example.com",
        "phone": "+372 5555 1234",
        "address_line1": "Client Street 456",
        "city": "Tartu",
        "postal_code": "50001",
        "country": "EE",
        "default_payment_terms_days": 14,
    }


@pytest.fixture
def auth_headers() -> dict:
    """Create authentication headers for testing."""
    # In real tests, generate a valid JWT token
    return {
        "Authorization": "Bearer test-token",
    }
