// Utility functions for ID generation

import { randomBytes } from 'crypto';

/**
 * Generate a unique ID using crypto random bytes
 */
export function generateId(prefix?: string): string {
  const id = randomBytes(16).toString('hex');
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Generate a secure random token for invoice view links
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('base64url');
}

/**
 * Generate API key
 */
export function generateApiKey(): string {
  return `inv_${randomBytes(32).toString('base64url')}`;
}
