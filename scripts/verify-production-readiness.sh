#!/bin/bash
#
# Rentbox v2 Production Readiness Verification Script
# This script automates verification of some checklist items
#
# Usage: ./scripts/verify-production-readiness.sh [--check CHECK_NUMBER]
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration (update these for your environment)
API_BASE_URL="${API_BASE_URL:-https://api.rentbox.com/v2}"
LOCKER_SERVICE_URL="${LOCKER_SERVICE_URL:-https://locker-service.rentbox.com}"
DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-rentbox}"
DB_USER="${DB_USER:-rentbox}"

# Results tracking
PASSED=0
FAILED=0
WARNINGS=0

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED++))
}

# Check 1: Critical Endpoints Idempotency
check_idempotency() {
    log_info "Checking endpoint idempotency..."
    
    # This is a placeholder - actual implementation depends on your API
    # Example: Test payment endpoint with idempotency key
    if command -v curl &> /dev/null; then
        log_warn "Idempotency check requires manual testing with actual API tokens"
        log_warn "Run: curl -X POST ${API_BASE_URL}/payments -H 'Idempotency-Key: test-123' ..."
    else
        log_error "curl not found - cannot test idempotency"
    fi
}

# Check 2: Database Migrations
check_migrations() {
    log_info "Checking database migrations..."
    
    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        log_warn "psql not found - skipping migration check"
        return
    fi
    
    # Example: Check Alembic migrations
    if [ -f "alembic.ini" ]; then
        if alembic current &> /dev/null; then
            log_pass "Migration tool (Alembic) available"
        else
            log_error "Cannot check migration status"
        fi
    else
        log_warn "No alembic.ini found - verify migrations manually"
    fi
}

# Check 3: Exclusion Constraints
check_exclusion_constraints() {
    log_info "Checking exclusion constraints..."
    
    if ! command -v psql &> /dev/null; then
        log_warn "psql not found - skipping constraint check"
        return
    fi
    
    # Check if constraint exists
    CONSTRAINT_CHECK=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM pg_constraint WHERE conrelid = 'bookings'::regclass AND contype = 'x';" 2>/dev/null || echo "0")
    
    if [ "$CONSTRAINT_CHECK" -gt 0 ]; then
        log_pass "Exclusion constraints found on bookings table"
    else
        log_error "No exclusion constraints found on bookings table"
    fi
}

# Check 6: Secrets in Code
check_secrets_in_code() {
    log_info "Scanning for secrets in codebase..."
    
    # Common secret patterns (be careful with false positives)
    SECRET_PATTERNS=(
        "password\s*=\s*['\"][^'\"]+['\"]"
        "api_key\s*=\s*['\"][^'\"]+['\"]"
        "secret\s*=\s*['\"][^'\"]+['\"]"
        "token\s*=\s*['\"][^'\"]+['\"]"
    )
    
    FOUND_SECRETS=0
    for pattern in "${SECRET_PATTERNS[@]}"; do
        if grep -r -i --exclude-dir=.git --exclude-dir=node_modules \
            --exclude="*.md" --exclude="*.sh" \
            -E "$pattern" . 2>/dev/null | grep -v "example\|test\|dummy\|TODO" > /tmp/secret_check.txt; then
            ((FOUND_SECRETS++))
        fi
    done
    
    if [ $FOUND_SECRETS -eq 0 ]; then
        log_pass "No obvious secrets found in codebase"
    else
        log_error "Potential secrets found in codebase - review /tmp/secret_check.txt"
    fi
}

# Check 14: Locker Service Health
check_locker_service() {
    log_info "Checking locker service health..."
    
    if ! command -v curl &> /dev/null; then
        log_warn "curl not found - skipping health check"
        return
    fi
    
    HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${LOCKER_SERVICE_URL}/health" 2>/dev/null || echo "000")
    
    if [ "$HEALTH_RESPONSE" = "200" ]; then
        log_pass "Locker service health check passed"
    else
        log_error "Locker service health check failed (HTTP $HEALTH_RESPONSE)"
    fi
}

# Check 19: Database Indexes
check_database_indexes() {
    log_info "Checking database indexes..."
    
    if ! command -v psql &> /dev/null; then
        log_warn "psql not found - skipping index check"
        return
    fi
    
    INDEX_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'bookings' AND indexname LIKE '%locker%' OR indexname LIKE '%time%';" 2>/dev/null || echo "0")
    
    if [ "$INDEX_COUNT" -gt 0 ]; then
        log_pass "Availability-related indexes found on bookings table"
    else
        log_warn "No availability-related indexes found - verify manually"
    fi
}

# Check 20: API Pagination
check_api_pagination() {
    log_info "Checking API pagination..."
    
    if ! command -v curl &> /dev/null; then
        log_warn "curl not found - skipping pagination check"
        return
    fi
    
    # Test calendar endpoint with pagination
    PAGINATION_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        "${API_BASE_URL}/calendar?locker_id=1&page=1&limit=10" 2>/dev/null || echo "000")
    
    if [ "$PAGINATION_RESPONSE" = "200" ]; then
        log_pass "Calendar endpoint responds (pagination implementation needs manual verification)"
    else
        log_warn "Calendar endpoint check failed (HTTP $PAGINATION_RESPONSE) - may require auth"
    fi
}

# Main execution
main() {
    echo "=========================================="
    echo "Rentbox v2 Production Readiness Check"
    echo "=========================================="
    echo ""
    
    # If specific check requested
    if [ "${1:-}" = "--check" ] && [ -n "${2:-}" ]; then
        case "$2" in
            1) check_idempotency ;;
            2) check_migrations ;;
            3) check_exclusion_constraints ;;
            6) check_secrets_in_code ;;
            14) check_locker_service ;;
            19) check_database_indexes ;;
            20) check_api_pagination ;;
            *)
                echo "Unknown check number: $2"
                echo "Available checks: 1, 2, 3, 6, 14, 19, 20"
                exit 1
                ;;
        esac
    else
        # Run all automated checks
        check_idempotency
        check_migrations
        check_exclusion_constraints
        check_secrets_in_code
        check_locker_service
        check_database_indexes
        check_api_pagination
    fi
    
    echo ""
    echo "=========================================="
    echo "Summary"
    echo "=========================================="
    echo "Passed:  $PASSED"
    echo "Failed:  $FAILED"
    echo "Warnings: $WARNINGS"
    echo ""
    
    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}All automated checks passed!${NC}"
        echo "Note: Many checklist items require manual verification."
        exit 0
    else
        echo -e "${RED}Some checks failed. Review output above.${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
