export type CurrencyCode = 'INR' | 'USD';

const INR_PER_USD = 84;

export function formatCurrency(amountInr: number, currency: CurrencyCode = 'INR'): string {
  if (amountInr <= 0) {
    return 'Free';
  }
  if (currency === 'USD') {
    const usd = Math.max(1, Math.round(amountInr / INR_PER_USD));
    return `$${usd.toLocaleString('en-US')}`;
  }
  return `₹${amountInr.toLocaleString('en-IN')}`;
}

export function formatMonthlyPrice(amountInr: number, currency: CurrencyCode = 'INR'): string {
  if (amountInr <= 0) {
    return 'Free / Grant-funded';
  }
  return `${formatCurrency(amountInr, currency)}/mo`;
}
