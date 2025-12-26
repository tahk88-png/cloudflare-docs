// ============================================================================
// Rentbox v2: Main API Router (Cloudflare Workers Example)
// ============================================================================

import { handleApplyCode, handleRemoveCode } from './api/checkout';
import {
  handlePurchaseGiftCard,
  handleGetVoucher,
  handleGiftCardPaymentWebhook,
} from './api/gift-cards';
import {
  handleCreateDiscount,
  handleUpdateDiscount,
  handleCreateCampaign,
  handleCreateVoucher,
  handleUpdateVoucher,
  handleAssociateDiscountCampaign,
} from './api/admin';
import {
  handleVoucherLiabilityReport,
  handleVoucherLiabilityExport,
  handleDiscountUsageReport,
} from './api/reports';
import { validateAdminAuth } from './utils/security';

export interface RouterContext {
  db: any;
  payment: any;
  email: any;
  rateLimiter: any;
  userId?: string;
}

/**
 * Main router for Cloudflare Workers or similar serverless environment
 */
export async function handleRequest(
  request: Request,
  context: RouterContext
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // Checkout endpoints (public)
    if (path === '/api/checkout/apply-code' && method === 'POST') {
      return handleApplyCode(request, context);
    }

    if (path === '/api/checkout/remove-code' && method === 'POST') {
      return handleRemoveCode(request, context);
    }

    // Gift card endpoints (public)
    if (path === '/api/gift-cards/purchase' && method === 'POST') {
      return handlePurchaseGiftCard(request, context);
    }

    if (path.startsWith('/api/vouchers/') && method === 'GET') {
      return handleGetVoucher(request, context);
    }

    // Webhooks (public but signed)
    if (path === '/api/webhooks/gift-card-payment-success' && method === 'POST') {
      return handleGiftCardPaymentWebhook(request, context);
    }

    // Admin endpoints (require authentication)
    const adminAuth = await validateAdminAuth(request);
    if (!adminAuth.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: adminAuth.error },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const adminContext = {
      ...context,
      adminUserId: adminAuth.adminUserId!,
      auditLog: {
        async log(action: string, entityType: string, entityId: string, changes: any) {
          // Implement audit logging
          console.log('Audit:', { action, entityType, entityId, changes });
        },
      },
    };

    // Discounts
    if (path === '/api/admin/discounts' && method === 'POST') {
      return handleCreateDiscount(request, adminContext);
    }

    if (path.startsWith('/api/admin/discounts/') && method === 'PATCH') {
      return handleUpdateDiscount(request, adminContext);
    }

    // Campaigns
    if (path === '/api/admin/campaigns' && method === 'POST') {
      return handleCreateCampaign(request, adminContext);
    }

    if (
      path.match(/^\/api\/admin\/campaigns\/[^/]+\/discounts\/[^/]+$/) &&
      method === 'POST'
    ) {
      return handleAssociateDiscountCampaign(request, adminContext);
    }

    // Vouchers
    if (path === '/api/admin/vouchers' && method === 'POST') {
      return handleCreateVoucher(request, adminContext);
    }

    if (path.startsWith('/api/admin/vouchers/') && method === 'PATCH') {
      return handleUpdateVoucher(request, adminContext);
    }

    // Reports
    if (path === '/api/admin/reports/voucher-liability' && method === 'GET') {
      return handleVoucherLiabilityReport(request, context);
    }

    if (path === '/api/admin/reports/voucher-liability/export' && method === 'GET') {
      return handleVoucherLiabilityExport(request, context);
    }

    if (path === '/api/admin/reports/discount-usage' && method === 'GET') {
      return handleDiscountUsageReport(request, context);
    }

    // 404
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Router error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Example Cloudflare Workers export
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Initialize context
    const context: RouterContext = {
      db: new PostgresDatabaseAdapter(env.DB), // Your DB adapter
      payment: new StripeAdapter(env.STRIPE_SECRET_KEY), // Your payment adapter
      email: new EmailAdapter(env.EMAIL_API_KEY), // Your email adapter
      rateLimiter: new InMemoryRateLimiter(10, 60000),
      userId: extractUserId(request), // Your auth logic
    };

    return handleRequest(request, context);
  },
};
