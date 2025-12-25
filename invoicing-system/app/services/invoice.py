"""Invoice service for business logic."""

from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Optional
from uuid import uuid4

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.audit import AuditAction, AuditLog
from app.models.customer import Customer
from app.models.invoice import (
    Invoice,
    InvoiceItem,
    InvoiceNumberSequence,
    InvoiceStatus,
    InvoiceType,
    VALID_STATUS_TRANSITIONS,
)
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceItemCreate,
    InvoiceUpdate,
)


class InvoiceService:
    """Service for managing invoices."""

    def __init__(self, db: AsyncSession, company_id: str, user_id: Optional[str] = None):
        self.db = db
        self.company_id = company_id
        self.user_id = user_id

    async def generate_invoice_number(self, year: Optional[int] = None) -> str:
        """
        Generate next invoice number for the company.
        Format: YYYY-000001 (unique per company per year)
        Uses database-level locking for concurrency safety.
        """
        if year is None:
            year = date.today().year

        # Use SELECT FOR UPDATE to lock the row
        stmt = (
            select(InvoiceNumberSequence)
            .where(
                and_(
                    InvoiceNumberSequence.company_id == self.company_id,
                    InvoiceNumberSequence.year == year,
                )
            )
            .with_for_update()
        )
        result = await self.db.execute(stmt)
        sequence = result.scalar_one_or_none()

        if sequence is None:
            # Create new sequence for this year
            sequence = InvoiceNumberSequence(
                id=str(uuid4()),
                company_id=self.company_id,
                year=year,
                last_number=0,
            )
            self.db.add(sequence)

        # Increment the sequence
        sequence.last_number += 1
        next_number = sequence.last_number

        # Format: YYYY-000001
        invoice_number = f"{year}-{next_number:06d}"

        return invoice_number

    def calculate_item_totals(self, item: InvoiceItemCreate) -> dict:
        """
        Calculate line item totals with proper rounding.
        All amounts are in cents (integers).
        """
        # Base calculation: quantity * unit_price
        quantity = Decimal(str(item.quantity))
        unit_price = Decimal(item.unit_price)
        line_subtotal = (quantity * unit_price).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

        # Apply item discount
        line_discount = 0
        if item.discount_type and item.discount_value > 0:
            if item.discount_type == "percentage":
                line_discount = int(
                    (line_subtotal * Decimal(item.discount_value) / Decimal("100"))
                    .quantize(Decimal("1"), rounding=ROUND_HALF_UP)
                )
            else:  # fixed
                line_discount = item.discount_value

        # Calculate VAT on discounted amount
        taxable_amount = line_subtotal - line_discount
        vat_rate = Decimal(item.vat_rate) / Decimal("100")
        line_vat = int(
            (Decimal(taxable_amount) * vat_rate).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        )

        # Line total
        line_total = int(taxable_amount) + line_vat

        return {
            "line_subtotal": int(line_subtotal),
            "line_discount": line_discount,
            "line_vat": line_vat,
            "line_total": line_total,
        }

    def calculate_invoice_totals(
        self, items: list[dict], discount_type: Optional[str] = None, discount_value: int = 0
    ) -> dict:
        """
        Calculate invoice totals from items with proper VAT breakdown.
        All amounts are in cents.
        """
        subtotal = sum(item["line_subtotal"] - item["line_discount"] for item in items)
        total_item_vat = sum(item["line_vat"] for item in items)

        # Apply invoice-level discount
        discount_amount = 0
        if discount_type and discount_value > 0:
            if discount_type == "percentage":
                discount_amount = int(
                    (Decimal(subtotal) * Decimal(discount_value) / Decimal("100"))
                    .quantize(Decimal("1"), rounding=ROUND_HALF_UP)
                )
            else:  # fixed
                discount_amount = discount_value

        # Recalculate VAT if there's an invoice-level discount
        # (proportionally reduce VAT across all rates)
        if discount_amount > 0 and subtotal > 0:
            discount_ratio = Decimal(discount_amount) / Decimal(subtotal)
            total_vat = int(
                (Decimal(total_item_vat) * (1 - discount_ratio))
                .quantize(Decimal("1"), rounding=ROUND_HALF_UP)
            )
        else:
            total_vat = total_item_vat

        # Build VAT breakdown by rate
        vat_breakdown = {}
        for item in items:
            rate = item.get("vat_rate", 22)
            if rate not in vat_breakdown:
                vat_breakdown[rate] = 0
            vat_breakdown[rate] += item["line_vat"]

        # Adjust VAT breakdown for invoice discount
        if discount_amount > 0 and subtotal > 0:
            for rate in vat_breakdown:
                vat_breakdown[rate] = int(
                    Decimal(vat_breakdown[rate]) * (1 - discount_ratio)
                )

        # Calculate final total
        final_subtotal = subtotal - discount_amount
        total = final_subtotal + total_vat

        return {
            "subtotal": subtotal,
            "discount_amount": discount_amount,
            "total_vat": total_vat,
            "total": total,
            "vat_breakdown": vat_breakdown,
        }

    async def create(self, data: InvoiceCreate) -> Invoice:
        """Create a new invoice."""
        # Generate invoice number
        invoice_number = await self.generate_invoice_number()

        # Get customer for defaults
        customer_stmt = select(Customer).where(
            and_(
                Customer.id == data.customer_id,
                Customer.company_id == self.company_id,
            )
        )
        customer_result = await self.db.execute(customer_stmt)
        customer = customer_result.scalar_one_or_none()
        if not customer:
            raise ValueError("Customer not found")

        # Set default dates
        issue_date = data.issue_date or date.today()
        due_date = data.due_date or (
            issue_date + timedelta(days=customer.default_payment_terms_days)
        )

        # Calculate item totals
        items_data = []
        for i, item in enumerate(data.items):
            item_totals = self.calculate_item_totals(item)
            items_data.append({
                **item.model_dump(),
                **item_totals,
                "vat_rate": item.vat_rate,
                "position": item.position if item.position is not None else i,
            })

        # Calculate invoice totals
        totals = self.calculate_invoice_totals(
            items_data, data.discount_type, data.discount_value
        )

        # Create customer snapshot for immutability
        customer_snapshot = {
            "name": customer.name,
            "legal_name": customer.legal_name,
            "email": customer.email,
            "vat_number": customer.vat_number,
            "registration_number": customer.registration_number,
            "address_line1": customer.address_line1,
            "address_line2": customer.address_line2,
            "city": customer.city,
            "postal_code": customer.postal_code,
            "country": customer.country,
        }

        # Create invoice
        invoice = Invoice(
            id=str(uuid4()),
            company_id=self.company_id,
            customer_id=data.customer_id,
            invoice_number=invoice_number,
            invoice_type=data.invoice_type,
            status=InvoiceStatus.DRAFT,
            issue_date=issue_date,
            due_date=due_date,
            currency=data.currency,
            subtotal=totals["subtotal"],
            total_vat=totals["total_vat"],
            total=totals["total"],
            discount_type=data.discount_type,
            discount_value=data.discount_value,
            discount_amount=totals["discount_amount"],
            vat_breakdown=totals["vat_breakdown"],
            title=data.title,
            notes=data.notes,
            terms=data.terms,
            footer=data.footer,
            reference=data.reference,
            po_number=data.po_number,
            credited_invoice_id=data.credited_invoice_id,
            reminders_enabled=data.reminders_enabled,
            customer_snapshot=customer_snapshot,
            metadata=data.metadata,
        )
        self.db.add(invoice)

        # Create invoice items
        for item_data in items_data:
            item = InvoiceItem(
                id=str(uuid4()),
                invoice_id=invoice.id,
                description=item_data["description"],
                quantity=item_data["quantity"],
                unit=item_data["unit"],
                unit_price=item_data["unit_price"],
                vat_rate=item_data["vat_rate"],
                discount_type=item_data.get("discount_type"),
                discount_value=item_data.get("discount_value", 0),
                line_subtotal=item_data["line_subtotal"],
                line_discount=item_data["line_discount"],
                line_vat=item_data["line_vat"],
                line_total=item_data["line_total"],
                position=item_data["position"],
                product_id=item_data.get("product_id"),
                product_code=item_data.get("product_code"),
            )
            self.db.add(item)

        # Create audit log
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=self.company_id,
            user_id=self.user_id,
            action=AuditAction.INVOICE_CREATED,
            entity_type="invoice",
            entity_id=invoice.id,
            entity_identifier=invoice_number,
            new_values={
                "customer_id": data.customer_id,
                "invoice_type": data.invoice_type.value,
                "total": totals["total"],
                "currency": data.currency,
            },
        )
        self.db.add(audit_log)

        await self.db.flush()
        return invoice

    async def update(self, invoice_id: str, data: InvoiceUpdate) -> Invoice:
        """Update a draft invoice."""
        invoice = await self.get_by_id(invoice_id)
        if not invoice:
            raise ValueError("Invoice not found")

        if not invoice.is_editable:
            raise ValueError("Invoice cannot be edited after sending")

        old_values = {
            "customer_id": invoice.customer_id,
            "issue_date": str(invoice.issue_date),
            "due_date": str(invoice.due_date),
            "total": invoice.total,
        }

        # Update basic fields
        update_fields = data.model_dump(exclude_unset=True, exclude={"items"})
        for field, value in update_fields.items():
            if hasattr(invoice, field):
                setattr(invoice, field, value)

        # Update items if provided
        if data.items is not None:
            # Delete existing items
            for item in invoice.items:
                await self.db.delete(item)

            # Create new items
            items_data = []
            for i, item in enumerate(data.items):
                item_totals = self.calculate_item_totals(item)
                items_data.append({
                    **item.model_dump(),
                    **item_totals,
                    "vat_rate": item.vat_rate,
                    "position": item.position if item.position is not None else i,
                })

            # Recalculate totals
            totals = self.calculate_invoice_totals(
                items_data,
                data.discount_type or invoice.discount_type,
                data.discount_value if data.discount_value is not None else invoice.discount_value,
            )

            invoice.subtotal = totals["subtotal"]
            invoice.total_vat = totals["total_vat"]
            invoice.total = totals["total"]
            invoice.discount_amount = totals["discount_amount"]
            invoice.vat_breakdown = totals["vat_breakdown"]

            # Create new items
            for item_data in items_data:
                item = InvoiceItem(
                    id=str(uuid4()),
                    invoice_id=invoice.id,
                    description=item_data["description"],
                    quantity=item_data["quantity"],
                    unit=item_data["unit"],
                    unit_price=item_data["unit_price"],
                    vat_rate=item_data["vat_rate"],
                    discount_type=item_data.get("discount_type"),
                    discount_value=item_data.get("discount_value", 0),
                    line_subtotal=item_data["line_subtotal"],
                    line_discount=item_data["line_discount"],
                    line_vat=item_data["line_vat"],
                    line_total=item_data["line_total"],
                    position=item_data["position"],
                    product_id=item_data.get("product_id"),
                    product_code=item_data.get("product_code"),
                )
                self.db.add(item)

        # Create audit log
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=self.company_id,
            user_id=self.user_id,
            action=AuditAction.INVOICE_UPDATED,
            entity_type="invoice",
            entity_id=invoice.id,
            entity_identifier=invoice.invoice_number,
            old_values=old_values,
            new_values={
                "customer_id": invoice.customer_id,
                "issue_date": str(invoice.issue_date),
                "due_date": str(invoice.due_date),
                "total": invoice.total,
            },
        )
        self.db.add(audit_log)

        await self.db.flush()
        return invoice

    async def get_by_id(self, invoice_id: str) -> Optional[Invoice]:
        """Get invoice by ID."""
        stmt = (
            select(Invoice)
            .options(selectinload(Invoice.items))
            .where(
                and_(
                    Invoice.id == invoice_id,
                    Invoice.company_id == self.company_id,
                    Invoice.deleted_at.is_(None),
                )
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_number(self, invoice_number: str) -> Optional[Invoice]:
        """Get invoice by number."""
        stmt = (
            select(Invoice)
            .options(selectinload(Invoice.items))
            .where(
                and_(
                    Invoice.invoice_number == invoice_number,
                    Invoice.company_id == self.company_id,
                    Invoice.deleted_at.is_(None),
                )
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        status: Optional[InvoiceStatus] = None,
        customer_id: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Invoice], int]:
        """List invoices with filtering and pagination."""
        conditions = [
            Invoice.company_id == self.company_id,
            Invoice.deleted_at.is_(None),
        ]

        if status:
            conditions.append(Invoice.status == status)
        if customer_id:
            conditions.append(Invoice.customer_id == customer_id)
        if from_date:
            conditions.append(Invoice.issue_date >= from_date)
        if to_date:
            conditions.append(Invoice.issue_date <= to_date)

        # Get total count
        count_stmt = select(func.count()).select_from(Invoice).where(and_(*conditions))
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar()

        # Get paginated results
        stmt = (
            select(Invoice)
            .options(selectinload(Invoice.items))
            .where(and_(*conditions))
            .order_by(Invoice.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        invoices = list(result.scalars().all())

        return invoices, total

    async def transition_status(
        self,
        invoice_id: str,
        new_status: InvoiceStatus,
        metadata: Optional[dict] = None,
    ) -> Invoice:
        """Transition invoice to a new status."""
        invoice = await self.get_by_id(invoice_id)
        if not invoice:
            raise ValueError("Invoice not found")

        if not invoice.can_transition_to(new_status):
            raise ValueError(
                f"Invalid status transition from {invoice.status.value} to {new_status.value}"
            )

        old_status = invoice.status
        invoice.status = new_status

        # Update timestamps based on status
        now = datetime.utcnow()
        if new_status == InvoiceStatus.SENT:
            invoice.sent_at = now
        elif new_status == InvoiceStatus.PAID:
            invoice.paid_at = now

        # Create audit log
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=self.company_id,
            user_id=self.user_id,
            action=self._get_audit_action_for_status(new_status),
            entity_type="invoice",
            entity_id=invoice.id,
            entity_identifier=invoice.invoice_number,
            old_values={"status": old_status.value},
            new_values={"status": new_status.value},
            metadata=metadata,
        )
        self.db.add(audit_log)

        await self.db.flush()
        return invoice

    def _get_audit_action_for_status(self, status: InvoiceStatus) -> AuditAction:
        """Get audit action for status transition."""
        mapping = {
            InvoiceStatus.SENT: AuditAction.INVOICE_SENT,
            InvoiceStatus.VIEWED: AuditAction.INVOICE_VIEWED,
            InvoiceStatus.PAID: AuditAction.INVOICE_PAID,
            InvoiceStatus.VOID: AuditAction.INVOICE_VOIDED,
            InvoiceStatus.CANCELLED: AuditAction.INVOICE_CANCELLED,
        }
        return mapping.get(status, AuditAction.INVOICE_UPDATED)

    async def create_credit_note(
        self, invoice_id: str, reason: Optional[str] = None
    ) -> Invoice:
        """Create a credit note for an invoice."""
        original = await self.get_by_id(invoice_id)
        if not original:
            raise ValueError("Invoice not found")

        if original.status == InvoiceStatus.DRAFT:
            raise ValueError("Cannot create credit note for draft invoice")

        # Generate credit note number
        cn_number = await self.generate_invoice_number()

        # Create credit note with negative amounts
        credit_note = Invoice(
            id=str(uuid4()),
            company_id=self.company_id,
            customer_id=original.customer_id,
            invoice_number=cn_number,
            invoice_type=InvoiceType.CREDIT_NOTE,
            status=InvoiceStatus.DRAFT,
            credited_invoice_id=original.id,
            issue_date=date.today(),
            due_date=date.today(),
            currency=original.currency,
            subtotal=-original.subtotal,
            total_vat=-original.total_vat,
            total=-original.total,
            vat_breakdown={
                k: -v for k, v in (original.vat_breakdown or {}).items()
            },
            notes=reason or f"Credit note for invoice {original.invoice_number}",
            customer_snapshot=original.customer_snapshot,
        )
        self.db.add(credit_note)

        # Copy items with negative amounts
        for item in original.items:
            cn_item = InvoiceItem(
                id=str(uuid4()),
                invoice_id=credit_note.id,
                description=item.description,
                quantity=item.quantity,
                unit=item.unit,
                unit_price=-item.unit_price,
                vat_rate=item.vat_rate,
                line_subtotal=-item.line_subtotal,
                line_discount=-item.line_discount,
                line_vat=-item.line_vat,
                line_total=-item.line_total,
                position=item.position,
            )
            self.db.add(cn_item)

        # Create audit log
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=self.company_id,
            user_id=self.user_id,
            action=AuditAction.CREDIT_NOTE_CREATED,
            entity_type="invoice",
            entity_id=credit_note.id,
            entity_identifier=cn_number,
            metadata={
                "original_invoice_id": original.id,
                "original_invoice_number": original.invoice_number,
                "reason": reason,
            },
        )
        self.db.add(audit_log)

        await self.db.flush()
        return credit_note

    async def soft_delete(self, invoice_id: str) -> bool:
        """Soft delete an invoice (draft only)."""
        invoice = await self.get_by_id(invoice_id)
        if not invoice:
            raise ValueError("Invoice not found")

        if not invoice.is_editable:
            raise ValueError("Only draft invoices can be deleted")

        invoice.deleted_at = datetime.utcnow()

        # Create audit log
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=self.company_id,
            user_id=self.user_id,
            action=AuditAction.INVOICE_DELETED,
            entity_type="invoice",
            entity_id=invoice.id,
            entity_identifier=invoice.invoice_number,
        )
        self.db.add(audit_log)

        await self.db.flush()
        return True
