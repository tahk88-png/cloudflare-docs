export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('et-EE', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('et-EE').format(value);
}
