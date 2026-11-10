import { TOPPINGS } from './mock-data';
import type { SizeId } from './types';

const vnd = new Intl.NumberFormat('vi-VN');

/** Tiền luôn làm tròn tới đồng (giá vốn bình quân, tồn theo kg/lít có thể ra số lẻ) */
export function formatVnd(amount: number): string {
  return `${vnd.format(Math.round(amount))}đ`;
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

/** "2026-11-30" hoặc mốc thời gian -> "30/11/2026" */
export function formatDate(value: string | number): string {
  const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
