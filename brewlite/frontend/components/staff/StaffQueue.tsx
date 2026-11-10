'use client';

// MÀN HÌNH QUẦY PHA CHẾ: phiếu đơn chia 3 làn theo trạng thái, nhân viên bấm để chuyển bước.
// Phiếu đổi màu theo thời gian chờ, tích từng món đã pha, bên phải là tổng món cần pha và đơn vừa giao.
// Quyền do backend quyết định (GET/POST /staff/orders trả 403 nếu không phải STAFF); kiểm tra role ở đây chỉ để hiện giao diện cho đúng.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api';
import { describeOptions, formatClock } from '@/lib/format';
import { matchText } from '@/lib/search';
import type { OrderStatus, StaffOrder } from '@/lib/types';
import Skeleton from '@/components/ui/Skeleton';
import IngredientAlert from './IngredientAlert';
import CancelOrderButton from './CancelOrderButton';
import { AlertIcon, BagIcon, BellIcon, CheckIcon, CupIcon, LockIcon, PinIcon, SearchIcon } from '@/components/ui/Icons';

type Lane = { status: OrderStatus; title: string; action: string; empty: string };
const LANES: Lane[] = [
  { status: 'PAID', title: 'Chờ pha', action: 'Bắt đầu pha', empty: 'Chưa có đơn mới' },
  { status: 'PREPARING', title: 'Đang pha', action: 'Pha xong', empty: 'Chưa pha đơn nào' },
  { status: 'READY', title: 'Chờ khách lấy', action: 'Đã giao khách', empty: 'Không có đơn chờ lấy' },
];
type Kind = 'all' | 'PICKUP' | 'DELIVERY';
interface Handed {
  id: string;
  name: string;
  cups: number;
  at: number;
  waited: number;
}

const WARN_MIN = 5;
const LATE_MIN = 10;
const cups = (o: StaffOrder) => o.items.reduce((n, it) => n + it.qty, 0);
const minutesSince = (ts: string, now: number) => Math.max(0, (now - new Date(ts).getTime()) / 60000);
function elapsed(ts: string, now: number) {
  const s = Math.max(0, Math.floor((now - new Date(ts).getTime()) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`;
}
const toneOf = (min: number) => (min >= LATE_MIN ? 'late' : min >= WARN_MIN ? 'warn' : 'ok');
const HEAD = { ok: 'bg-roast text-cream', warn: 'bg-amber-600 text-foam', late: 'bg-chili text-foam' } as const;
const EDGE = { ok: 'border-roast', warn: 'border-amber-600', late: 'border-chili' } as const;

/** Tiếng "ding" ngắn khi có đơn mới */
function ding() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    for (const [f, t] of [
      [880, 0],
      [1320, 0.14],
    ]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.4);
    }
  } catch {
    /* trình duyệt chặn âm thanh thì thôi */
  }
}

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function Ticket({
  order,
  lane,
  now,
  fresh,
  busy,
  done,
  onToggle,
  onAdvance,
  onChanged,
}: {
  order: StaffOrder;
  lane: Lane;
  now: number;
  fresh: boolean;
  busy: boolean;
  done: Set<string>;
  onToggle: (itemId: string) => void;
  onAdvance: () => void;
  onChanged: () => void;
}) {
  // Phiếu chờ lấy thì không cần báo động nữa
  const tone = lane.status === 'READY' ? 'ok' : toneOf(minutesSince(order.createdAt, now));
  const pickup = order.fulfillment === 'PICKUP';
  const canTick = lane.status === 'PREPARING';
  const left = order.items.filter((it) => !done.has(it.id)).length;
  return (
    <li className={`animate-rise flex flex-col border-2 bg-foam ${EDGE[tone]}`}>
      <div className={`flex items-center justify-between gap-2 px-3 py-2 ${lane.status === 'READY' ? 'bg-leaf text-foam' : HEAD[tone]}`}>
        <span className="flex items-center gap-2">
          <span className="font-label text-xl font-semibold leading-none tracking-wide">#{order.id}</span>
          {fresh && <span className="bg-foam px-1.5 py-0.5 font-label text-[10px] font-semibold uppercase tracking-wider text-roast">Mới</span>}
        </span>
        <span className="font-mono text-lg font-semibold leading-none tabular-nums" title="Thời gian từ lúc khách đặt">
          {elapsed(order.createdAt, now)}
        </span>
      </div>

      <div className="flex items-start justify-between gap-2 border-b border-roast/15 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate font-semibold">{order.user.fullName}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-roast/65">
            {pickup ? (
              <>
                <BagIcon className="h-3.5 w-3.5 shrink-0" /> {/^\d/.test(order.pickupTime) ? `Hẹn lấy ${order.pickupTime}` : order.pickupTime}
              </>
            ) : (
              <>
                <PinIcon className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{order.address}</span>
              </>
            )}
          </p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 font-label text-[10px] font-semibold uppercase tracking-wider ${pickup ? 'border border-roast' : 'bg-roast text-cream'}`}>
          {pickup ? 'Tại quầy' : 'Giao hàng'}
        </span>
      </div>

      <ul className="flex-1 divide-y divide-dashed divide-roast/20 px-3">
        {order.items.map((it) => {
          const ticked = done.has(it.id);
          const opts = describeOptions(it);
          const body = (
            <>
              <span className={`grid h-7 min-w-7 shrink-0 place-items-center px-1 font-label text-sm font-semibold tabular-nums ${ticked ? 'bg-leaf text-foam' : 'bg-roast text-cream'}`}>
                {ticked ? <CheckIcon className="h-4 w-4" /> : it.qty}
              </span>
              <span className={`min-w-0 flex-1 text-left ${ticked ? 'text-roast/45 line-through' : ''}`}>
                <span className="block font-semibold leading-snug">{it.productName}</span>
                {opts && <span className="mt-0.5 block text-xs text-roast/65">{opts}</span>}
                {it.note && <span className="mt-1 block border-l-2 border-chili bg-chili/[0.07] px-2 py-1 text-xs font-semibold text-chili">{it.note}</span>}
              </span>
            </>
          );
          return (
            <li key={it.id}>
              {canTick ? (
                <button type="button" onClick={() => onToggle(it.id)} aria-pressed={ticked} className="plain-btn flex w-full items-start gap-2.5 py-2.5 hover:bg-roast/[0.03]">
                  {body}
                </button>
              ) : (
                <div className="flex items-start gap-2.5 py-2.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="border-t border-roast/15 p-3">
        <div className="mb-2 flex justify-between text-xs text-roast/60">
          <span>Đặt lúc {formatClock(order.createdAt)}</span>
          <span className="[font-variant-numeric:tabular-nums]">{canTick ? `Còn ${left}/${order.items.length} món` : `${cups(order)} ly`}</span>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onAdvance}
          className={`h-11 w-full font-label text-sm font-semibold uppercase tracking-wider disabled:opacity-60 ${
            lane.status === 'READY' ? 'bg-leaf text-foam hover:opacity-90' : lane.status === 'PREPARING' ? 'bg-roast text-cream hover:bg-espresso' : 'bg-gold hover:bg-gold-deep'
          }`}
        >
          {busy ? 'Đang cập nhật…' : lane.action}
        </button>
        {lane.status === 'PAID' && <CancelOrderButton orderId={order.id} onDone={onChanged} />}
      </div>
    </li>
  );
}

function Metric({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="min-w-0 px-4 py-1 sm:border-l-2 sm:border-roast/15 sm:first:border-l-0 sm:first:pl-0">
      <p className="font-label text-[11px] font-semibold uppercase tracking-wider text-roast/55">{label}</p>
      <p className={`mt-1 whitespace-nowrap font-label text-3xl font-semibold leading-none [font-variant-numeric:tabular-nums] ${tone ?? ''}`}>{value}</p>
    </div>
  );
}

export default function StaffQueue() {
  const { user, request } = useAuth();
  const isStaff = user?.role === 'STAFF';
  const now = useNow();
  const [orders, setOrders] = useState<StaffOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>('all');
  const [q, setQ] = useState('');
  const [mobileLane, setMobileLane] = useState<OrderStatus>('PAID');
  const [ticked, setTicked] = useState<Record<string, Set<string>>>({});
  const [handed, setHanded] = useState<Handed[]>([]);
  const [fresh, setFresh] = useState<Record<string, number>>({});
  const [sound, setSound] = useState(true);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    try {
      if (localStorage.getItem('brewlite.counter.sound') === '0') setSound(false);
    } catch {}
  }, []);
  function toggleSound() {
    const next = !sound;
    setSound(next);
    try {
      localStorage.setItem('brewlite.counter.sound', next ? '1' : '0');
    } catch {}
  }

  const load = useCallback(async () => {
    try {
      const list = await request<StaffOrder[]>('/staff/orders');
      // Đơn chưa thấy lần nào: gắn nhãn "Mới" trong 1 phút và kêu chuông (bỏ qua lần tải đầu)
      const ids = list.map((o) => o.id);
      const before = seen.current;
      if (before) {
        const added = ids.filter((id) => !before.has(id));
        if (added.length) {
          setFresh((f) => ({ ...f, ...Object.fromEntries(added.map((id) => [id, Date.now()])) }));
          if (soundRef.current) ding();
        }
      }
      seen.current = new Set(ids);
      setOrders(list);
      setSyncedAt(Date.now());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được hàng đợi.');
    }
  }, [request]);

  // Cứ 5 giây hỏi lại để thấy đơn mới khách vừa thanh toán
  useEffect(() => {
    if (!isStaff) return;
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [isStaff, load]);

  async function advance(o: StaffOrder) {
    setBusyId(o.id);
    setActionError(null);
    try {
      await request<StaffOrder>(`/staff/orders/${encodeURIComponent(o.id)}/advance`, { method: 'POST' });
      if (o.status === 'READY') setHanded((h) => [{ id: o.id, name: o.user.fullName, cups: cups(o), at: Date.now(), waited: minutesSince(o.createdAt, Date.now()) }, ...h].slice(0, 30));
    } catch (err) {
      // Đơn có thể vừa bị nhân viên khác chuyển bước hoặc khách huỷ
      setActionError(err instanceof ApiError ? err.message : 'Chưa cập nhật được đơn.');
    } finally {
      await load();
      setBusyId(null);
    }
  }

  function toggleItem(orderId: string, itemId: string) {
    setTicked((t) => {
      const s = new Set(t[orderId]);
      if (s.has(itemId)) s.delete(itemId);
      else s.add(itemId);
      return { ...t, [orderId]: s };
    });
  }

  const visible = useMemo(
    () =>
      (orders ?? [])
        .filter((o) => kind === 'all' || o.fulfillment === kind)
        .filter((o) => !q.trim() || matchText(`${o.id} ${o.user.fullName}`, q.trim()))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [orders, kind, q],
  );

  // Tổng số ly từng món còn phải pha (đơn chờ pha + đang pha, bỏ món đã tích)
  const allDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders ?? []) {
      if (o.status !== 'PAID' && o.status !== 'PREPARING') continue;
      for (const it of o.items) if (!ticked[o.id]?.has(it.id)) m.set(it.productName, (m.get(it.productName) ?? 0) + it.qty);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [orders, ticked]);

  if (!isStaff) {
    return (
      <div className="mx-auto mt-8 max-w-md border-2 border-roast bg-foam px-6 py-10 text-center">
        <LockIcon className="mx-auto h-10 w-10 text-gold" />
        <h2 className="mt-4 text-xl font-extrabold">Bạn không có quyền vào quầy</h2>
        <p className="mt-2 text-sm text-roast/65">Trang này chỉ dành cho tài khoản nhân viên.</p>
      </div>
    );
  }

  if (error && !orders) {
    return (
      <div className="mt-6 flex flex-col items-center border-2 border-roast bg-foam px-6 py-10 text-center">
        <AlertIcon className="h-10 w-10 text-chili" />
        <p className="mt-3 font-bold">Không tải được hàng đợi</p>
        <p className="mt-1 text-sm text-roast/65">{error}</p>
        <button type="button" onClick={load} className="mt-5 h-10 bg-gold px-5 font-label text-xs font-semibold uppercase tracking-wider">
          Thử lại
        </button>
      </div>
    );
  }

  if (!orders) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-16" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      </div>
    );
  }

  const byLane = (s: OrderStatus) => visible.filter((o) => o.status === s);
  const count = (s: OrderStatus) => orders.filter((o) => o.status === s).length;
  const active = orders.filter((o) => o.status === 'PAID' || o.status === 'PREPARING');
  const oldest = active.reduce((m, o) => Math.max(m, minutesSince(o.createdAt, now)), 0);
  const late = active.filter((o) => minutesSince(o.createdAt, now) >= LATE_MIN).length;
  const avgWait = handed.length ? handed.reduce((n, h) => n + h.waited, 0) / handed.length : 0;
  const offline = !!error || (syncedAt !== null && now - syncedAt > 15000);
  const clock = new Date(now);
  const filtered = !!q.trim() || kind !== 'all';

  return (
    <div>
      {/* Đầu màn hình: tên khu, giờ, trạng thái kết nối */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-roast pb-3">
        <div>
          <p className="font-label text-xs font-semibold uppercase tracking-[0.2em] text-roast/55">{clock.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}</p>
          <h1 className="text-3xl font-black leading-tight">Quầy pha chế</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className={`flex items-center gap-2 text-sm ${offline ? 'text-chili' : 'text-roast/65'}`}>
            <span className={`keep-round h-2 w-2 rounded-full ${offline ? 'bg-chili' : 'animate-pulse bg-leaf'}`} aria-hidden="true" />
            {offline ? 'Mất kết nối, đang thử lại' : 'Đang nhận đơn'}
          </span>
          <span className="font-mono text-3xl font-semibold leading-none tabular-nums">{clock.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      </div>

      {/* Số liệu ca */}
      <div className="grid grid-cols-2 gap-y-3 border-b border-roast/15 py-3 sm:flex sm:flex-wrap sm:gap-y-3">
        <Metric label="Chờ pha" value={count('PAID')} />
        <Metric label="Đang pha" value={count('PREPARING')} />
        <Metric label="Chờ lấy" value={count('READY')} />
        <Metric label="Chờ lâu nhất" value={active.length ? `${Math.floor(oldest)} phút` : '—'} tone={oldest >= LATE_MIN ? 'text-chili' : oldest >= WARN_MIN ? 'text-amber-700' : ''} />
        <Metric label="Đã giao ca này" value={handed.length} />
        <Metric label="Trung bình mỗi đơn" value={handed.length ? `${avgWait.toFixed(1).replace('.', ',')} phút` : '—'} />
      </div>

      {/* Thanh công cụ */}
      <div className="flex flex-wrap items-center gap-2 py-3">
        <div className="flex border-2 border-roast" role="group" aria-label="Loại đơn">
          {(
            [
              ['all', 'Tất cả'],
              ['PICKUP', 'Tại quầy'],
              ['DELIVERY', 'Giao hàng'],
            ] as [Kind, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`h-9 px-3 font-label text-xs font-semibold uppercase tracking-wider ${kind === k ? 'bg-roast text-cream' : 'hover:bg-roast/10'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <span className="sr-only">Tìm đơn</span>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-roast/45" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Mã đơn hoặc tên khách"
            className="h-10 w-full border-2 border-roast/30 bg-foam pl-9 pr-3 text-sm focus:border-roast focus:outline-none"
          />
        </label>
        {late > 0 && (
          <span className="flex h-10 items-center gap-1.5 bg-chili px-3 font-label text-xs font-semibold uppercase tracking-wider text-foam">
            <AlertIcon className="h-4 w-4" /> {late} đơn chờ quá {LATE_MIN} phút
          </span>
        )}
        <IngredientAlert />
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={sound}
          className={`ml-auto inline-flex h-10 items-center gap-2 border-2 px-3 font-label text-xs font-semibold uppercase tracking-wider ${sound ? 'border-roast' : 'border-roast/30 text-roast/50'}`}
        >
          <BellIcon className="h-4 w-4" /> {sound ? 'Chuông bật' : 'Chuông tắt'}
        </button>
      </div>

      {actionError && (
        <p role="alert" className="mb-3 flex items-start gap-2 border-l-4 border-chili bg-chili/10 px-4 py-3 text-sm text-chili">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" /> {actionError}
        </p>
      )}

      {/* Điện thoại: chọn làn */}
      <div className="mb-3 grid grid-cols-3 border-2 border-roast md:hidden">
        {LANES.map((l) => (
          <button
            key={l.status}
            type="button"
            onClick={() => setMobileLane(l.status)}
            className={`h-10 px-1 font-label text-[11px] font-semibold uppercase tracking-wider ${mobileLane === l.status ? 'bg-roast text-cream' : ''}`}
          >
            {l.title} ({byLane(l.status).length})
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid min-w-0 gap-4 md:grid-cols-3">
          {LANES.map((lane) => {
            const list = byLane(lane.status);
            return (
              <section key={lane.status} aria-label={lane.title} className={`min-w-0 ${mobileLane === lane.status ? '' : 'hidden md:block'}`}>
                <h2 className="flex items-center justify-between border-b-[3px] border-double border-roast pb-1.5">
                  <span className="font-label text-sm font-semibold uppercase tracking-wider">{lane.title}</span>
                  <span className="grid h-6 min-w-6 place-items-center bg-roast px-1.5 font-label text-xs font-semibold tabular-nums text-cream">{list.length}</span>
                </h2>
                {list.length === 0 ? (
                  <div className="mt-3 grid h-40 place-items-center border-2 border-dashed border-roast/25 text-center text-sm text-roast/50">
                    <span>
                      <CupIcon className="mx-auto mb-2 h-6 w-6" />
                      {filtered ? 'Không có đơn khớp bộ lọc' : lane.empty}
                    </span>
                  </div>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {list.map((o) => (
                      <Ticket
                        key={o.id}
                        order={o}
                        lane={lane}
                        now={now}
                        fresh={!!fresh[o.id] && now - fresh[o.id] < 60000}
                        busy={busyId === o.id}
                        done={ticked[o.id] ?? new Set()}
                        onToggle={(itemId) => toggleItem(o.id, itemId)}
                        onAdvance={() => advance(o)}
                        onChanged={() => void load()}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        {/* Cột phải: tổng món cần pha + đơn vừa giao */}
        <aside className="grid content-start gap-5 md:grid-cols-2 xl:grid-cols-1">
          <section className="border-2 border-roast bg-foam">
            <h2 className="flex items-center justify-between bg-roast px-3 py-2 font-label text-sm font-semibold uppercase tracking-wider text-cream">
              Cần pha
              <span className="tabular-nums">{allDay.reduce((n, [, c]) => n + c, 0)} ly</span>
            </h2>
            {allDay.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-roast/55">Đã pha hết, quầy đang rảnh.</p>
            ) : (
              <ul className="divide-y divide-roast/10">
                {allDay.map(([name, n]) => (
                  <li key={name} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate">{name}</span>
                    <span className="font-label text-base font-semibold tabular-nums">×{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border-2 border-roast/25 bg-foam">
            <h2 className="border-b border-roast/15 px-3 py-2 font-label text-sm font-semibold uppercase tracking-wider">Vừa giao</h2>
            {handed.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-roast/55">Chưa giao đơn nào trong ca.</p>
            ) : (
              <ul className="max-h-80 divide-y divide-roast/10 overflow-y-auto">
                {handed.map((h) => (
                  <li key={`${h.id}-${h.at}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <CheckIcon className="h-4 w-4 shrink-0 text-leaf" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">#{h.id}</span>
                      <span className="block truncate text-xs text-roast/60">
                        {h.name} · {h.cups} ly
                      </span>
                    </span>
                    <span className="text-right text-xs text-roast/60 [font-variant-numeric:tabular-nums]">
                      {formatClock(h.at)}
                      <span className="block">{Math.round(h.waited)} phút</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-roast/60 md:col-span-2 xl:col-span-1">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 bg-roast" /> Dưới {WARN_MIN} phút
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 bg-amber-600" /> {WARN_MIN}–{LATE_MIN} phút
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 bg-chili" /> Quá {LATE_MIN} phút
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 bg-leaf" /> Xong, chờ lấy
            </span>
          </p>
        </aside>
      </div>
    </div>
  );
}
