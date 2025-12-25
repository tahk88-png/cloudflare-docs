"""Audit service for logging and querying audit trails."""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditAction, AuditLog


class AuditService:
    """Service for managing audit logs."""

    def __init__(
        self,
        db: AsyncSession,
        company_id: str,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
    ):
        self.db = db
        self.company_id = company_id
        self.user_id = user_id
        self.user_email = user_email

    async def log(
        self,
        action: AuditAction,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        entity_identifier: Optional[str] = None,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        changes: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
        action_description: Optional[str] = None,
        metadata: Optional[dict] = None,
        actor_type: str = "user",
    ) -> AuditLog:
        """
        Create an audit log entry.
        
        This is the primary method for recording audit events.
        """
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=self.company_id,
            user_id=self.user_id,
            user_email=self.user_email,
            actor_type=actor_type,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_identifier=entity_identifier,
            old_values=old_values,
            new_values=new_values,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
            action_description=action_description,
            metadata=metadata,
        )
        self.db.add(audit_log)
        await self.db.flush()
        return audit_log

    async def log_entity_change(
        self,
        action: AuditAction,
        entity_type: str,
        entity_id: str,
        entity_identifier: str,
        old_entity: Optional[dict] = None,
        new_entity: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """
        Log an entity change with automatic diff calculation.
        """
        changes = None
        if old_entity and new_entity:
            changes = self._calculate_changes(old_entity, new_entity)

        return await self.log(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_identifier=entity_identifier,
            old_values=old_entity,
            new_values=new_entity,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    def _calculate_changes(
        self, old_values: dict, new_values: dict
    ) -> dict:
        """Calculate the differences between two entity states."""
        changes = {}
        all_keys = set(old_values.keys()) | set(new_values.keys())

        for key in all_keys:
            old_val = old_values.get(key)
            new_val = new_values.get(key)
            if old_val != new_val:
                changes[key] = {
                    "old": old_val,
                    "new": new_val,
                }

        return changes if changes else None

    async def get_entity_history(
        self,
        entity_type: str,
        entity_id: str,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[AuditLog], int]:
        """
        Get the audit history for a specific entity.
        """
        conditions = [
            AuditLog.company_id == self.company_id,
            AuditLog.entity_type == entity_type,
            AuditLog.entity_id == entity_id,
        ]

        # Get total count
        count_stmt = (
            select(func.count())
            .select_from(AuditLog)
            .where(and_(*conditions))
        )
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar()

        # Get paginated results
        stmt = (
            select(AuditLog)
            .where(and_(*conditions))
            .order_by(AuditLog.timestamp.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        logs = list(result.scalars().all())

        return logs, total

    async def get_user_activity(
        self,
        user_id: str,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[AuditLog], int]:
        """
        Get all audit logs for a specific user.
        """
        conditions = [
            AuditLog.company_id == self.company_id,
            AuditLog.user_id == user_id,
        ]

        if from_date:
            conditions.append(AuditLog.timestamp >= from_date)
        if to_date:
            conditions.append(AuditLog.timestamp <= to_date)

        # Get total count
        count_stmt = (
            select(func.count())
            .select_from(AuditLog)
            .where(and_(*conditions))
        )
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar()

        # Get paginated results
        stmt = (
            select(AuditLog)
            .where(and_(*conditions))
            .order_by(AuditLog.timestamp.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        logs = list(result.scalars().all())

        return logs, total

    async def get_by_action(
        self,
        action: AuditAction,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[AuditLog], int]:
        """
        Get all audit logs for a specific action type.
        """
        conditions = [
            AuditLog.company_id == self.company_id,
            AuditLog.action == action,
        ]

        if from_date:
            conditions.append(AuditLog.timestamp >= from_date)
        if to_date:
            conditions.append(AuditLog.timestamp <= to_date)

        # Get total count
        count_stmt = (
            select(func.count())
            .select_from(AuditLog)
            .where(and_(*conditions))
        )
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar()

        # Get paginated results
        stmt = (
            select(AuditLog)
            .where(and_(*conditions))
            .order_by(AuditLog.timestamp.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        logs = list(result.scalars().all())

        return logs, total

    async def search(
        self,
        entity_type: Optional[str] = None,
        entity_identifier: Optional[str] = None,
        action: Optional[AuditAction] = None,
        user_id: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        ip_address: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[AuditLog], int]:
        """
        Search audit logs with multiple filters.
        """
        conditions = [AuditLog.company_id == self.company_id]

        if entity_type:
            conditions.append(AuditLog.entity_type == entity_type)
        if entity_identifier:
            conditions.append(
                AuditLog.entity_identifier.ilike(f"%{entity_identifier}%")
            )
        if action:
            conditions.append(AuditLog.action == action)
        if user_id:
            conditions.append(AuditLog.user_id == user_id)
        if from_date:
            conditions.append(AuditLog.timestamp >= from_date)
        if to_date:
            conditions.append(AuditLog.timestamp <= to_date)
        if ip_address:
            conditions.append(AuditLog.ip_address == ip_address)

        # Get total count
        count_stmt = (
            select(func.count())
            .select_from(AuditLog)
            .where(and_(*conditions))
        )
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar()

        # Get paginated results
        stmt = (
            select(AuditLog)
            .where(and_(*conditions))
            .order_by(AuditLog.timestamp.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        logs = list(result.scalars().all())

        return logs, total

    async def get_invoice_audit_trail(
        self, invoice_id: str
    ) -> list[AuditLog]:
        """
        Get complete audit trail for an invoice.
        
        Includes all related events (emails, payments, etc.)
        """
        # Get direct invoice events
        conditions = [
            AuditLog.company_id == self.company_id,
            AuditLog.entity_type == "invoice",
            AuditLog.entity_id == invoice_id,
        ]

        stmt = (
            select(AuditLog)
            .where(and_(*conditions))
            .order_by(AuditLog.timestamp.asc())
        )
        result = await self.db.execute(stmt)
        logs = list(result.scalars().all())

        # Also get related email and payment events
        related_stmt = (
            select(AuditLog)
            .where(
                and_(
                    AuditLog.company_id == self.company_id,
                    AuditLog.entity_type.in_(["email", "payment"]),
                    AuditLog.metadata["invoice_id"].astext == invoice_id,
                )
            )
            .order_by(AuditLog.timestamp.asc())
        )
        related_result = await self.db.execute(related_stmt)
        related_logs = list(related_result.scalars().all())

        # Combine and sort
        all_logs = logs + related_logs
        all_logs.sort(key=lambda x: x.timestamp)

        return all_logs
