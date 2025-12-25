# Signing & Consent System

## Policy Rules

The signing policy automatically determines which signature method is required:

### Typed E-Signature (Default)
- Used when:
  - Total amount < 250 EUR
  - Rental duration ≤ 72 hours
  - Customer is B2C (not B2B)

### Strong Digital Signature (Required)
- Required when ANY of:
  - Total amount ≥ 250 EUR
  - Rental duration > 72 hours
  - Customer is B2B

Supported methods:
- Smart-ID
- Mobiil-ID
- ID-kaart

## Contract Hash

The contract hash is computed from:
- Terms version ID
- Terms content hash
- Cart ID

This ensures that if terms change, existing signatures become invalid.

## Terms Version Locking

When terms are updated:
1. New version is created with `is_active = TRUE`
2. Old version's `is_active` is set to `FALSE`
3. Existing consents with old version are invalidated
4. Users must review and sign again

## Status Flow

```
pending → signed (typed) OR verified (digital)
```

- `pending`: Consents accepted, signature not yet completed
- `signed`: Typed signature completed
- `verified`: Digital signature verified by eID provider
