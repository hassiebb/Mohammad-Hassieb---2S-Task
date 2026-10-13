import { Palette } from '@/constants/colors';
import { SalesOrderStatus } from '@/types/sales-order';

export function formatCurrency(amount: number, symbol = '$'): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function getStatusConfig(status: SalesOrderStatus) {
  switch (status) {
    case 'draft':
      return Palette.statusDraft;
    case 'sent':
      return Palette.statusSent;
    case 'sale':
      return Palette.statusSale;
    case 'done':
      return Palette.statusDone;
    case 'cancel':
      return Palette.statusCancel;
    default:
      return {
        bg: '#F1F5F9',
        text: '#475569',
        border: '#CBD5E1',
        label: status,
      };
  }
}
