'use client';

// TỔNG QUAN (kiểu trang quản trị bán hàng): chọn kỳ xem, 4 chỉ số có so sánh kỳ trước, biểu đồ doanh thu,
// cột "Cần xử lý" bên phải, món bán chạy, tỉ lệ phương thức thanh toán, đơn gần đây.
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFeedbackList } from '@/lib/feedback-admin';
import { formatClock, formatDate, formatVnd } from '@/lib/format';
import { cupsLeft, stateOf, useInventory } from '@/lib/inventory';
import { useAllProducts } from '@/lib/products';
import { RANGE_LABEL, compactVnd, useSales, type Bucket, type OrderState, type Range } from '@/lib/sales';
import { useStorefront, voucherState } from '@/lib/storefront';
import { Chip } from './ui';

// Màu biểu đồ: cột doanh thu một màu mực; tỉ lệ thanh toán hai màu đã kiểm tra mù màu trên nền giấy (#efe7d4)
const INK = '#1b1712';
const HOVER = '#b3261e';
const GRID = '#d8ceb8';
const METHOD_COLOR = { VNPAY: '#1f6fb0', POINTS: '#b3261e' };
const METHOD_NAME = { VNPAY: 'VNPay', POINTS: 'Điểm BrewLite' };
const STATE: Record<OrderState, { label: string; tone: 'warn' | 'ink' | 'ok' | 'mute' }> = {
  PAID: { label: 'Chờ pha', tone: 'warn' },
  PREPARING: { label: 'Đang pha', tone: 'ink' },
  READY: { label: 'Chờ lấy', tone: 'ok' },
  COMPLETED: { label: 'Hoàn thành', tone: 'mute' },
};

export default function Overview() {
  const [range, setRange] = useState<Range>('7d');
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const { data: products = [] } = useAllProducts();
  const { data: sales = null } = useSales(range);
  const names = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black sm:text-4xl">Tổng quan</h1>
          <p className="text-sm text-roast/60">{now ? `Cập nhật ${formatClock(now.getTime())}, ${formatDate(now.getTime())}` : ' '}</p>
        </div>
        <div role="tablist" aria-label="Kỳ xem" className="inline-flex border-2 border-roast">
          {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
            <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)} className={`h-9 px-4 text-xs font-semibold tracking-wider ${range === r ? 'bg-roast text-cream' : 'hover:bg-roast/10'}`}>
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Chỉ số chính */}
      <section aria-label="Chỉ số" className="mt-5 grid grid-cols-2 border-2 border-roast lg:grid-cols-4">
        <Kpi label="Doanh thu" value={sales ? formatVnd(sales.revenue) : '—'} now={sales?.revenue} prev={sales?.prev.revenue} hint={sales?.prevLabel} first />
        <Kpi label="Đơn hàng" value={sales ? sales.orders.toLocaleString('vi-VN') : '—'} now={sales?.orders} prev={sales?.prev.orders} hint={sales?.prevLabel} />
        <Kpi label="Giá trị trung bình đơn" value={sales ? formatVnd(sales.aov) : '—'} now={sales?.aov} prev={sales?.prev.aov} hint={sales?.prevLabel} />
        <Kpi label="Ly và bánh đã bán" value={sales ? sales.cups.toLocaleString('vi-VN') : '—'} now={sales?.cups} prev={sales?.prev.cups} hint={sales?.prevLabel} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <section aria-labelledby="rev-title" className="min-w-0 border-2 border-roast p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="rev-title" className="text-xl font-black">
              Doanh thu {range === 'today' ? 'theo giờ' : 'theo ngày'}
            </h2>
            <span className="text-xs text-roast/60">{RANGE_LABEL[range]}</span>
          </div>
          {!sales ? (
            <div className="mt-4 h-56 animate-pulse bg-roast/5" />
          ) : sales.orders === 0 ? (
            <p className="grid h-56 place-items-center text-sm text-roast/60">Chưa có đơn nào trong kỳ này.</p>
          ) : (
            <RevenueChart buckets={sales.buckets} />
          )}
          {sales && <MethodSplit methods={sales.methods} />}
        </section>
        <TodoPanel />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="top-title" className="min-w-0 border-2 border-roast p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="top-title" className="text-xl font-black">
              Món bán chạy
            </h2>
            <Link href="/quan-ly/thuc-don" className="font-label text-xs font-semibold uppercase tracking-wider underline underline-offset-4 hover:text-gold">
              Thực đơn →
            </Link>
          </div>
          {sales && <TopItems top={sales.top} names={names} />}
        </section>

        <section aria-labelledby="recent-title" className="min-w-0 border-2 border-roast p-4">
          <h2 id="recent-title" className="text-xl font-black">
            Đơn gần đây
          </h2>
          <table className="mt-2 w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-roast text-left font-label text-[11px] uppercase tracking-wider text-roast/55">
                <th className="w-24 py-1.5 font-semibold">Mã đơn</th>
                <th className="py-1.5 font-semibold">Khách</th>
                <th className="w-20 py-1.5 text-right font-semibold">Tổng</th>
                <th className="hidden w-28 py-1.5 pl-3 text-right font-semibold sm:table-cell">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dotted divide-roast/40">
              {sales?.recent.map((o) => (
                <tr key={o.code}>
                  <td className="py-2">
                    <span className="block font-mono text-xs font-semibold">{o.code}</span>
                    <span className="block font-mono text-[11px] text-roast/55">{formatClock(o.at.getTime())}</span>
                  </td>
                  <td className="py-2 pr-2">
                    <span className="block truncate">{o.customer}</span>
                    <span className="block truncate text-[11px] text-roast/55">{o.items.map((it) => `${it.qty}× ${names.get(it.productId) ?? ''}`).join(', ')}</span>
                  </td>
                  <td className="py-2 text-right font-mono text-xs">{formatVnd(o.total)}</td>
                  <td className="hidden py-2 pl-3 text-right sm:table-cell">
                    <Chip tone={STATE[o.state].tone}>{STATE[o.state].label}</Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}

/** Ô chỉ số: giá trị, mức tăng giảm so với kỳ trước (mũi tên + chữ, không chỉ dựa vào màu) */
function Kpi({ label, value, now, prev, hint, first }: { label: string; value: string; now?: number; prev?: number; hint?: string; first?: boolean }) {
  const pct = now !== undefined && prev ? Math.round(((now - prev) / prev) * 100) : null;
  return (
    <div className={`border-roast p-4 [&:nth-child(2)]:border-l [&:nth-child(3)]:border-t [&:nth-child(4)]:border-l [&:nth-child(4)]:border-t lg:[&:nth-child(3)]:border-l lg:[&:nth-child(3)]:border-t-0 lg:[&:nth-child(4)]:border-t-0 ${first ? 'bg-roast/[0.04]' : ''}`}>
      <p className="font-label text-[11px] font-semibold uppercase tracking-wider text-roast/60">{label}</p>
      <p className={`mt-1 whitespace-nowrap font-sans font-black leading-none ${first ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>{value}</p>
      {pct !== null && (
        <p className="mt-1.5 text-xs">
          <span className={`font-semibold ${pct > 0 ? 'text-leaf' : pct < 0 ? 'text-chili' : 'text-roast/60'}`}>
            {pct > 0 ? '▲' : pct < 0 ? '▼' : '■'} {Math.abs(pct)}%
          </span>{' '}
          <span className="text-roast/55">{hint}</span>
        </p>
      )}
    </div>
  );
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Cột doanh thu: một màu, cột rê chuột đổi màu và hiện chú thích; có bảng số liệu thay thế */
function RevenueChart({ buckets }: { buckets: Bucket[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const H = 220;
  const pad = { l: 44, r: 8, t: 18, b: 24 };
  const max = Math.max(...buckets.map((b) => b.revenue), 1);
  const step = max > 4_000_000 ? 1_000_000 : max > 2_000_000 ? 500_000 : max > 800_000 ? 200_000 : 100_000;
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step).filter((_, i, a) => a.length <= 6 || i % 2 === 0);
  const innerW = Math.max(0, width - pad.l - pad.r);
  const band = innerW / buckets.length;
  const barW = Math.min(24, band * 0.62);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
  const peak = buckets.reduce((bi, b, i) => (b.revenue > buckets[bi].revenue ? i : bi), 0);
  const showEvery = band < 22 ? Math.ceil(22 / band) : 1;

  if (table) {
    return (
      <div className="mt-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-roast text-left font-label text-[11px] uppercase tracking-wider text-roast/55">
              <th className="py-1">Thời gian</th>
              <th className="py-1 text-right">Đơn</th>
              <th className="py-1 text-right">Doanh thu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dotted divide-roast/30">
            {buckets.map((b) => (
              <tr key={b.title}>
                <td className="py-1">{b.title}</td>
                <td className="py-1 text-right tabular-nums">{b.orders}</td>
                <td className="py-1 text-right tabular-nums">{formatVnd(b.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={() => setTable(false)} className="mt-2 text-xs font-semibold tracking-wider underline underline-offset-4">
          Xem biểu đồ
        </button>
      </div>
    );
  }

  const hb = hover !== null ? buckets[hover] : null;
  return (
    <div className="mt-3">
      <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label={`Doanh thu cao nhất ${buckets[peak].title}: ${formatVnd(buckets[peak].revenue)}`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? INK : GRID} strokeWidth={1} />
                <text x={pad.l - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-roast/55 font-mono text-[10px]">
                  {t === 0 ? '0' : compactVnd(t)}
                </text>
              </g>
            ))}
            {buckets.map((b, i) => {
              const cx = pad.l + band * i + band / 2;
              const h = Math.max(0, y(0) - y(b.revenue));
              const x = cx - barW / 2;
              const r = Math.min(4, h, barW / 2);
              const yTop = y(0) - h;
              const d = h > 0 ? `M${x},${y(0)} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${y(0)} Z` : '';
              return (
                <g key={b.title}>
                  {d && <path d={d} fill={hover === i ? HOVER : INK} opacity={hover !== null && hover !== i ? 0.55 : 1} />}
                  {i % showEvery === 0 && (
                    <text x={cx} y={H - 6} textAnchor="middle" className="fill-roast/60 font-mono text-[10px]">
                      {b.label}
                    </text>
                  )}
                  {i === peak && hover === null && b.revenue > 0 && (
                    <text x={cx} y={yTop - 6} textAnchor="middle" className="fill-roast font-mono text-[10px] font-semibold">
                      {compactVnd(b.revenue)}
                    </text>
                  )}
                  {/* Vùng rê chuột: cả dải cột, lớn hơn cột */}
                  <rect
                    x={pad.l + band * i}
                    y={pad.t}
                    width={band}
                    height={H - pad.t - pad.b}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${b.title}: ${formatVnd(b.revenue)}, ${b.orders} đơn`}
                    onPointerEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    className="cursor-default focus:outline-none"
                  />
                </g>
              );
            })}
          </svg>
        )}
        {hb && hover !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 border border-roast bg-foam px-2.5 py-1.5 text-xs shadow-none"
            style={{ left: Math.min(Math.max(pad.l + band * hover + band / 2, 70), width - 70), top: Math.max(0, y(hb.revenue) - 56) }}
          >
            <p className="whitespace-nowrap font-mono text-sm font-bold">{formatVnd(hb.revenue)}</p>
            <p className="whitespace-nowrap text-roast/65">
              {hb.title} · {hb.orders} đơn
            </p>
          </div>
        )}
      </div>
      <button type="button" onClick={() => setTable(true)} className="mt-1 text-xs font-semibold tracking-wider text-roast/60 underline underline-offset-4 hover:text-roast">
        Xem dạng bảng
      </button>
    </div>
  );
}

/** Tỉ lệ doanh thu theo phương thức: một thanh chia phần, có chú thích tên */
function MethodSplit({ methods }: { methods: { VNPAY: number; POINTS: number } }) {
  const total = methods.VNPAY + methods.POINTS;
  if (!total) return null;
  const parts = (['VNPAY', 'POINTS'] as const).map((k) => ({ k, v: methods[k], pct: Math.round((methods[k] / total) * 100) }));
  return (
    <div className="mt-4 border-t border-dotted border-roast/50 pt-3">
      <p className="font-label text-[11px] font-semibold uppercase tracking-wider text-roast/60">Doanh thu theo cách thanh toán</p>
      <div className="mt-2 flex h-7 gap-0.5" role="img" aria-label={parts.map((p) => `${METHOD_NAME[p.k]} ${p.pct}%, ${formatVnd(p.v)}`).join('; ')}>
        {parts
          .filter((p) => p.v > 0)
          .map((p) => (
            <div key={p.k} title={`${METHOD_NAME[p.k]}: ${formatVnd(p.v)} (${p.pct}%)`} className="flex items-center px-2 text-xs font-semibold text-white" style={{ width: `${p.pct}%`, background: METHOD_COLOR[p.k], borderRadius: 4 }}>
              {p.pct >= 12 ? `${p.pct}%` : ''}
            </div>
          ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {parts.map((p) => (
          <li key={p.k} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5" style={{ background: METHOD_COLOR[p.k], borderRadius: 2 }} aria-hidden="true" />
            <span className="text-roast/75">{METHOD_NAME[p.k]}</span>
            <span className="font-mono text-roast/60">{formatVnd(p.v)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Món bán chạy: thanh ngang xếp hạng, một màu */
function TopItems({ top, names }: { top: { productId: string; qty: number; revenue: number }[]; names: Map<string, string> }) {
  const max = Math.max(...top.map((t) => t.qty), 1);
  return (
    <ol className="mt-3 space-y-3">
      {top.map((t, i) => (
        <li key={t.productId}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              <span className="mr-2 font-mono text-xs text-roast/50">{i + 1}</span>
              <span className="font-semibold">{names.get(t.productId) ?? t.productId}</span>
            </span>
            <span className="shrink-0 font-mono text-xs text-roast/60">{formatVnd(t.revenue)}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2.5" style={{ width: `${(t.qty / max) * 85}%`, background: INK, borderRadius: '0 4px 4px 0' }} />
            <span className="font-mono text-xs font-semibold">{t.qty}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

type Level = 'urgent' | 'soon' | 'later';
const LEVEL: Record<Level, { label: string; cls: string }> = {
  urgent: { label: 'Gấp', cls: 'bg-chili text-foam' },
  soon: { label: 'Hôm nay', cls: 'bg-amber-600 text-foam' },
  later: { label: 'Sau', cls: 'bg-roast/15 text-roast' },
};

/** Cột "Cần xử lý": gom việc từ thực đơn, kho, mã giảm giá, phản hồi; việc gấp lên đầu, tối đa một dòng mỗi loại */
function TodoPanel() {
  const { ingredients, recipes } = useInventory();
  const { data: products = [] } = useAllProducts();
  const { vouchers, content, feedback: fbState } = useStorefront();
  const { data: feedback = [] } = useFeedbackList();
  const map = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);

  // Mỗi loại việc gom thành đúng một dòng (1 việc thì ghi tên, nhiều thì ghi số) nên khung không dài ra theo dữ liệu
  const todos: { level: Level; title: string; href: string }[] = [];
  const nameOf = (id: string) => products.find((p) => p.id === id)?.name ?? id;
  const blocked = recipes.filter((r) => {
    const p = products.find((x) => x.id === r.productId);
    return p && !p.hidden && p.stock > 0 && cupsLeft(r, map).cups === 0;
  });
  if (blocked.length === 1) todos.push({ level: 'urgent', title: `Báo hết món ${nameOf(blocked[0].productId)}`, href: `/quan-ly/thuc-don?sua=${blocked[0].productId}` });
  else if (blocked.length > 1) todos.push({ level: 'urgent', title: `${blocked.length} món không đủ nguyên liệu để pha`, href: '/quan-ly/thuc-don' });
  const out = ingredients.filter((i) => stateOf(i) === 'out');
  if (out.length) todos.push({ level: 'urgent', title: out.length === 1 ? `Nhập gấp ${out[0].name}` : `${out.length} nguyên liệu đã hết`, href: '/quan-ly/nguyen-lieu?loc=can-nhap' });
  const running = vouchers.filter((v) => voucherState(v) === 'running');
  if (!running.some((v) => v.code === content.promo.code)) todos.push({ level: 'urgent', title: `Mã quảng bá ${content.promo.code} đã ngừng`, href: '/quan-ly/noi-dung' });
  const fresh = feedback.filter((f) => (fbState[f.id]?.status ?? 'new') === 'new');
  if (fresh.length) todos.push({ level: 'soon', title: `${fresh.length} thư góp ý chưa trả lời`, href: '/quan-ly/phan-hoi' });
  const ending = running.filter((v) => v.usageLimit && v.usedCount / v.usageLimit >= 0.8);
  if (ending.length === 1) todos.push({ level: 'soon', title: `Mã ${ending[0].code} còn ${(ending[0].usageLimit ?? 0) - ending[0].usedCount} lượt`, href: `/quan-ly/ma-giam-gia?sua=${ending[0].code}` });
  else if (ending.length > 1) todos.push({ level: 'soon', title: `${ending.length} mã giảm giá sắp hết lượt`, href: '/quan-ly/ma-giam-gia' });
  const low = ingredients.filter((i) => stateOf(i) === 'low');
  if (low.length) todos.push({ level: 'soon', title: `${low.length} nguyên liệu sắp hết`, href: '/quan-ly/nguyen-lieu?loc=can-nhap' });

  return (
    <section aria-labelledby="todo-title" className="border-2 border-roast">
      <div className="flex items-baseline justify-between border-b-2 border-roast px-4 py-3">
        <h2 id="todo-title" className="text-xl font-black">
          Cần xử lý
        </h2>
        <span className="bg-roast px-2 font-mono text-xs leading-5 text-cream">{todos.length}</span>
      </div>
      {todos.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-roast/60">Không có việc gấp.</p>
      ) : (
        <ul className="divide-y divide-dotted divide-roast/40">
          {todos.map((t) => (
            <li key={t.title}>
              <Link href={t.href} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-roast/5">
                <span className={`w-14 shrink-0 py-0.5 text-center font-label text-[10px] font-semibold uppercase tracking-wider ${LEVEL[t.level].cls}`}>{LEVEL[t.level].label}</span>
                <span className="min-w-0 flex-1 text-sm leading-snug">{t.title}</span>
                <span className="text-roast/40 group-hover:text-roast" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
