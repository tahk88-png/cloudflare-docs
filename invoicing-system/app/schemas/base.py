"""Base schema classes."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """Base schema with common configuration."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True,
    )


class TimestampSchema(BaseSchema):
    """Schema with timestamp fields."""

    created_at: datetime
    updated_at: datetime


class PaginationParams(BaseModel):
    """Pagination parameters."""

    page: int = 1
    page_size: int = 20
    
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class PaginatedResponse(BaseSchema):
    """Base paginated response."""

    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool


class ErrorResponse(BaseSchema):
    """Error response schema."""

    error: str
    detail: Optional[str] = None
    code: Optional[str] = None


class SuccessResponse(BaseSchema):
    """Success response schema."""

    success: bool = True
    message: Optional[str] = None
