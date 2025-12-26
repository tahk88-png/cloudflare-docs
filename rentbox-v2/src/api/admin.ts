// ============================================================================
// Rentbox v2: Admin API Endpoints
// ============================================================================

import type {
  DiscountCodeCreate,
  DiscountCodeUpdate,
  CampaignCreate,
  CampaignUpdate,
  VoucherCreate,
  VoucherUpdate,
  ApiResponse,
} from '../types';
import { validateCampaignRules } from '../core/campaign-engine';

export interface AdminApiContext {
  db: any;
  adminUserId: string;
  auditLog: {
    log(action: string, entityType: string, entityId: string, changes: any): Promise<void>;
  };
}

/**
 * POST /api/admin/discounts
 * Creates a new discount code
 */
export async function handleCreateDiscount(
  request: Request,
  context: AdminApiContext
): Promise<Response> {
  try {
    const body: DiscountCodeCreate = await request.json();

    // Validate
    if (!body.code || !body.type || body.value === undefined) {
      return jsonResponse(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: code, type, value',
          },
        },
        400
      );
    }

    // Create discount
    const discount = await context.db.createDiscount(body);

    // Audit log
    await context.auditLog.log('discount_create', 'discount_code', discount.id, {
      code: discount.code,
      type: discount.type,
      value: discount.value,
    });

    return jsonResponse({ success: true, data: discount }, 201);
  } catch (error) {
    console.error('Error creating discount:', error);
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred',
        },
      },
      500
    );
  }
}

/**
 * PATCH /api/admin/discounts/:id
 * Updates a discount code
 */
export async function handleUpdateDiscount(
  request: Request,
  context: AdminApiContext
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Discount ID required',
          },
        },
        400
      );
    }

    const body: DiscountCodeUpdate = await request.json();

    // Get existing discount for audit
    const existing = await context.db.getDiscount(id);
    if (!existing) {
      return jsonResponse(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Discount not found',
          },
        },
        404
      );
    }

    // Update
    const updated = await context.db.updateDiscount(id, body);

    // Audit log
    await context.auditLog.log('discount_update', 'discount_code', id, {
      before: existing,
      after: updated,
    });

    return jsonResponse({ success: true, data: updated }, 200);
  } catch (error) {
    console.error('Error updating discount:', error);
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred',
        },
      },
      500
    );
  }
}

/**
 * POST /api/admin/campaigns
 * Creates a new campaign
 */
export async function handleCreateCampaign(
  request: Request,
  context: AdminApiContext
): Promise<Response> {
  try {
    const body: CampaignCreate = await request.json();

    // Validate campaign rules
    const validation = validateCampaignRules(body.rules);
    if (!validation.valid) {
      return jsonResponse(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid campaign rules',
            details: validation.errors,
          },
        },
        400
      );
    }

    // Create campaign
    const campaign = await context.db.createCampaign(body);

    // Audit log
    await context.auditLog.log('campaign_create', 'campaign', campaign.id, {
      name: campaign.name,
      rules: campaign.rules,
    });

    return jsonResponse({ success: true, data: campaign }, 201);
  } catch (error) {
    console.error('Error creating campaign:', error);
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred',
        },
      },
      500
    );
  }
}

/**
 * POST /api/admin/vouchers
 * Creates a voucher manually (for refunds, etc.)
 */
export async function handleCreateVoucher(
  request: Request,
  context: AdminApiContext
): Promise<Response> {
  try {
    const body: VoucherCreate = await request.json();

    if (!body.initial_amount || body.initial_amount <= 0) {
      return jsonResponse(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'initial_amount must be greater than 0',
          },
        },
        400
      );
    }

    // Create voucher
    const voucher = await context.db.createVoucher(body);

    // Audit log
    await context.auditLog.log('voucher_create', 'voucher', voucher.id, {
      code: voucher.code,
      amount: voucher.initial_amount,
      reason: 'manual_creation',
    });

    return jsonResponse({ success: true, data: voucher }, 201);
  } catch (error) {
    console.error('Error creating voucher:', error);
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred',
        },
      },
      500
    );
  }
}

/**
 * PATCH /api/admin/vouchers/:id
 * Updates a voucher (e.g., disable it)
 */
export async function handleUpdateVoucher(
  request: Request,
  context: AdminApiContext
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Voucher ID required',
          },
        },
        400
      );
    }

    const body: VoucherUpdate = await request.json();

    // Get existing voucher for audit
    const existing = await context.db.getVoucher(id);
    if (!existing) {
      return jsonResponse(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Voucher not found',
          },
        },
        404
      );
    }

    // Update
    const updated = await context.db.updateVoucher(id, body);

    // Audit log
    await context.auditLog.log('voucher_update', 'voucher', id, {
      before: existing,
      after: updated,
    });

    return jsonResponse({ success: true, data: updated }, 200);
  } catch (error) {
    console.error('Error updating voucher:', error);
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred',
        },
      },
      500
    );
  }
}

/**
 * POST /api/admin/campaigns/:campaignId/discounts/:discountId
 * Associates a discount with a campaign
 */
export async function handleAssociateDiscountCampaign(
  request: Request,
  context: AdminApiContext
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/');
    const campaignId = parts[parts.length - 3];
    const discountId = parts[parts.length - 1];

    await context.db.associateDiscountCampaign(discountId, campaignId);

    // Audit log
    await context.auditLog.log('campaign_associate', 'discount_code', discountId, {
      campaign_id: campaignId,
    });

    return jsonResponse({ success: true }, 200);
  } catch (error) {
    console.error('Error associating discount with campaign:', error);
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred',
        },
      },
      500
    );
  }
}

function jsonResponse<T>(data: ApiResponse<T>, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
