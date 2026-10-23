import { TOPPINGS } from './mock-data';
import type { SizeId } from './types';

const vnd = new Intl.NumberFormat('vi-VN');

export function formatVnd(amount: number): string {
  return `${vnd.format(amount)}đ`;
}

export function formatNumber(n: number): string {
  return vnd.format(n);
}

/** "Size M, 50% đường, 30% đá, Kem cheese" */
export function describeOptions(item: { size: SizeId | null; sugar: number | null; ice: number | null; toppingIds: string[] }): string {
  const parts: string[] = [];
  if (item.size) parts.push(`Size ${item.size}`);
  if (item.sugar !== null) parts.push(`${item.sugar}% đường`);
  if (item.ice !== null) parts.push(`${item.ice}% đá`);
  for (const id of item.toppingIds) {
    const t = TOPPINGS.find((x) => x.id === id);
    if (t) parts.push(t.name);
  }
  return parts.join(', ');
}

export function formatClock(ts: number | string): string {
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(ts: number | string): string {
  return new Date(ts).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}
