export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatMonthYear(monthYear: string): string {
  const [year, month] = monthYear.split('-');
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'long',
  }).format(new Date(Number(year), Number(month) - 1));
}
