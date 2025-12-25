"""Customer API routes."""

from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.dependencies import Context, can_manage_customers, can_view_invoices
from app.models.audit import AuditAction, AuditLog
from app.models.customer import Customer, CustomerReminderSettings
from app.schemas.customer import (
    CustomerCreate,
    CustomerListResponse,
    CustomerResponse,
    CustomerUpdate,
)


router = APIRouter()


@router.post(
    "/",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(can_manage_customers())],
)
async def create_customer(
    data: CustomerCreate,
    ctx: Context,
):
    """
    Create a new customer.
    """
    # Create customer
    customer = Customer(
        id=str(uuid4()),
        company_id=ctx.company_id,
        **data.model_dump(exclude={"reminder_settings"}),
    )
    ctx.db.add(customer)

    # Create reminder settings if provided
    if data.reminder_settings:
        reminder_settings = CustomerReminderSettings(
            id=str(uuid4()),
            customer_id=customer.id,
            **data.reminder_settings.model_dump(),
        )
        ctx.db.add(reminder_settings)

    # Create audit log
    audit_log = AuditLog(
        id=str(uuid4()),
        company_id=ctx.company_id,
        user_id=ctx.user_id,
        action=AuditAction.CUSTOMER_CREATED,
        entity_type="customer",
        entity_id=customer.id,
        entity_identifier=customer.name,
        new_values={"name": customer.name, "email": customer.email},
        ip_address=ctx.ip_address,
        user_agent=ctx.user_agent,
    )
    ctx.db.add(audit_log)

    await ctx.db.flush()

    # Reload with relationships
    stmt = (
        select(Customer)
        .options(selectinload(Customer.reminder_settings))
        .where(Customer.id == customer.id)
    )
    result = await ctx.db.execute(stmt)
    customer = result.scalar_one()

    return customer


@router.get(
    "/",
    response_model=CustomerListResponse,
    dependencies=[Depends(can_view_invoices())],
)
async def list_customers(
    ctx: Context,
    search: Optional[str] = Query(None, description="Search by name or email"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    List customers with filtering and pagination.
    """
    conditions = [
        Customer.company_id == ctx.company_id,
        Customer.deleted_at.is_(None),
    ]

    if search:
        conditions.append(
            (Customer.name.ilike(f"%{search}%")) | (Customer.email.ilike(f"%{search}%"))
        )
    if is_active is not None:
        conditions.append(Customer.is_active == is_active)

    # Count total
    count_stmt = (
        select(func.count()).select_from(Customer).where(and_(*conditions))
    )
    count_result = await ctx.db.execute(count_stmt)
    total = count_result.scalar()

    # Get paginated results
    stmt = (
        select(Customer)
        .options(selectinload(Customer.reminder_settings))
        .where(and_(*conditions))
        .order_by(Customer.name)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await ctx.db.execute(stmt)
    customers = list(result.scalars().all())

    total_pages = (total + page_size - 1) // page_size

    return CustomerListResponse(
        items=customers,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )


@router.get(
    "/{customer_id}",
    response_model=CustomerResponse,
    dependencies=[Depends(can_view_invoices())],
)
async def get_customer(
    customer_id: str,
    ctx: Context,
):
    """
    Get a specific customer by ID.
    """
    stmt = (
        select(Customer)
        .options(selectinload(Customer.reminder_settings))
        .where(
            Customer.id == customer_id,
            Customer.company_id == ctx.company_id,
            Customer.deleted_at.is_(None),
        )
    )
    result = await ctx.db.execute(stmt)
    customer = result.scalar_one_or_none()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    return customer


@router.put(
    "/{customer_id}",
    response_model=CustomerResponse,
    dependencies=[Depends(can_manage_customers())],
)
async def update_customer(
    customer_id: str,
    data: CustomerUpdate,
    ctx: Context,
):
    """
    Update a customer.
    """
    stmt = (
        select(Customer)
        .options(selectinload(Customer.reminder_settings))
        .where(
            Customer.id == customer_id,
            Customer.company_id == ctx.company_id,
            Customer.deleted_at.is_(None),
        )
    )
    result = await ctx.db.execute(stmt)
    customer = result.scalar_one_or_none()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    # Store old values for audit
    old_values = {
        "name": customer.name,
        "email": customer.email,
        "is_active": customer.is_active,
    }

    # Update fields
    update_data = data.model_dump(exclude_unset=True, exclude={"reminder_settings"})
    for field, value in update_data.items():
        setattr(customer, field, value)

    # Update reminder settings
    if data.reminder_settings:
        if customer.reminder_settings:
            for field, value in data.reminder_settings.model_dump(
                exclude_unset=True
            ).items():
                setattr(customer.reminder_settings, field, value)
        else:
            reminder_settings = CustomerReminderSettings(
                id=str(uuid4()),
                customer_id=customer.id,
                **data.reminder_settings.model_dump(),
            )
            ctx.db.add(reminder_settings)

    # Create audit log
    audit_log = AuditLog(
        id=str(uuid4()),
        company_id=ctx.company_id,
        user_id=ctx.user_id,
        action=AuditAction.CUSTOMER_UPDATED,
        entity_type="customer",
        entity_id=customer.id,
        entity_identifier=customer.name,
        old_values=old_values,
        new_values={
            "name": customer.name,
            "email": customer.email,
            "is_active": customer.is_active,
        },
        ip_address=ctx.ip_address,
        user_agent=ctx.user_agent,
    )
    ctx.db.add(audit_log)

    await ctx.db.flush()
    return customer


@router.delete(
    "/{customer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(can_manage_customers())],
)
async def delete_customer(
    customer_id: str,
    ctx: Context,
):
    """
    Soft delete a customer.
    """
    from datetime import datetime

    stmt = select(Customer).where(
        Customer.id == customer_id,
        Customer.company_id == ctx.company_id,
        Customer.deleted_at.is_(None),
    )
    result = await ctx.db.execute(stmt)
    customer = result.scalar_one_or_none()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    customer.deleted_at = datetime.utcnow()

    # Create audit log
    audit_log = AuditLog(
        id=str(uuid4()),
        company_id=ctx.company_id,
        user_id=ctx.user_id,
        action=AuditAction.CUSTOMER_DELETED,
        entity_type="customer",
        entity_id=customer.id,
        entity_identifier=customer.name,
        ip_address=ctx.ip_address,
        user_agent=ctx.user_agent,
    )
    ctx.db.add(audit_log)

    await ctx.db.flush()
