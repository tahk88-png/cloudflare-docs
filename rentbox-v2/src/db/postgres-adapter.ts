// ============================================================================
// Rentbox v2: PostgreSQL Database Adapter Example
// ============================================================================
// This is an example implementation. Adapt to your actual database client.

import type {
  DiscountCode,
  DiscountCodeCreate,
  DiscountCodeUpdate,
  Voucher,
  VoucherCreate,
  VoucherUpdate,
  Campaign,
  CampaignCreate,
  CampaignUpdate,
} from '../types';

export interface PostgresClient {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  transaction<T>(callback: (tx: PostgresClient) => Promise<T>): Promise<T>;
}

export class PostgresDatabaseAdapter {
  constructor(private db: PostgresClient) {}

  // ============================================================================
  // DISCOUNT OPERATIONS
  // ============================================================================

  async findDiscountByCode(code: string): Promise<DiscountCode | null> {
    const result = await this.db.query<DiscountCode>(
      `SELECT * FROM discount_codes WHERE UPPER(code) = UPPER($1) AND is_active = true`,
      [code]
    );
    return result.rows[0] || null;
  }

  async createDiscount(data: DiscountCodeCreate): Promise<DiscountCode> {
    const result = await this.db.query<DiscountCode>(
      `INSERT INTO discount_codes (
        code, type, value, is_stackable, valid_from, valid_until,
        max_uses, min_order_amount, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        data.code.toUpperCase(),
        data.type,
        data.value,
        data.is_stackable ?? false,
        data.valid_from || new Date(),
        data.valid_until,
        data.max_uses,
        data.min_order_amount,
        data.is_active ?? true,
      ]
    );
    return result.rows[0];
  }

  async updateDiscount(id: string, data: DiscountCodeUpdate): Promise<DiscountCode> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.code !== undefined) {
      updates.push(`code = $${paramIndex++}`);
      params.push(data.code.toUpperCase());
    }
    if (data.type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      params.push(data.type);
    }
    if (data.value !== undefined) {
      updates.push(`value = $${paramIndex++}`);
      params.push(data.value);
    }
    if (data.is_stackable !== undefined) {
      updates.push(`is_stackable = $${paramIndex++}`);
      params.push(data.is_stackable);
    }
    if (data.valid_from !== undefined) {
      updates.push(`valid_from = $${paramIndex++}`);
      params.push(data.valid_from);
    }
    if (data.valid_until !== undefined) {
      updates.push(`valid_until = $${paramIndex++}`);
      params.push(data.valid_until);
    }
    if (data.max_uses !== undefined) {
      updates.push(`max_uses = $${paramIndex++}`);
      params.push(data.max_uses);
    }
    if (data.min_order_amount !== undefined) {
      updates.push(`min_order_amount = $${paramIndex++}`);
      params.push(data.min_order_amount);
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(data.is_active);
    }

    if (updates.length === 0) {
      return this.getDiscount(id);
    }

    params.push(id);
    const result = await this.db.query<DiscountCode>(
      `UPDATE discount_codes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );
    return result.rows[0];
  }

  async getDiscount(id: string): Promise<DiscountCode | null> {
    const result = await this.db.query<DiscountCode>(
      `SELECT * FROM discount_codes WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async incrementDiscountUsage(id: string): Promise<void> {
    await this.db.query(
      `UPDATE discount_codes SET used_count = used_count + 1 WHERE id = $1`,
      [id]
    );
  }

  async getUserDiscountUsage(userId: string, discountId: string): Promise<number> {
    const result = await this.db.query<{ usage_count: number }>(
      `SELECT usage_count FROM user_discount_usage WHERE user_id = $1 AND discount_code_id = $2`,
      [userId, discountId]
    );
    return result.rows[0]?.usage_count || 0;
  }

  async incrementUserDiscountUsage(userId: string, discountId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO user_discount_usage (user_id, discount_code_id, usage_count, first_used_at, last_used_at)
       VALUES ($1, $2, 1, NOW(), NOW())
       ON CONFLICT (user_id, discount_code_id)
       DO UPDATE SET usage_count = user_discount_usage.usage_count + 1, last_used_at = NOW()`,
      [userId, discountId]
    );
  }

  async getCampaignsForDiscount(discountId: string): Promise<Array<{ id: string; rules: unknown }>> {
    const result = await this.db.query<{ id: string; rules: unknown }>(
      `SELECT c.id, c.rules FROM campaigns c
       INNER JOIN discount_campaigns dc ON c.id = dc.campaign_id
       WHERE dc.discount_id = $1 AND c.is_active = true`,
      [discountId]
    );
    return result.rows;
  }

  // ============================================================================
  // VOUCHER OPERATIONS
  // ============================================================================

  async findVoucherByCode(code: string): Promise<Voucher | null> {
    const result = await this.db.query<Voucher>(
      `SELECT * FROM vouchers WHERE UPPER(code) = UPPER($1)`,
      [code]
    );
    return result.rows[0] || null;
  }

  async lockVoucherForUpdate(voucherId: string): Promise<Voucher | null> {
    // Row-level locking for concurrent safety
    const result = await this.db.query<Voucher>(
      `SELECT * FROM vouchers WHERE id = $1 FOR UPDATE`,
      [voucherId]
    );
    return result.rows[0] || null;
  }

  async createVoucher(data: VoucherCreate): Promise<{ id: string; code: string }> {
    const code = data.code || (await this.generateVoucherCode());
    const result = await this.db.query<{ id: string; code: string }>(
      `INSERT INTO vouchers (
        code, initial_amount, remaining_amount, currency,
        expires_at, purchased_by_user_id, recipient_email, gift_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, code`,
      [
        code.toUpperCase(),
        data.initial_amount,
        data.initial_amount, // remaining = initial at creation
        data.currency || 'EUR',
        data.expires_at,
        data.purchased_by_user_id,
        data.recipient_email,
        data.gift_message,
      ]
    );
    return result.rows[0];
  }

  async generateVoucherCode(): Promise<string> {
    const result = await this.db.query<{ generate_voucher_code: string }>(
      `SELECT generate_voucher_code(12) as generate_voucher_code`
    );
    return result.rows[0].generate_voucher_code;
  }

  async deductVoucherBalance(voucherId: string, amount: number): Promise<void> {
    await this.db.query(
      `UPDATE vouchers SET remaining_amount = remaining_amount - $1 WHERE id = $2`,
      [amount, voucherId]
    );
  }

  async getVoucher(id: string): Promise<Voucher | null> {
    const result = await this.db.query<Voucher>(
      `SELECT * FROM vouchers WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async updateVoucher(id: string, data: VoucherUpdate): Promise<Voucher> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.remaining_amount !== undefined) {
      updates.push(`remaining_amount = $${paramIndex++}`);
      params.push(data.remaining_amount);
    }
    if (data.expires_at !== undefined) {
      updates.push(`expires_at = $${paramIndex++}`);
      params.push(data.expires_at);
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(data.is_active);
    }

    if (updates.length === 0) {
      return this.getVoucher(id)!;
    }

    params.push(id);
    const result = await this.db.query<Voucher>(
      `UPDATE vouchers SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );
    return result.rows[0];
  }

  async recordGiftCardPurchase(
    voucherId: string,
    paymentIntentId: string,
    amount: number,
    currency: string,
    userId: string | null
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO gift_card_purchases (voucher_id, payment_intent_id, amount, currency, purchased_by_user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [voucherId, paymentIntentId, amount, currency, userId]
    );
  }

  async getVoucherByPaymentIntent(paymentIntentId: string): Promise<{
    voucher_id: string;
    code: string;
    amount: number;
    currency: string;
    recipient_email: string | null;
    gift_message: string | null;
    expires_at: Date | null;
  } | null> {
    const result = await this.db.query<{
      voucher_id: string;
      code: string;
      amount: number;
      currency: string;
      recipient_email: string | null;
      gift_message: string | null;
      expires_at: Date | null;
    }>(
      `SELECT v.id as voucher_id, v.code, gcp.amount, gcp.currency,
              v.recipient_email, v.gift_message, v.expires_at
       FROM gift_card_purchases gcp
       INNER JOIN vouchers v ON gcp.voucher_id = v.id
       WHERE gcp.payment_intent_id = $1`,
      [paymentIntentId]
    );
    return result.rows[0] || null;
  }

  // ============================================================================
  // CAMPAIGN OPERATIONS
  // ============================================================================

  async createCampaign(data: CampaignCreate): Promise<Campaign> {
    const result = await this.db.query<Campaign>(
      `INSERT INTO campaigns (name, description, is_active, rules)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING *`,
      [data.name, data.description, data.is_active ?? true, JSON.stringify(data.rules)]
    );
    return result.rows[0];
  }

  async associateDiscountCampaign(discountId: string, campaignId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO discount_campaigns (discount_id, campaign_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [discountId, campaignId]
    );
  }

  // ============================================================================
  // REDEMPTION OPERATIONS
  // ============================================================================

  async recordDiscountRedemption(
    discountId: string,
    bookingId: string,
    amount: number,
    userId: string | null,
    campaignId: string | null,
    bookingSubtotal: number,
    bookingDurationMinutes: number | null
  ) {
    const result = await this.db.query(
      `INSERT INTO discount_redemptions (
        discount_code_id, booking_id, discount_amount, redeemed_by_user_id,
        campaign_id, booking_subtotal, booking_duration_minutes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [discountId, bookingId, amount, userId, campaignId, bookingSubtotal, bookingDurationMinutes]
    );
    return result.rows[0];
  }

  async recordVoucherRedemption(
    voucherId: string,
    bookingId: string,
    amount: number,
    userId: string | null
  ) {
    const result = await this.db.query(
      `INSERT INTO voucher_redemptions (voucher_id, booking_id, amount, redeemed_by_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [voucherId, bookingId, amount, userId]
    );
    return result.rows[0];
  }

  // ============================================================================
  // ACCOUNTING OPERATIONS
  // ============================================================================

  async getOutstandingVoucherLiability() {
    const result = await this.db.query(
      `SELECT * FROM voucher_liability_summary`
    );
    return result.rows[0];
  }

  async getVoucherSalesByMonth(startDate: Date, endDate: Date) {
    const result = await this.db.query(
      `SELECT * FROM voucher_sales_redemptions
       WHERE month >= $1 AND month <= $2
       ORDER BY month DESC`,
      [startDate, endDate]
    );
    return result.rows;
  }

  async getDiscountUsageByCampaign(campaignId: string | null, startDate: Date, endDate: Date) {
    let query = `
      SELECT c.id as campaign_id, c.name as campaign_name,
             dc.id as discount_code_id, dc.code as discount_code,
             COUNT(dr.id) as total_redemptions,
             COALESCE(SUM(dr.discount_amount), 0) as total_discount_amount,
             COALESCE(AVG(dr.discount_amount), 0) as avg_discount_amount
      FROM campaigns c
      LEFT JOIN discount_campaigns dcc ON c.id = dcc.campaign_id
      LEFT JOIN discount_codes dc ON dcc.discount_id = dc.id
      LEFT JOIN discount_redemptions dr ON dc.id = dr.discount_code_id
        AND dr.redeemed_at >= $1 AND dr.redeemed_at <= $2
    `;
    const params: unknown[] = [startDate, endDate];

    if (campaignId) {
      query += ` WHERE c.id = $3`;
      params.push(campaignId);
    }

    query += ` GROUP BY c.id, c.name, dc.id, dc.code ORDER BY total_redemptions DESC`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async getDiscountUsageByCode(discountCodeId: string, startDate: Date, endDate: Date) {
    const result = await this.db.query(
      `SELECT dc.id as discount_code_id, dc.code as discount_code,
              COUNT(dr.id) as total_redemptions,
              COALESCE(SUM(dr.discount_amount), 0) as total_discount_amount,
              COALESCE(AVG(dr.discount_amount), 0) as avg_discount_amount
       FROM discount_codes dc
       LEFT JOIN discount_redemptions dr ON dc.id = dr.discount_code_id
         AND dr.redeemed_at >= $1 AND dr.redeemed_at <= $2
       WHERE dc.id = $3
       GROUP BY dc.id, dc.code`,
      [startDate, endDate, discountCodeId]
    );
    return result.rows;
  }
}
