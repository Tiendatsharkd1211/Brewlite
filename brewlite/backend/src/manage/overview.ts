import type { PrismaService } from '../prisma/prisma.service';

export type Range = 'today' | '7d' | '30d';
const PREV_LABEL: Record<Range, string> = { today: 'so với hôm qua', '7d': 'so với 7 ngày trước', '30d': 'so với 30 ngày trước' };
/** Đơn đã trả tiền thì tính doanh thu (đơn huỷ sau khi trả đã bị loại vì chuyển CANCELLED) */
const PAID = ['PAID', 'PREPARING', 'READY', 'COMPLETED'] as const;
const VN = 7 * 3_600_000;
const DAY = 86_400_000;
const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** Đầu ngày theo giờ Việt Nam */
const startOfDayVN = (t: number) => Math.floor((t + VN) / DAY) * DAY - VN;
const vnDate = (t: number) => new Date(t + VN); // đọc bằng getUTC* để ra giờ Việt Nam
const dm = (t: number) => `${vnDate(t).getUTCDate()}/${vnDate(t).getUTCMonth() + 1}`;

interface Row {
  id: string;
  createdAt: Date;
  total: number;
  paymentMethod: 'VNPAY' | 'POINTS';
  status: string;
  user: { fullName: string };
  items: { productId: string; qty: number; unitPrice: number }[];
}

function totals(orders: Row[]) {
  const revenue = orders.reduce((n, o) => n + o.total, 0);
  const cups = orders.reduce((n, o) => n + o.items.reduce((m, it) => m + it.qty, 0), 0);
  return { revenue, orders: orders.length, cups, aov: orders.length ? Math.round(revenue / orders.length) : 0 };
}

/**
 * Số liệu trang Tổng quan từ đơn thật: doanh thu, số đơn, giá trị trung bình, số ly so kỳ trước;
 * doanh thu theo giờ (hôm nay) hoặc theo ngày; món bán chạy; tỉ lệ phương thức; 6 đơn mới nhất.
 */
export async function overview(prisma: PrismaService, range: Range, now = new Date()) {
  const days = range === 'today' ? 1 : range === '7d' ? 7 : 30;
  const nowT = now.getTime();
  const today = startOfDayVN(nowT);
  const from = today - (days - 1) * DAY;
  const prevFrom = from - days * DAY;
  // "Hôm nay" so với hôm qua tới cùng giờ cho công bằng
  const prevTo = range === 'today' ? nowT - DAY : from;
  const select = { id: true, createdAt: true, total: true, paymentMethod: true, status: true, user: { select: { fullName: true } }, items: { select: { productId: true, qty: true, unitPrice: true } } };
  const [rows, recentRows] = await Promise.all([
    prisma.order.findMany({ where: { status: { in: [...PAID] }, createdAt: { gte: new Date(prevFrom), lte: now } }, select, orderBy: { createdAt: 'asc' } }),
    prisma.order.findMany({ where: { status: { in: [...PAID] } }, select, orderBy: { createdAt: 'desc' }, take: 6 }),
  ]);
  const current = (rows as Row[]).filter((o) => o.createdAt.getTime() >= from);
  const prev = (rows as Row[]).filter((o) => o.createdAt.getTime() < prevTo);

  const buckets =
    range === 'today'
      ? Array.from({ length: 17 }, (_, k) => {
          const h = k + 6;
          const os = current.filter((o) => vnDate(o.createdAt.getTime()).getUTCHours() === h);
          return { label: `${h}h`, title: `${h}:00 – ${h}:59`, revenue: os.reduce((n, o) => n + o.total, 0), orders: os.length };
        })
      : Array.from({ length: days }, (_, k) => {
          const d = from + k * DAY;
          const os = current.filter((o) => o.createdAt.getTime() >= d && o.createdAt.getTime() < d + DAY);
          const wd = WD[vnDate(d).getUTCDay()];
          return { label: range === '7d' ? wd : dm(d), title: `${wd}, ${dm(d)}`, revenue: os.reduce((n, o) => n + o.total, 0), orders: os.length };
        });

  const byProduct = new Map<string, { qty: number; revenue: number }>();
  for (const o of current)
    for (const it of o.items) {
      const e = byProduct.get(it.productId) ?? { qty: 0, revenue: 0 };
      e.qty += it.qty;
      e.revenue += it.qty * it.unitPrice;
      byProduct.set(it.productId, e);
    }
  const methods = { VNPAY: 0, POINTS: 0 };
  for (const o of current) methods[o.paymentMethod] += o.total;

  return {
    ...totals(current),
    prev: totals(prev),
    prevLabel: PREV_LABEL[range],
    buckets,
    top: [...byProduct.entries()]
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5),
    methods,
    recent: (recentRows as Row[]).map((o) => ({
      code: o.id,
      at: o.createdAt,
      customer: o.user.fullName,
      items: o.items.map((it) => ({ productId: it.productId, qty: it.qty, price: it.unitPrice })),
      total: o.total,
      method: o.paymentMethod,
      state: o.status,
    })),
  };
}
