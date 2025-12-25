// Accounting calculation utilities with proper rounding

/**
 * Round to 2 decimal places (for currency)
 * Uses banker's rounding (round half to even) for fairness
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Calculate VAT amount from subtotal and VAT rate
 */
export function calculateVat(subtotal: number, vatRate: number): number {
  return roundCurrency(subtotal * (vatRate / 100));
}

/**
 * Calculate line item totals
 */
export function calculateLineItem(quantity: number, unitPrice: number, vatRate: number) {
  const subtotal = roundCurrency(quantity * unitPrice);
  const vatAmount = calculateVat(subtotal, vatRate);
  const total = roundCurrency(subtotal + vatAmount);
  
  return {
    subtotal,
    vatAmount,
    total,
  };
}

/**
 * Calculate invoice totals from items
 */
export function calculateInvoiceTotals(
  items: Array<{ subtotal: number; vat_amount: number; total: number }>
) {
  const subtotal = roundCurrency(
    items.reduce((sum, item) => sum + item.subtotal, 0)
  );
  const vatAmount = roundCurrency(
    items.reduce((sum, item) => sum + item.vat_amount, 0)
  );
  const total = roundCurrency(
    items.reduce((sum, item) => sum + item.total, 0)
  );
  
  return {
    subtotal,
    vatAmount,
    total,
  };
}

/**
 * Validate VAT rate (must be 0, 9, or 22 for most EU countries)
 */
export function isValidVatRate(rate: number): boolean {
  return [0, 9, 22].includes(rate);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate payment terms due date
 */
export function calculateDueDate(issueDate: Date, paymentTerms: number): Date {
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + paymentTerms);
  return dueDate;
}

/**
 * Check if invoice is overdue
 */
export function isOverdue(dueDate: string): boolean {
  const due = new Date(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return due < now;
}

/**
 * Calculate days until/past due
 */
export function daysToDue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
