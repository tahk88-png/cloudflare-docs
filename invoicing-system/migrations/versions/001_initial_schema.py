"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    op.execute("CREATE TYPE user_role AS ENUM ('owner', 'admin', 'accountant', 'viewer')")
    op.execute("CREATE TYPE invoice_type AS ENUM ('invoice', 'credit_note', 'proforma')")
    op.execute(
        "CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'viewed', 'payment_pending', "
        "'paid', 'partially_paid', 'overdue', 'cancelled', 'void')"
    )
    op.execute(
        "CREATE TYPE email_status AS ENUM ('queued', 'sending', 'sent', 'delivered', "
        "'opened', 'bounced', 'failed', 'cancelled')"
    )
    op.execute("CREATE TYPE email_type AS ENUM ('invoice', 'reminder', 'receipt', 'credit_note', 'custom')")
    op.execute("CREATE TYPE payment_provider AS ENUM ('manual', 'stripe', 'montonio', 'paypal', 'other')")
    op.execute(
        "CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', "
        "'cancelled', 'refunded', 'partially_refunded', 'disputed')"
    )
    op.execute(
        "CREATE TYPE payment_method AS ENUM ('bank_transfer', 'credit_card', 'debit_card', "
        "'bank_link', 'cash', 'check', 'other')"
    )
    op.execute(
        "CREATE TYPE audit_action AS ENUM ("
        "'invoice.created', 'invoice.updated', 'invoice.deleted', 'invoice.sent', "
        "'invoice.viewed', 'invoice.paid', 'invoice.voided', 'invoice.cancelled', "
        "'invoice.pdf_generated', 'invoice.reminder_sent', "
        "'credit_note.created', 'credit_note.sent', "
        "'payment.received', 'payment.refunded', 'payment.failed', "
        "'customer.created', 'customer.updated', 'customer.deleted', "
        "'user.created', 'user.updated', 'user.deleted', 'user.login', "
        "'user.logout', 'user.password_changed', "
        "'company.updated', 'company.settings_updated', "
        "'email.queued', 'email.sent', 'email.bounced', 'email.failed', "
        "'system.error', 'webhook.received')"
    )

    # Companies table
    op.create_table(
        "companies",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("legal_name", sa.String(255), nullable=True),
        sa.Column("registration_number", sa.String(50), nullable=True),
        sa.Column("vat_number", sa.String(50), nullable=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("website", sa.String(255), nullable=True),
        sa.Column("address_line1", sa.String(255), nullable=True),
        sa.Column("address_line2", sa.String(255), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("state", sa.String(100), nullable=True),
        sa.Column("postal_code", sa.String(20), nullable=True),
        sa.Column("country", sa.String(2), nullable=False, server_default="EE"),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("primary_color", sa.String(7), nullable=True, server_default="#2563eb"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # Company settings table
    op.create_table(
        "company_settings",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("default_currency", sa.String(3), nullable=False, server_default="EUR"),
        sa.Column("default_vat_rate", sa.Integer(), nullable=False, server_default="22"),
        sa.Column("available_vat_rates", postgresql.ARRAY(sa.Integer()), nullable=False, server_default="{0,9,22}"),
        sa.Column("invoice_prefix", sa.String(10), nullable=True),
        sa.Column("invoice_due_days", sa.Integer(), nullable=False, server_default="14"),
        sa.Column("email_from_name", sa.String(100), nullable=True),
        sa.Column("email_reply_to", sa.String(255), nullable=True),
        sa.Column("bank_name", sa.String(100), nullable=True),
        sa.Column("bank_account_number", sa.String(50), nullable=True),
        sa.Column("bank_iban", sa.String(50), nullable=True),
        sa.Column("bank_swift", sa.String(20), nullable=True),
        sa.Column("stripe_enabled", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("stripe_account_id", sa.String(100), nullable=True),
        sa.Column("montonio_enabled", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("montonio_store_uuid", sa.String(100), nullable=True),
        sa.Column("reminders_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("reminder_days", postgresql.ARRAY(sa.Integer()), nullable=False, server_default="{7,14,30}"),
        sa.Column("max_reminders", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("default_template_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("pdf_footer_text", sa.Text(), nullable=True),
        sa.Column("pdf_terms_text", sa.Text(), nullable=True),
        sa.Column("extra_settings", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("company_id"),
    )

    # Users table
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("role", postgresql.ENUM("owner", "admin", "accountant", "viewer", name="user_role", create_type=False), nullable=False, server_default="viewer"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_email_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_company_id", "users", ["company_id"])
    op.create_index("ix_users_email", "users", ["email"])

    # Customers table
    op.create_table(
        "customers",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("legal_name", sa.String(255), nullable=True),
        sa.Column("registration_number", sa.String(50), nullable=True),
        sa.Column("vat_number", sa.String(50), nullable=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("contact_person", sa.String(255), nullable=True),
        sa.Column("address_line1", sa.String(255), nullable=True),
        sa.Column("address_line2", sa.String(255), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("state", sa.String(100), nullable=True),
        sa.Column("postal_code", sa.String(20), nullable=True),
        sa.Column("country", sa.String(2), nullable=False, server_default="EE"),
        sa.Column("default_currency", sa.String(3), nullable=False, server_default="EUR"),
        sa.Column("default_payment_terms_days", sa.Integer(), nullable=False, server_default="14"),
        sa.Column("default_vat_rate", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_customers_company_id", "customers", ["company_id"])

    # Customer reminder settings
    op.create_table(
        "customer_reminder_settings",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("reminders_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("reminder_days", postgresql.ARRAY(sa.Integer()), nullable=True),
        sa.Column("max_reminders", sa.Integer(), nullable=True),
        sa.Column("reminder_email", sa.String(255), nullable=True),
        sa.Column("last_reminder_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_reminders_sent", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("customer_id"),
    )

    # Invoice number sequences
    op.create_table(
        "invoice_number_sequences",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("last_number", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("company_id", "year", name="uq_company_year_sequence"),
    )

    # Invoices table
    op.create_table(
        "invoices",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("invoice_number", sa.String(50), nullable=False),
        sa.Column("invoice_type", postgresql.ENUM("invoice", "credit_note", "proforma", name="invoice_type", create_type=False), nullable=False, server_default="invoice"),
        sa.Column("status", postgresql.ENUM("draft", "sent", "viewed", "payment_pending", "paid", "partially_paid", "overdue", "cancelled", "void", name="invoice_status", create_type=False), nullable=False, server_default="draft"),
        sa.Column("credited_invoice_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("issue_date", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("currency", sa.String(3), nullable=False, server_default="EUR"),
        sa.Column("subtotal", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_vat", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("amount_paid", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("vat_breakdown", postgresql.JSONB(), nullable=True),
        sa.Column("discount_type", sa.String(20), nullable=True),
        sa.Column("discount_value", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("discount_amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("terms", sa.Text(), nullable=True),
        sa.Column("footer", sa.Text(), nullable=True),
        sa.Column("pdf_url", sa.String(500), nullable=True),
        sa.Column("pdf_sha256", sa.String(64), nullable=True),
        sa.Column("pdf_generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_pdf_final", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("payment_link", sa.String(500), nullable=True),
        sa.Column("payment_link_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reminder_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_reminder_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_reminder_date", sa.Date(), nullable=True),
        sa.Column("reminders_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("customer_snapshot", postgresql.JSONB(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("reference", sa.String(100), nullable=True),
        sa.Column("po_number", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["credited_invoice_id"], ["invoices.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("company_id", "invoice_number", name="uq_company_invoice_number"),
    )
    op.create_index("ix_invoices_company_id", "invoices", ["company_id"])
    op.create_index("ix_invoices_customer_id", "invoices", ["customer_id"])
    op.create_index("ix_invoices_invoice_number", "invoices", ["invoice_number"])
    op.create_index("ix_invoices_status", "invoices", ["status"])

    # Invoice items table
    op.create_table(
        "invoice_items",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("quantity", sa.Numeric(10, 4), nullable=False, server_default="1.0000"),
        sa.Column("unit", sa.String(20), nullable=True),
        sa.Column("unit_price", sa.Integer(), nullable=False),
        sa.Column("vat_rate", sa.Integer(), nullable=False, server_default="22"),
        sa.Column("discount_type", sa.String(20), nullable=True),
        sa.Column("discount_value", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("line_subtotal", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("line_discount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("line_vat", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("line_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("product_id", sa.String(100), nullable=True),
        sa.Column("product_code", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_invoice_items_invoice_id", "invoice_items", ["invoice_id"])

    # Invoice templates table
    op.create_table(
        "invoice_templates",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("html_template", sa.Text(), nullable=False),
        sa.Column("css_styles", sa.Text(), nullable=True),
        sa.Column("page_size", sa.String(10), nullable=False, server_default="A4"),
        sa.Column("page_orientation", sa.String(10), nullable=False, server_default="portrait"),
        sa.Column("margin_top", sa.String(20), nullable=False, server_default="20mm"),
        sa.Column("margin_right", sa.String(20), nullable=False, server_default="15mm"),
        sa.Column("margin_bottom", sa.String(20), nullable=False, server_default="20mm"),
        sa.Column("margin_left", sa.String(20), nullable=False, server_default="15mm"),
        sa.Column("header_html", sa.Text(), nullable=True),
        sa.Column("footer_html", sa.Text(), nullable=True),
        sa.Column("primary_color", sa.String(7), nullable=True),
        sa.Column("secondary_color", sa.String(7), nullable=True),
        sa.Column("font_family", sa.String(100), nullable=False, server_default="Arial, sans-serif"),
        sa.Column("settings", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_invoice_templates_company_id", "invoice_templates", ["company_id"])

    # Email logs table
    op.create_table(
        "email_logs",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("email_type", postgresql.ENUM("invoice", "reminder", "receipt", "credit_note", "custom", name="email_type", create_type=False), nullable=False, server_default="invoice"),
        sa.Column("status", postgresql.ENUM("queued", "sending", "sent", "delivered", "opened", "bounced", "failed", "cancelled", name="email_status", create_type=False), nullable=False, server_default="queued"),
        sa.Column("from_email", sa.String(255), nullable=False),
        sa.Column("from_name", sa.String(100), nullable=True),
        sa.Column("reply_to", sa.String(255), nullable=True),
        sa.Column("to_email", sa.String(255), nullable=False),
        sa.Column("to_name", sa.String(255), nullable=True),
        sa.Column("cc", sa.Text(), nullable=True),
        sa.Column("bcc", sa.Text(), nullable=True),
        sa.Column("subject", sa.String(500), nullable=False),
        sa.Column("body_html", sa.Text(), nullable=True),
        sa.Column("body_text", sa.Text(), nullable=True),
        sa.Column("attachments", postgresql.JSONB(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_retries", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("queued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("bounced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("error_details", postgresql.JSONB(), nullable=True),
        sa.Column("external_id", sa.String(255), nullable=True),
        sa.Column("message_id", sa.String(255), nullable=True),
        sa.Column("reminder_number", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_email_logs_company_id", "email_logs", ["company_id"])
    op.create_index("ix_email_logs_invoice_id", "email_logs", ["invoice_id"])
    op.create_index("ix_email_logs_status", "email_logs", ["status"])

    # Invoice view tokens table
    op.create_table(
        "invoice_view_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("token", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_views", sa.Integer(), nullable=True),
        sa.Column("first_viewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_viewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("token"),
    )
    op.create_index("ix_invoice_view_tokens_company_id", "invoice_view_tokens", ["company_id"])
    op.create_index("ix_invoice_view_tokens_invoice_id", "invoice_view_tokens", ["invoice_id"])
    op.create_index("ix_invoice_view_tokens_token", "invoice_view_tokens", ["token"])
    op.create_index("ix_invoice_view_tokens_expires_at", "invoice_view_tokens", ["expires_at"])

    # Token view logs table
    op.create_table(
        "token_view_logs",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("token_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("viewed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("country", sa.String(2), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("device_type", sa.String(50), nullable=True),
        sa.Column("browser", sa.String(50), nullable=True),
        sa.Column("os", sa.String(50), nullable=True),
        sa.Column("downloaded_pdf", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("clicked_payment_link", sa.Boolean(), nullable=False, server_default="false"),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["token_id"], ["invoice_view_tokens.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_token_view_logs_token_id", "token_view_logs", ["token_id"])

    # Payments table
    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("provider", postgresql.ENUM("manual", "stripe", "montonio", "paypal", "other", name="payment_provider", create_type=False), nullable=False, server_default="manual"),
        sa.Column("status", postgresql.ENUM("pending", "processing", "completed", "failed", "cancelled", "refunded", "partially_refunded", "disputed", name="payment_status", create_type=False), nullable=False, server_default="pending"),
        sa.Column("method", postgresql.ENUM("bank_transfer", "credit_card", "debit_card", "bank_link", "cash", "check", "other", name="payment_method", create_type=False), nullable=True),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="EUR"),
        sa.Column("fee", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("refunded_amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("external_id", sa.String(255), nullable=True),
        sa.Column("external_reference", sa.String(255), nullable=True),
        sa.Column("checkout_session_id", sa.String(255), nullable=True),
        sa.Column("payment_url", sa.String(1000), nullable=True),
        sa.Column("payment_url_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("initiated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("failure_code", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("internal_notes", sa.Text(), nullable=True),
        sa.Column("provider_data", postgresql.JSONB(), nullable=True),
        sa.Column("last_webhook_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("webhook_events", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_payments_company_id", "payments", ["company_id"])
    op.create_index("ix_payments_invoice_id", "payments", ["invoice_id"])
    op.create_index("ix_payments_status", "payments", ["status"])
    op.create_index("ix_payments_external_id", "payments", ["external_id"])

    # Audit logs table (append-only)
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("user_email", sa.String(255), nullable=True),
        sa.Column("actor_type", sa.String(50), nullable=False, server_default="user"),
        sa.Column("action", postgresql.ENUM(
            "invoice.created", "invoice.updated", "invoice.deleted", "invoice.sent",
            "invoice.viewed", "invoice.paid", "invoice.voided", "invoice.cancelled",
            "invoice.pdf_generated", "invoice.reminder_sent",
            "credit_note.created", "credit_note.sent",
            "payment.received", "payment.refunded", "payment.failed",
            "customer.created", "customer.updated", "customer.deleted",
            "user.created", "user.updated", "user.deleted", "user.login",
            "user.logout", "user.password_changed",
            "company.updated", "company.settings_updated",
            "email.queued", "email.sent", "email.bounced", "email.failed",
            "system.error", "webhook.received",
            name="audit_action", create_type=False
        ), nullable=False),
        sa.Column("action_description", sa.Text(), nullable=True),
        sa.Column("entity_type", sa.String(50), nullable=True),
        sa.Column("entity_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("entity_identifier", sa.String(100), nullable=True),
        sa.Column("old_values", postgresql.JSONB(), nullable=True),
        sa.Column("new_values", postgresql.JSONB(), nullable=True),
        sa.Column("changes", postgresql.JSONB(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("request_id", sa.String(100), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])
    op.create_index("ix_audit_logs_company_id", "audit_logs", ["company_id"])
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table("audit_logs")
    op.drop_table("payments")
    op.drop_table("token_view_logs")
    op.drop_table("invoice_view_tokens")
    op.drop_table("email_logs")
    op.drop_table("invoice_templates")
    op.drop_table("invoice_items")
    op.drop_table("invoices")
    op.drop_table("invoice_number_sequences")
    op.drop_table("customer_reminder_settings")
    op.drop_table("customers")
    op.drop_table("users")
    op.drop_table("company_settings")
    op.drop_table("companies")

    # Drop enum types
    op.execute("DROP TYPE audit_action")
    op.execute("DROP TYPE payment_method")
    op.execute("DROP TYPE payment_status")
    op.execute("DROP TYPE payment_provider")
    op.execute("DROP TYPE email_type")
    op.execute("DROP TYPE email_status")
    op.execute("DROP TYPE invoice_status")
    op.execute("DROP TYPE invoice_type")
    op.execute("DROP TYPE user_role")
