// ============================================================================
// Rentbox v2: Reports API Endpoints
// ============================================================================

import type {
  ApiResponse,
  VoucherLiabilityReport,
  DiscountUsageReport,
} from '../types';
import {
  generateVoucherLiabilityReport,
  generateDiscountUsageReport,
  exportVoucherLiabilityCSV,
} from '../core/accounting';

export interface ReportsApiContext {
  db: any; // AccountingDatabaseAdapter
}

/**
 * GET /api/admin/reports/voucher-liability
 * Gets voucher liability report for accounting
 */
export async function handleVoucherLiabilityReport(
  request: Request,
  context: ReportsApiContext
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const includeBreakdown = url.searchParams.get('breakdown') !== 'false';

    const report = await generateVoucherLiabilityReport(context.db, includeBreakdown);

    return jsonResponse({ success: true, data: report }, 200);
  } catch (error) {
    console.error('Error generating voucher liability report:', error);
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
 * GET /api/admin/reports/voucher-liability/export
 * Exports voucher liability as CSV
 */
export async function handleVoucherLiabilityExport(
  request: Request,
  context: ReportsApiContext
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('start_date')
      ? new Date(url.searchParams.get('start_date')!)
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // Default: 1 year ago
    const endDate = url.searchParams.get('end_date')
      ? new Date(url.searchParams.get('end_date')!)
      : new Date();

    const csv = await exportVoucherLiabilityCSV(context.db, startDate, endDate);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="voucher-liability-${startDate.toISOString()}-${endDate.toISOString()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting voucher liability:', error);
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
 * GET /api/admin/reports/discount-usage
 * Gets discount usage report
 */
export async function handleDiscountUsageReport(
  request: Request,
  context: ReportsApiContext
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const campaignId = url.searchParams.get('campaign_id') || undefined;
    const discountCodeId = url.searchParams.get('discount_code_id') || undefined;
    const startDate = url.searchParams.get('start_date')
      ? new Date(url.searchParams.get('start_date')!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
    const endDate = url.searchParams.get('end_date')
      ? new Date(url.searchParams.get('end_date')!)
      : new Date();

    const report = await generateDiscountUsageReport(context.db, {
      campaignId,
      discountCodeId,
      startDate,
      endDate,
    });

    return jsonResponse({ success: true, data: report }, 200);
  } catch (error) {
    console.error('Error generating discount usage report:', error);
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
