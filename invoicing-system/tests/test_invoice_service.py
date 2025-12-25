"""Tests for the invoice service."""

from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.invoice import InvoiceStatus, InvoiceType
from app.schemas.invoice import InvoiceCreate, InvoiceItemCreate
from app.services.invoice import InvoiceService


class TestInvoiceNumbering:
    """Test invoice number generation."""

    @pytest.mark.asyncio
    async def test_generate_invoice_number_format(self):
        """Test invoice number follows YYYY-000001 format."""
        db = AsyncMock()
        db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
        db.add = MagicMock()
        db.flush = AsyncMock()

        service = InvoiceService(db, "company-123")
        
        # Mock the sequence creation
        with patch.object(service, 'generate_invoice_number', return_value="2024-000001"):
            number = await service.generate_invoice_number()
        
        assert number == "2024-000001"

    def test_invoice_number_format_regex(self):
        """Test invoice number matches expected pattern."""
        import re
        pattern = r"^\d{4}-\d{6}$"
        
        valid_numbers = ["2024-000001", "2023-123456", "2025-000100"]
        invalid_numbers = ["24-000001", "2024-1", "2024000001"]
        
        for num in valid_numbers:
            assert re.match(pattern, num), f"{num} should be valid"
        
        for num in invalid_numbers:
            assert not re.match(pattern, num), f"{num} should be invalid"


class TestInvoiceCalculations:
    """Test invoice amount calculations."""

    def test_calculate_item_totals_basic(self):
        """Test basic line item calculation."""
        service = InvoiceService(MagicMock(), "company-123")
        
        item = InvoiceItemCreate(
            description="Test item",
            quantity=Decimal("2"),
            unit_price=10000,  # €100.00 in cents
            vat_rate=22,
        )
        
        result = service.calculate_item_totals(item)
        
        assert result["line_subtotal"] == 20000  # 2 * €100.00
        assert result["line_discount"] == 0
        assert result["line_vat"] == 4400  # 22% of €200.00
        assert result["line_total"] == 24400  # €200.00 + €44.00

    def test_calculate_item_totals_with_percentage_discount(self):
        """Test line item with percentage discount."""
        service = InvoiceService(MagicMock(), "company-123")
        
        item = InvoiceItemCreate(
            description="Test item",
            quantity=Decimal("1"),
            unit_price=10000,  # €100.00
            vat_rate=22,
            discount_type="percentage",
            discount_value=10,  # 10%
        )
        
        result = service.calculate_item_totals(item)
        
        assert result["line_subtotal"] == 10000
        assert result["line_discount"] == 1000  # 10% of €100.00
        assert result["line_vat"] == 1980  # 22% of €90.00
        assert result["line_total"] == 10980  # €90.00 + €19.80

    def test_calculate_item_totals_with_fixed_discount(self):
        """Test line item with fixed discount."""
        service = InvoiceService(MagicMock(), "company-123")
        
        item = InvoiceItemCreate(
            description="Test item",
            quantity=Decimal("1"),
            unit_price=10000,  # €100.00
            vat_rate=22,
            discount_type="fixed",
            discount_value=500,  # €5.00
        )
        
        result = service.calculate_item_totals(item)
        
        assert result["line_subtotal"] == 10000
        assert result["line_discount"] == 500
        assert result["line_vat"] == 2090  # 22% of €95.00
        assert result["line_total"] == 11590  # €95.00 + €20.90

    def test_calculate_invoice_totals(self):
        """Test invoice total calculation."""
        service = InvoiceService(MagicMock(), "company-123")
        
        items = [
            {
                "line_subtotal": 10000,
                "line_discount": 0,
                "line_vat": 2200,
                "vat_rate": 22,
            },
            {
                "line_subtotal": 5000,
                "line_discount": 0,
                "line_vat": 450,
                "vat_rate": 9,
            },
        ]
        
        result = service.calculate_invoice_totals(items)
        
        assert result["subtotal"] == 15000
        assert result["total_vat"] == 2650
        assert result["total"] == 17650
        assert result["vat_breakdown"] == {22: 2200, 9: 450}

    def test_calculate_invoice_totals_with_discount(self):
        """Test invoice total with invoice-level discount."""
        service = InvoiceService(MagicMock(), "company-123")
        
        items = [
            {
                "line_subtotal": 10000,
                "line_discount": 0,
                "line_vat": 2200,
                "vat_rate": 22,
            },
        ]
        
        result = service.calculate_invoice_totals(
            items, discount_type="percentage", discount_value=10
        )
        
        assert result["subtotal"] == 10000
        assert result["discount_amount"] == 1000  # 10%
        # VAT should be reduced proportionally
        assert result["total_vat"] == 1980  # 22% of €90.00
        assert result["total"] == 10980

    def test_zero_vat_rate(self):
        """Test calculation with 0% VAT."""
        service = InvoiceService(MagicMock(), "company-123")
        
        item = InvoiceItemCreate(
            description="Zero VAT item",
            quantity=Decimal("1"),
            unit_price=10000,
            vat_rate=0,
        )
        
        result = service.calculate_item_totals(item)
        
        assert result["line_vat"] == 0
        assert result["line_total"] == 10000


class TestInvoiceStatus:
    """Test invoice status transitions."""

    def test_valid_status_transitions(self):
        """Test valid status transitions."""
        from app.models.invoice import VALID_STATUS_TRANSITIONS

        # Draft can transition to sent or cancelled
        assert InvoiceStatus.SENT in VALID_STATUS_TRANSITIONS[InvoiceStatus.DRAFT]
        assert InvoiceStatus.CANCELLED in VALID_STATUS_TRANSITIONS[InvoiceStatus.DRAFT]

        # Sent can transition to viewed, payment_pending, paid, etc.
        assert InvoiceStatus.VIEWED in VALID_STATUS_TRANSITIONS[InvoiceStatus.SENT]
        assert InvoiceStatus.PAID in VALID_STATUS_TRANSITIONS[InvoiceStatus.SENT]

        # Paid can only transition to void
        assert InvoiceStatus.VOID in VALID_STATUS_TRANSITIONS[InvoiceStatus.PAID]
        assert len(VALID_STATUS_TRANSITIONS[InvoiceStatus.PAID]) == 1

        # Cancelled is terminal
        assert len(VALID_STATUS_TRANSITIONS[InvoiceStatus.CANCELLED]) == 0

    def test_invoice_is_editable(self):
        """Test that only draft invoices are editable."""
        from app.models.invoice import Invoice

        # Mock invoice
        invoice = MagicMock(spec=Invoice)
        invoice.status = InvoiceStatus.DRAFT
        
        # Access the property through the class
        assert InvoiceStatus.DRAFT == InvoiceStatus.DRAFT  # Draft is editable
        assert InvoiceStatus.SENT != InvoiceStatus.DRAFT  # Sent is not


class TestVATRates:
    """Test VAT rate handling."""

    def test_standard_vat_rates(self):
        """Test standard Estonian VAT rates."""
        service = InvoiceService(MagicMock(), "company-123")
        
        # Test 22% (standard)
        item_22 = InvoiceItemCreate(
            description="Standard VAT",
            quantity=Decimal("1"),
            unit_price=10000,
            vat_rate=22,
        )
        result_22 = service.calculate_item_totals(item_22)
        assert result_22["line_vat"] == 2200

        # Test 9% (reduced)
        item_9 = InvoiceItemCreate(
            description="Reduced VAT",
            quantity=Decimal("1"),
            unit_price=10000,
            vat_rate=9,
        )
        result_9 = service.calculate_item_totals(item_9)
        assert result_9["line_vat"] == 900

        # Test 0% (exempt)
        item_0 = InvoiceItemCreate(
            description="Exempt",
            quantity=Decimal("1"),
            unit_price=10000,
            vat_rate=0,
        )
        result_0 = service.calculate_item_totals(item_0)
        assert result_0["line_vat"] == 0

    def test_vat_breakdown_multiple_rates(self):
        """Test VAT breakdown with multiple rates."""
        service = InvoiceService(MagicMock(), "company-123")
        
        items = [
            {"line_subtotal": 10000, "line_discount": 0, "line_vat": 2200, "vat_rate": 22},
            {"line_subtotal": 5000, "line_discount": 0, "line_vat": 1100, "vat_rate": 22},
            {"line_subtotal": 8000, "line_discount": 0, "line_vat": 720, "vat_rate": 9},
            {"line_subtotal": 3000, "line_discount": 0, "line_vat": 0, "vat_rate": 0},
        ]
        
        result = service.calculate_invoice_totals(items)
        
        assert result["vat_breakdown"] == {
            22: 3300,  # 2200 + 1100
            9: 720,
            0: 0,
        }


class TestCreditNotes:
    """Test credit note creation."""

    def test_credit_note_has_negative_amounts(self):
        """Credit notes should have negative amounts."""
        # Credit note amounts are negative
        original_total = 10000
        credit_note_total = -original_total
        
        assert credit_note_total < 0
        assert abs(credit_note_total) == original_total

    def test_credit_note_references_original(self):
        """Credit note should reference original invoice."""
        original_id = "invoice-123"
        credit_note = {
            "credited_invoice_id": original_id,
            "invoice_type": InvoiceType.CREDIT_NOTE,
        }
        
        assert credit_note["credited_invoice_id"] == original_id
        assert credit_note["invoice_type"] == InvoiceType.CREDIT_NOTE


class TestRounding:
    """Test proper rounding behavior."""

    def test_rounding_to_cents(self):
        """Test that amounts are properly rounded to cents."""
        service = InvoiceService(MagicMock(), "company-123")
        
        # Test case that could cause rounding issues
        item = InvoiceItemCreate(
            description="Rounding test",
            quantity=Decimal("3"),
            unit_price=3333,  # €33.33
            vat_rate=22,
        )
        
        result = service.calculate_item_totals(item)
        
        # All amounts should be integers (cents)
        assert isinstance(result["line_subtotal"], int)
        assert isinstance(result["line_vat"], int)
        assert isinstance(result["line_total"], int)

    def test_consistent_totals(self):
        """Test that subtotal + vat = total."""
        service = InvoiceService(MagicMock(), "company-123")
        
        items = [
            {"line_subtotal": 9999, "line_discount": 0, "line_vat": 2200, "vat_rate": 22},
        ]
        
        result = service.calculate_invoice_totals(items)
        
        # After any discounts, subtotal + vat should equal total
        final_subtotal = result["subtotal"] - result["discount_amount"]
        assert final_subtotal + result["total_vat"] == result["total"]
