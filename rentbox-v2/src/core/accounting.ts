// ============================================================================
// Rentbox v2: Accounting & Liability Tracking
// ============================================================================

import type {
  VoucherLiabilityReport,
  DiscountUsageReport,
} from '../types';

export interface AccountingDatabaseAdapter {
  // Voucher liability queries
  getOutstandingVoucherLiability(): Promise<{
    total_outstanding_liability: number;
    expired_count: number;
    expired_amount: number;
    active_count: number;
    active_amount: number;
  }>;

  getVoucherSalesByMonth(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    month: string;
    sales: number;
    redemptions: number;
    net_liability: number;
  }>>;

  // Discount usage queries
  getDiscountUsageByCampaign(
    campaignId: string | null,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    campaign_id: string | null;
    campaign_name: string | null;
    discount_code_id: string;
    discount_code: string;
    total_redemptions: number;
    total_discount_amount: number;
    avg_discount_amount: number;
  }>>;

  getDiscountUsageByCode(
    discountCodeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    discount_code_id: string;
    discount_code: string;
    total_redemptions: number;
    total_discount_amount: number;
    avg_discount_amount: number;
  }>>;
}

/**
 * Generates voucher liability report for accounting.
 * This represents unearned revenue (liability) on the balance sheet.
 */
export async function generateVoucherLiabilityReport(
  db: AccountingDatabaseAdapter,
  includeMonthlyBreakdown: boolean = true
): Promise<VoucherLiabilityReport> {
  const summary = await db.getOutstandingVoucherLiability();

  let breakdownByMonth: Array<{
    month: string;
    sales: number;
    redemptions: number;
    net_liability: number;
  }> = [];

  if (includeMonthlyBreakdown) {
    // Get last 12 months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    breakdownByMonth = await db.getVoucherSalesByMonth(startDate, endDate);
  }

  return {
    total_outstanding_liability: summary.total_outstanding_liability,
    expired_count: summary.expired_count,
    expired_amount: summary.expired_amount,
    active_count: summary.active_count,
    active_amount: summary.active_amount,
    breakdown_by_month: breakdownByMonth,
  };
}

/**
 * Generates discount usage report for marketing analysis.
 */
export async function generateDiscountUsageReport(
  db: AccountingDatabaseAdapter,
  options: {
    campaignId?: string;
    discountCodeId?: string;
    startDate: Date;
    endDate: Date;
  }
): Promise<DiscountUsageReport[]> {
  if (options.discountCodeId) {
    const results = await db.getDiscountUsageByCode(
      options.discountCodeId,
      options.startDate,
      options.endDate
    );

    return results.map((r) => ({
      discount_code_id: r.discount_code_id,
      discount_code: r.discount_code,
      total_redemptions: r.total_redemptions,
      total_discount_amount: r.total_discount_amount,
      avg_discount_amount: r.avg_discount_amount,
      period_start: options.startDate,
      period_end: options.endDate,
    }));
  }

  const results = await db.getDiscountUsageByCampaign(
    options.campaignId || null,
    options.startDate,
    options.endDate
  );

  return results.map((r) => ({
    campaign_id: r.campaign_id || undefined,
    campaign_name: r.campaign_name || undefined,
    discount_code_id: r.discount_code_id,
    discount_code: r.discount_code,
    total_redemptions: r.total_redemptions,
    total_discount_amount: r.total_discount_amount,
    avg_discount_amount: r.avg_discount_amount,
    period_start: options.startDate,
    period_end: options.endDate,
  }));
}

/**
 * Calculates accounting entries for gift card sale.
 * 
 * When a gift card is sold:
 * - Debit: Cash/Bank (Asset) - €X
 * - Credit: Unearned Revenue / Gift Card Liability (Liability) - €X
 */
export function getGiftCardSaleAccountingEntries(amount: number): Array<{
  account: string;
  debit: number;
  credit: number;
  description: string;
}> {
  return [
    {
      account: 'Cash/Bank',
      debit: amount,
      credit: 0,
      description: 'Gift card sale',
    },
    {
      account: 'Unearned Revenue - Gift Cards',
      debit: 0,
      credit: amount,
      description: 'Gift card liability created',
    },
  ];
}

/**
 * Calculates accounting entries for voucher redemption.
 * 
 * When a voucher is redeemed:
 * - Debit: Unearned Revenue / Gift Card Liability (Liability) - €X
 * - Credit: Rental Revenue (Revenue) - €X
 */
export function getVoucherRedemptionAccountingEntries(amount: number): Array<{
  account: string;
  debit: number;
  credit: number;
  description: string;
}> {
  return [
    {
      account: 'Unearned Revenue - Gift Cards',
      debit: amount,
      credit: 0,
      description: 'Gift card liability reduced',
    },
    {
      account: 'Rental Revenue',
      debit: 0,
      credit: amount,
      description: 'Revenue recognized from voucher redemption',
    },
  ];
}

/**
 * Calculates accounting entries for expired voucher write-off.
 * 
 * When a voucher expires (if policy allows):
 * - Debit: Unearned Revenue / Gift Card Liability (Liability) - €X
 * - Credit: Other Income / Gift Card Breakage (Revenue) - €X
 */
export function getExpiredVoucherWriteOffEntries(amount: number): Array<{
  account: string;
  debit: number;
  credit: number;
  description: string;
}> {
  return [
    {
      account: 'Unearned Revenue - Gift Cards',
      debit: amount,
      credit: 0,
      description: 'Expired voucher liability written off',
    },
    {
      account: 'Other Income - Gift Card Breakage',
      debit: 0,
      credit: amount,
      description: 'Expired voucher recognized as breakage income',
    },
  ];
}

/**
 * Exports voucher liability data for accounting software (CSV format)
 */
export async function exportVoucherLiabilityCSV(
  db: AccountingDatabaseAdapter,
  startDate: Date,
  endDate: Date
): Promise<string> {
  const breakdown = await db.getVoucherSalesByMonth(startDate, endDate);

  const headers = ['Month', 'Sales (cents)', 'Redemptions (cents)', 'Net Liability (cents)'];
  const rows = breakdown.map((row) => [
    row.month,
    row.sales.toString(),
    row.redemptions.toString(),
    row.net_liability.toString(),
  ]);

  return [headers, ...rows].map((row) => row.join(',')).join('\n');
}
