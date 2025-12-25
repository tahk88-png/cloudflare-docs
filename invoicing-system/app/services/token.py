"""Token service for secure invoice viewing."""

import secrets
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.audit import AuditAction, AuditLog
from app.models.invoice import Invoice, InvoiceStatus
from app.models.token import InvoiceViewToken, TokenViewLog


class TokenService:
    """Service for managing invoice view tokens."""

    def __init__(self, db: AsyncSession, company_id: Optional[str] = None):
        self.db = db
        self.company_id = company_id

    async def create_view_token(
        self,
        invoice_id: str,
        expires_in_hours: int = None,
        max_views: Optional[int] = None,
    ) -> InvoiceViewToken:
        """
        Create a time-limited token for viewing an invoice.
        
        Args:
            invoice_id: The invoice ID
            expires_in_hours: Token validity in hours (default from settings)
            max_views: Maximum number of views allowed (None = unlimited)
        
        Returns:
            InvoiceViewToken with the generated token
        """
        if expires_in_hours is None:
            expires_in_hours = settings.INVOICE_VIEW_TOKEN_EXPIRE_HOURS

        # Get invoice to verify it exists and get company_id
        stmt = select(Invoice).where(Invoice.id == invoice_id)
        result = await self.db.execute(stmt)
        invoice = result.scalar_one_or_none()

        if not invoice:
            raise ValueError("Invoice not found")

        # Generate secure token
        token = secrets.token_urlsafe(32)

        # Calculate expiration
        expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)

        # Create token record
        view_token = InvoiceViewToken(
            id=str(uuid4()),
            company_id=invoice.company_id,
            invoice_id=invoice_id,
            token=token,
            expires_at=expires_at,
            max_views=max_views,
        )
        self.db.add(view_token)

        await self.db.flush()
        return view_token

    async def get_by_token(self, token: str) -> Optional[InvoiceViewToken]:
        """Get view token by token string."""
        stmt = (
            select(InvoiceViewToken)
            .options(selectinload(InvoiceViewToken.invoice))
            .where(InvoiceViewToken.token == token)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def validate_and_log_view(
        self,
        token: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> tuple[InvoiceViewToken, Invoice]:
        """
        Validate token and log the view.
        
        Returns tuple of (token, invoice) if valid.
        Raises ValueError if invalid.
        """
        view_token = await self.get_by_token(token)

        if not view_token:
            raise ValueError("Invalid token")

        if not view_token.is_valid:
            if view_token.is_expired:
                raise ValueError("Token has expired")
            if not view_token.is_active:
                raise ValueError("Token has been deactivated")
            if view_token.max_views and view_token.view_count >= view_token.max_views:
                raise ValueError("Maximum views exceeded")
            raise ValueError("Token is invalid")

        # Get invoice
        stmt = (
            select(Invoice)
            .options(selectinload(Invoice.items))
            .where(Invoice.id == view_token.invoice_id)
        )
        result = await self.db.execute(stmt)
        invoice = result.scalar_one_or_none()

        if not invoice:
            raise ValueError("Invoice not found")

        # Log the view
        now = datetime.utcnow()

        view_log = TokenViewLog(
            id=str(uuid4()),
            token_id=view_token.id,
            viewed_at=now,
            ip_address=ip_address,
            user_agent=user_agent,
            device_type=self._parse_device_type(user_agent),
            browser=self._parse_browser(user_agent),
            os=self._parse_os(user_agent),
        )
        self.db.add(view_log)

        # Update token stats
        view_token.view_count += 1
        if view_token.first_viewed_at is None:
            view_token.first_viewed_at = now
        view_token.last_viewed_at = now

        # Update invoice status to viewed if it was just sent
        if invoice.status == InvoiceStatus.SENT:
            invoice.status = InvoiceStatus.VIEWED

        # Create audit log
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=invoice.company_id,
            action=AuditAction.INVOICE_VIEWED,
            entity_type="invoice",
            entity_id=invoice.id,
            entity_identifier=invoice.invoice_number,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                "token_id": view_token.id,
                "view_count": view_token.view_count,
            },
        )
        self.db.add(audit_log)

        await self.db.flush()
        return view_token, invoice

    async def log_pdf_download(
        self,
        token: str,
        ip_address: Optional[str] = None,
    ) -> None:
        """Log that the PDF was downloaded via a view token."""
        view_token = await self.get_by_token(token)
        if not view_token:
            return

        # Find the most recent view log and update it
        stmt = (
            select(TokenViewLog)
            .where(TokenViewLog.token_id == view_token.id)
            .order_by(TokenViewLog.viewed_at.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        view_log = result.scalar_one_or_none()

        if view_log:
            view_log.downloaded_pdf = True

        await self.db.flush()

    async def log_payment_link_click(
        self,
        token: str,
        ip_address: Optional[str] = None,
    ) -> None:
        """Log that the payment link was clicked via a view token."""
        view_token = await self.get_by_token(token)
        if not view_token:
            return

        # Find the most recent view log and update it
        stmt = (
            select(TokenViewLog)
            .where(TokenViewLog.token_id == view_token.id)
            .order_by(TokenViewLog.viewed_at.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        view_log = result.scalar_one_or_none()

        if view_log:
            view_log.clicked_payment_link = True

        await self.db.flush()

    async def deactivate_token(self, token_id: str) -> None:
        """Deactivate a view token."""
        stmt = select(InvoiceViewToken).where(InvoiceViewToken.id == token_id)
        result = await self.db.execute(stmt)
        view_token = result.scalar_one_or_none()

        if view_token:
            view_token.is_active = False
            await self.db.flush()

    async def deactivate_all_tokens(self, invoice_id: str) -> int:
        """Deactivate all tokens for an invoice."""
        stmt = select(InvoiceViewToken).where(
            and_(
                InvoiceViewToken.invoice_id == invoice_id,
                InvoiceViewToken.is_active == True,
            )
        )
        result = await self.db.execute(stmt)
        tokens = result.scalars().all()

        count = 0
        for token in tokens:
            token.is_active = False
            count += 1

        await self.db.flush()
        return count

    async def get_view_logs(
        self,
        invoice_id: str,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[TokenViewLog], int]:
        """Get all view logs for an invoice."""
        # Get token IDs for this invoice
        token_stmt = select(InvoiceViewToken.id).where(
            InvoiceViewToken.invoice_id == invoice_id
        )
        token_result = await self.db.execute(token_stmt)
        token_ids = [t for t in token_result.scalars().all()]

        if not token_ids:
            return [], 0

        # Count total
        from sqlalchemy import func

        count_stmt = (
            select(func.count())
            .select_from(TokenViewLog)
            .where(TokenViewLog.token_id.in_(token_ids))
        )
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar()

        # Get paginated results
        stmt = (
            select(TokenViewLog)
            .where(TokenViewLog.token_id.in_(token_ids))
            .order_by(TokenViewLog.viewed_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        logs = list(result.scalars().all())

        return logs, total

    def get_view_url(self, token: str) -> str:
        """Get the full URL for viewing an invoice."""
        return f"{settings.INVOICE_VIEW_BASE_URL}/{token}"

    def _parse_device_type(self, user_agent: Optional[str]) -> Optional[str]:
        """Parse device type from user agent."""
        if not user_agent:
            return None

        ua_lower = user_agent.lower()
        if "mobile" in ua_lower or "android" in ua_lower:
            if "tablet" in ua_lower or "ipad" in ua_lower:
                return "tablet"
            return "mobile"
        return "desktop"

    def _parse_browser(self, user_agent: Optional[str]) -> Optional[str]:
        """Parse browser from user agent."""
        if not user_agent:
            return None

        ua_lower = user_agent.lower()
        if "chrome" in ua_lower and "edg" not in ua_lower:
            return "Chrome"
        elif "firefox" in ua_lower:
            return "Firefox"
        elif "safari" in ua_lower and "chrome" not in ua_lower:
            return "Safari"
        elif "edg" in ua_lower:
            return "Edge"
        elif "msie" in ua_lower or "trident" in ua_lower:
            return "Internet Explorer"
        return "Other"

    def _parse_os(self, user_agent: Optional[str]) -> Optional[str]:
        """Parse OS from user agent."""
        if not user_agent:
            return None

        ua_lower = user_agent.lower()
        if "windows" in ua_lower:
            return "Windows"
        elif "mac os" in ua_lower or "macos" in ua_lower:
            return "macOS"
        elif "linux" in ua_lower:
            return "Linux"
        elif "android" in ua_lower:
            return "Android"
        elif "iphone" in ua_lower or "ipad" in ua_lower:
            return "iOS"
        return "Other"
