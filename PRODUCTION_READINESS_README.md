# Rentbox v2 Production Readiness Checklist

## Overview

This Production Readiness Checklist is designed to ensure Rentbox v2 meets all requirements for a safe and successful production launch. The checklist is:

- **Executable**: Each item has specific verification steps and commands
- **Auditable**: Evidence fields and sign-offs provide traceability
- **Binary**: Clear PASS/FAIL criteria for each item

## Files

- `PRODUCTION_READINESS_CHECKLIST.md` - Main checklist document (human-readable)
- `PRODUCTION_READINESS_CHECKLIST.json` - Machine-readable checklist (for automation/tracking)
- `scripts/verify-production-readiness.sh` - Automated verification script

## Usage

### 1. Pre-Launch Review

Before starting the checklist:

1. **Set Environment Variables** (for automated checks):
   ```bash
   export API_BASE_URL="https://api.rentbox.com/v2"
   export LOCKER_SERVICE_URL="https://locker-service.rentbox.com"
   export DB_HOST="your-db-host"
   export DB_NAME="rentbox"
   export DB_USER="rentbox"
   ```

2. **Run Automated Checks**:
   ```bash
   ./scripts/verify-production-readiness.sh
   ```

   Or check specific items:
   ```bash
   ./scripts/verify-production-readiness.sh --check 3  # Check exclusion constraints
   ```

### 2. Manual Verification

For each checklist item:

1. **Read the verification steps** in the markdown checklist
2. **Execute the commands** provided (or equivalent for your environment)
3. **Document evidence**:
   - Screenshots
   - Command outputs
   - Test results
   - Links to monitoring dashboards
4. **Mark status**: ⬜ PASS / ⬜ FAIL
5. **Fill in fields**: Verified By, Evidence, Date

### 3. Sign-Off Process

1. **Engineering Lead**: Reviews all technical items (1-8, 19-22)
2. **Security Lead**: Reviews all security items (9-13)
3. **SRE Lead**: Reviews all operations items (14-18, 24-25)
4. **Product Manager**: Reviews business requirements and final sign-off (23)

### 4. Go/No-Go Decision

**GO Criteria:**
- ✅ All PRE-LAUNCH items: PASS
- ✅ All SECURITY items: PASS
- ✅ All OPERATIONS items: PASS
- ✅ All PERFORMANCE items: PASS
- ✅ ≤2 non-blocker failures (with documented mitigation)

**NO-GO Criteria:**
- ❌ Any PRE-LAUNCH item: FAIL
- ❌ >2 non-blocker failures
- ❌ Critical security issues unresolved
- ❌ Rollback plan incomplete

## Checklist Structure

### PRE-LAUNCH (BLOCKERS)
Items 1-8 are **blockers** - all must PASS for launch.

### SECURITY
Items 9-13 are security requirements. Failures should be resolved before launch.

### OPERATIONS
Items 14-18 ensure operational readiness. Some may be acceptable with monitoring.

### PERFORMANCE
Items 19-22 verify performance targets. Failures may require optimization or capacity planning.

### GO/NO-GO
Items 23-25 are final gatekeepers for launch approval.

## Customization

### For Your Environment

1. **Update URLs**: Replace API endpoints with your actual endpoints
2. **Database Commands**: Adjust SQL commands for your database (PostgreSQL examples provided)
3. **Secret Scanning**: Customize secret patterns in the verification script
4. **Monitoring**: Update log aggregation and monitoring tool references

### Adding Custom Checks

To add environment-specific checks:

1. Add item to `PRODUCTION_READINESS_CHECKLIST.md`
2. Add corresponding entry to `PRODUCTION_READINESS_CHECKLIST.json`
3. Optionally add automated check to `scripts/verify-production-readiness.sh`

## Best Practices

1. **Start Early**: Begin checklist review 1-2 weeks before launch
2. **Document Everything**: Fill in all evidence fields - you'll need them later
3. **Test in Staging**: Verify all checks work in staging before production
4. **Review Regularly**: Update checklist based on lessons learned
5. **Automate What You Can**: Use the verification script for repeatable checks

## Troubleshooting

### Automated Checks Fail

- **Missing Tools**: Install required tools (curl, psql, etc.)
- **Permissions**: Ensure database access and API tokens are configured
- **Environment**: Verify environment variables are set correctly

### Manual Checks Unclear

- **Ask Questions**: Consult with the team if verification steps are unclear
- **Document Assumptions**: Note any assumptions made during verification
- **Update Checklist**: Improve the checklist based on your findings

## Post-Launch

After launch:

1. **Monitor**: Watch error rates, latency, and user feedback
2. **Document**: Record any issues encountered
3. **Improve**: Update checklist based on lessons learned
4. **Archive**: Save completed checklist for future reference

## Support

For questions or issues with this checklist:
- **SRE Team**: [Your SRE contact]
- **Engineering Lead**: [Your Engineering Lead]
- **Documentation**: Update this README with clarifications

---

**Last Updated**: 2024-01-XX  
**Checklist Version**: 1.0
