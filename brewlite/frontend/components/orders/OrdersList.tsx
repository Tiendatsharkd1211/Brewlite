'use client';

// "Đơn của tôi": đơn đang pha nổi lên đầu kèm tiến độ; bên dưới là các tab theo trạng thái,
// danh sách gọn chia theo ngày, mỗi lần hiện 10 đơn.
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatVnd } from '@/lib/format';
import { ORDER_STAGES, stageIndex } from '@/lib/pricing';
import { useMyOrders } from '@/lib/use-orders';
import type { Order, OrderStatus } from '@/lib/types';
import Skeleton from '@/components/ui/Skeleton';
import { AlertIcon, ReceiptIcon } from '@/components/ui/Icons';
import OrderStatusPill from './OrderStatusPill';

type Tab = 'all' | 'unpaid' | 'making' | 'done' | 'cancelled';

const TABS: { id: Tab; label: string; statuses: OrderStatus[] | null }[] = [
  { id: 'all', label: 'Tất cả', statuses: null },
  { id: 'unpaid', label: 'Chờ thanh toán', statuses: ['PENDING', 'PAYMENT_FAILED'] },
  { id: 'making', label: 'Đang làm', statuses: ['PAID', 'PREPARING', 'READY'] },
  { id: 'done', label: 'Hoàn thành', statuses: ['COMPLETED'] },
  { id: 'cancelled', label: 'Đã huỷ', statuses: ['CANCELLED'] },
];

const PAGE = 10;
const MAKING: OrderStatus[] = ['PAID', 'PREPARING', 'READY'];

const time = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

/** Nhãn ngày kiểu "Hôm nay", "Hôm qua", "Thứ hai, 02/11" */
function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86_400_000);
  if (diff === 0) return 'Hôm nay';
  if (diff === 1) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' }).replace(/^./, (c) => c.toUpperCase());
}

const summary = (o: Order) => {
  const count = o.items.reduce((n, i) => n + i.qty, 0);
  const names = o.items.map((i) => (i.qty > 1 ? `${i.qty} ${i.productName}` : i.productName));
  // Một loại món thì "6 Matcha latte đá" là đủ, khỏi ghi thêm "6 món"
  return { count, text: o.items.length === 1 ? names[0] : `${count} món · ${names.join(', ')}` };
};

export default function OrdersList() {
  const { orders, error, reload } = useMyOrders();
  const [tab, setTab] = useState<Tab>('all');
  const [shown, setShown] = useState(PAGE);

  const counts = useMemo(() => {
    const c = {} as Record<Tab, number>;
    for (const t of TABS) c[t.id] = (orders ?? []).filter((o) => !t.statuses || t.statuses.includes(o.status)).length;
    return c;
  }, [orders]);

  const list = useMemo(() => {
    const statuses = TABS.find((t) => t.id === tab)?.statuses;
    return (orders ?? []).filter((o) => !statuses || statuses.includes(o.status));
  }, [orders, tab]);

  // Chia danh sách đang hiện thành từng ngày
  const groups = useMemo(() => {
    const out: { label: string; items: Order[] }[] = [];
    for (const o of list.slice(0, shown)) {
      const label = dayLabel(o.createdAt);
      const last = out[out.length - 1];
      if (last?.label === label) last.items.push(o);
      else out.push({ label, items: [o] });
    }
    return out;
  }, [list, shown]);

  if (error) {
    return (
      <div className="mt-6 flex flex-col items-center border-2 border-roast px-6 py-10 text-center">
        <AlertIcon className="h-10 w-10 text-chili" />
        <p className="mt-3 font-bold">Không tải được đơn hàng</p>
        <p className="mt-1 text-sm text-roast/65">{error}</p>
        <button type="button" onClick={reload} className="mt-5 bg-gold px-5 py-2.5 font-label text-sm font-semibold uppercase tracking-wider text-foam">
          Thử lại
        </button>
      </div>
    );
  }

  if (!orders) {
    return (
      <div className="mt-6 space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="mx-auto mt-8 max-w-md border-2 border-roast px-6 py-12 text-center">
        <ReceiptIcon className="mx-auto h-10 w-10 text-gold" />
        <h2 className="mt-4 text-xl font-extrabold">Chưa có đơn hàng nào</h2>
        <p className="mt-2 text-sm leading-relaxed text-roast/65">Đơn bạn đặt sẽ hiện ở đây, kèm mã đơn và tiến độ pha chế.</p>
        <Link href="/menu" className="mt-6 inline-flex h-11 items-center bg-gold px-6 font-label text-sm font-semibold uppercase tracking-wider text-foam">
          Đặt món đầu tiên
        </Link>
      </div>
    );
  }

  const making = orders.filter((o) => MAKING.includes(o.status));

  return (
    <div className="mt-6">
      {/* Đơn đang pha: thứ khách cần nhìn nhất */}
      {making.length > 0 && (
        <section aria-labelledby="making-title" className="mb-8">
          <h2 id="making-title" className="kicker">
            Đang làm cho bạn
          </h2>
          <ul className="mt-2 space-y-3">
            {making.map((o) => (
              <ActiveCard key={o.id} order={o} />
            ))}
          </ul>
        </section>
      )}

      {/* Tab theo trạng thái */}
      <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b-2 border-roast px-4" role="tablist" aria-label="Lọc đơn theo trạng thái">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setShown(PAGE);
            }}
            className={`-mb-0.5 shrink-0 border-b-[3px] px-3 py-2.5 font-label text-sm font-semibold uppercase tracking-wider transition-colors ${
              tab === t.id ? 'border-gold text-roast' : 'border-transparent text-roast/55 hover:text-roast'
            }`}
          >
            {t.label}
            {counts[t.id] > 0 && <span className="ml-1.5 font-mono text-xs opacity-70">{counts[t.id]}</span>}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="py-10 text-center text-roast/60">Không có đơn nào ở mục này.</p>
      ) : (
        <>
          {groups.map((g) => (
            <section key={g.label} className="mt-5">
              <h3 className="font-label text-xs font-semibold uppercase tracking-wider text-roast/55">{g.label}</h3>
              <ul className="mt-1 divide-y divide-dotted divide-roast/40 border-y border-roast/60">
                {g.items.map((o) => (
                  <OrderLine key={o.id} order={o} />
                ))}
              </ul>
            </section>
          ))}
          {list.length > shown && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="inline-flex h-11 items-center border-2 border-roast px-6 font-label text-sm font-semibold uppercase tracking-wider hover:bg-roast hover:text-cream"
              >
                Xem thêm {Math.min(PAGE, list.length - shown)} đơn
              </button>
              <p className="mt-2 text-xs text-roast/55">
                Đang hiện {shown}/{list.length} đơn
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Một dòng gọn: giờ · mã đơn · món · tiền · trạng thái; đơn chưa trả có lối tắt thanh toán tiếp */
function OrderLine({ order }: { order: Order }) {
  const { text } = summary(order);
  const unpaid = order.status === 'PENDING' || order.status === 'PAYMENT_FAILED';
  return (
    <li>
      <Link href={`/orders/${order.id}`} className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-x-3 gap-y-1 py-3 hover:bg-roast/5 sm:grid-cols-[3.25rem_1fr_auto_auto]">
        <span className="font-mono text-sm text-roast/60">{time(order.createdAt)}</span>
        <span className="min-w-0">
          <span className="font-bold">#{order.id}</span>
          <span className="block truncate text-sm text-roast/70">{text}</span>
        </span>
        <span className="text-right font-semibold tabular-nums">{formatVnd(order.total)}</span>
        <span className="col-start-2 flex items-center gap-3 whitespace-nowrap sm:col-start-auto sm:justify-end">
          <OrderStatusPill status={order.status} fulfillment={order.fulfillment} />
          {unpaid && <span className="font-label text-xs font-semibold uppercase tracking-wider text-gold underline underline-offset-4">Thanh toán tiếp</span>}
        </span>
      </Link>
    </li>
  );
}

/** Thẻ đơn đang pha: mã đơn to (đọc cho quầy), tiến độ bốn bước */
function ActiveCard({ order }: { order: Order }) {
  const { text } = summary(order);
  const at = stageIndex(order.status);
  const stages = ORDER_STAGES.map((s, i) => (i === 2 && order.fulfillment === 'DELIVERY' ? 'Đang giao hàng' : s));
  return (
    <li>
      <Link href={`/orders/${order.id}`} className="block border-2 border-roast p-4 hover:bg-roast/5 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-2xl font-bold tracking-wider">#{order.id}</p>
            <p className="mt-0.5 text-sm text-roast/70">
              {time(order.createdAt)} · {text}
            </p>
          </div>
          <OrderStatusPill status={order.status} fulfillment={order.fulfillment} />
        </div>
        <ol className="mt-4 grid grid-cols-4 gap-1" aria-label="Tiến độ đơn">
          {stages.map((s, i) => (
            <li key={s}>
              <span className={`block h-1.5 ${i <= at ? 'bg-gold' : 'bg-roast/15'}`} />
              <span className={`mt-1.5 block text-[11px] leading-tight sm:text-xs ${i === at ? 'font-semibold text-roast' : 'text-roast/50'}`}>{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 font-label text-xs font-semibold uppercase tracking-wider underline underline-offset-4">Xem chi tiết đơn →</p>
      </Link>
    </li>
  );
}
