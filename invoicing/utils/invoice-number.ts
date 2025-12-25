// Invoice numbering system - YYYY-000001 format

import type { D1Database } from '@cloudflare/workers-types';

/**
 * Generate the next invoice number for a company
 * Format: YYYY-000001 (year-sequence)
 * Sequence is unique per company per year
 */
export async function generateInvoiceNumber(
  db: D1Database,
  companyId: string,
  prefix?: string
): Promise<string> {
  const year = new Date().getFullYear();
  
  // Use a transaction to ensure atomicity
  // First, try to get existing sequence
  const existingSequence = await db
    .prepare(
      'SELECT last_sequence FROM invoice_sequences WHERE company_id = ? AND year = ?'
    )
    .bind(companyId, year)
    .first<{ last_sequence: number }>();
  
  let nextSequence: number;
  
  if (existingSequence) {
    // Increment existing sequence
    nextSequence = existingSequence.last_sequence + 1;
    
    await db
      .prepare(
        'UPDATE invoice_sequences SET last_sequence = ?, updated_at = datetime(\'now\') WHERE company_id = ? AND year = ?'
      )
      .bind(nextSequence, companyId, year)
      .run();
  } else {
    // Create new sequence for this year
    nextSequence = 1;
    
    await db
      .prepare(
        'INSERT INTO invoice_sequences (id, company_id, year, last_sequence) VALUES (?, ?, ?, ?)'
      )
      .bind(generateSequenceId(), companyId, year, nextSequence)
      .run();
  }
  
  // Format: YYYY-000001 or PREFIX-YYYY-000001
  const paddedSequence = String(nextSequence).padStart(6, '0');
  const invoiceNumber = prefix
    ? `${prefix}-${year}-${paddedSequence}`
    : `${year}-${paddedSequence}`;
  
  return invoiceNumber;
}

/**
 * Validate invoice number format
 */
export function validateInvoiceNumber(invoiceNumber: string): boolean {
  // Match YYYY-000001 or PREFIX-YYYY-000001
  const pattern = /^([A-Z]+-)?(\d{4})-(\d{6})$/;
  return pattern.test(invoiceNumber);
}

/**
 * Parse invoice number to extract year and sequence
 */
export function parseInvoiceNumber(invoiceNumber: string): {
  prefix?: string;
  year: number;
  sequence: number;
} | null {
  const pattern = /^(?:([A-Z]+)-)?(\d{4})-(\d{6})$/;
  const match = invoiceNumber.match(pattern);
  
  if (!match) {
    return null;
  }
  
  return {
    prefix: match[1],
    year: parseInt(match[2], 10),
    sequence: parseInt(match[3], 10),
  };
}

function generateSequenceId(): string {
  return `seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
