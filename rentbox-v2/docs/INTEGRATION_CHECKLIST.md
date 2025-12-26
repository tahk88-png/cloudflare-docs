# Integration Checklist

Use this checklist when integrating the Discounts, Vouchers & Campaigns system into Rentbox v2.

## ✅ Pre-Integration

- [ ] Review database schema (`database/migrations/001_create_discounts_vouchers_campaigns.sql`)
- [ ] Review API endpoints and payloads (`docs/API_EXAMPLES.md`)
- [ ] Review edge cases (`docs/EDGE_CASES.md`)
- [ ] Understand accounting implications (liability tracking)

## 🗄️ Database Setup

- [ ] Run PostgreSQL migrations
- [ ] Verify all tables created successfully
- [ ] Test database functions (`generate_voucher_code`, `is_voucher_redeemable`)
- [ ] Verify indexes created (performance)
- [ ] Set up database connection pool

## 🔧 Core Integration

- [ ] Implement or adapt `PostgresDatabaseAdapter` (`src/db/postgres-adapter.ts`)
- [ ] Implement payment adapter (Stripe, etc.)
- [ ] Implement email adapter (SendGrid, etc.)
- [ ] Set up rate limiting (Redis or in-memory)
- [ ] Configure admin authentication

## 🔌 API Integration

### Checkout Flow

- [ ] Add code input field to checkout UI
- [ ] Call `POST /api/checkout/apply-code` on code entry
- [ ] Display discount/voucher preview
- [ ] Call `POST /api/checkout/remove-code` on removal
- [ ] Record redemptions after payment success
- [ ] Handle payment failure rollback

### Gift Card Purchase

- [ ] Create gift card landing page
- [ ] Implement purchase flow (`POST /api/gift-cards/purchase`)
- [ ] Integrate payment provider (Stripe, etc.)
- [ ] Set up payment webhook handler
- [ ] Configure email template for gift card delivery
- [ ] Test end-to-end purchase flow

### Admin Panel

- [ ] Build discount management UI
- [ ] Build voucher management UI
- [ ] Build campaign builder UI (rule editor)
- [ ] Implement admin authentication
- [ ] Add audit log viewer
- [ ] Build reports dashboard

## 💰 Accounting Integration

- [ ] Set up accounting export (CSV/API)
- [ ] Configure liability account mapping
- [ ] Set up monthly liability reports
- [ ] Test gift card sale accounting entries
- [ ] Test voucher redemption accounting entries
- [ ] Configure expired voucher write-off process

## 🔒 Security

- [ ] Enable rate limiting on code application
- [ ] Verify row-level locking on voucher redemption
- [ ] Set up admin audit logging
- [ ] Configure webhook signature verification
- [ ] Test concurrent redemption scenarios
- [ ] Review SQL injection prevention (parameterized queries)

## 🧪 Testing

### Unit Tests

- [ ] Campaign rule evaluation tests
- [ ] Discount calculation tests
- [ ] Voucher balance deduction tests
- [ ] Code normalization tests

### Integration Tests

- [ ] End-to-end checkout with discount
- [ ] End-to-end checkout with voucher
- [ ] Gift card purchase flow
- [ ] Campaign rule enforcement
- [ ] Concurrent voucher redemption
- [ ] Payment failure rollback

### Edge Case Tests

- [ ] Expired code handling
- [ ] Insufficient voucher balance
- [ ] Campaign rule changes during checkout
- [ ] Negative total prevention
- [ ] Per-user discount limits
- [ ] Code collision handling

## 📊 Monitoring & Alerts

- [ ] Set up error tracking (Sentry, etc.)
- [ ] Monitor voucher liability growth
- [ ] Alert on unusual redemption patterns
- [ ] Track discount usage by campaign
- [ ] Monitor failed code applications

## 📝 Documentation

- [ ] Document API endpoints for frontend team
- [ ] Create admin user guide
- [ ] Document accounting integration
- [ ] Create runbook for common issues
- [ ] Document campaign rule examples

## 🚀 Deployment

- [ ] Deploy database migrations
- [ ] Deploy API endpoints
- [ ] Configure environment variables
- [ ] Set up payment webhooks
- [ ] Configure email service
- [ ] Test in staging environment
- [ ] Deploy to production
- [ ] Monitor for issues

## 🔄 Post-Deployment

- [ ] Create initial discount codes
- [ ] Set up first campaign
- [ ] Test gift card purchase
- [ ] Verify accounting exports
- [ ] Train support team
- [ ] Monitor first week closely

## 📋 Quick Reference

### Key Endpoints

- `POST /api/checkout/apply-code` - Apply code
- `POST /api/gift-cards/purchase` - Buy gift card
- `GET /api/vouchers/:code` - Check balance
- `POST /api/admin/discounts` - Create discount
- `POST /api/admin/campaigns` - Create campaign
- `GET /api/admin/reports/voucher-liability` - Liability report

### Key Database Tables

- `discount_codes` - Discount definitions
- `vouchers` - Gift card balances
- `campaigns` - Rule sets
- `voucher_redemptions` - Redemption audit
- `gift_card_purchases` - Purchase records

### Key Concepts

- **Discount**: Price reduction, no balance, marketing tool
- **Voucher**: Real money balance, acts as payment method
- **Campaign**: Ruleset governing when/where codes are valid
- **Liability**: Unearned revenue from gift card sales

## ⚠️ Critical Reminders

1. **Always use transactions** for redemption operations
2. **Lock vouchers** before deducting balance
3. **Re-validate codes** at payment confirmation
4. **Never allow negative totals**
5. **Log all admin actions**
6. **Test concurrent scenarios**
7. **Monitor liability growth**

## 🆘 Troubleshooting

### Common Issues

**Issue**: Voucher balance not updating
- Check row-level locking implementation
- Verify transaction usage
- Check for concurrent redemptions

**Issue**: Discount not applying
- Check campaign rules
- Verify code is active and not expired
- Check per-user limits

**Issue**: Accounting mismatch
- Verify gift card purchases recorded
- Check redemption records
- Review liability report

**Issue**: Code collision
- Check code generation function
- Verify case-insensitive matching
- Review unique constraints

## 📞 Support

For questions or issues:
1. Check `docs/EDGE_CASES.md`
2. Review API examples in `docs/API_EXAMPLES.md`
3. Check database logs
4. Review audit logs for admin actions
