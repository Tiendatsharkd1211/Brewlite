'use client';

// MÀN HÌNH TÀI KHOẢN: thẻ thành viên, giao dịch thanh toán, lịch sử đơn, đổi quà, lịch sử điểm, đăng xuất.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAppStore } from '@/context/app-store';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api';
import { REWARDS } from '@/lib/mock-data';
import { formatDateTime, formatNumber, formatVnd } from '@/lib/format';
import { tierOf } from '@/lib/pricing';
import { useMyOrders } from '@/lib/use-orders';
import type { Level, Order, SizeId, User } from '@/lib/types';
import BackendStatus from '@/components/layout/BackendStatus';
import { initialsOf } from '@/components/layout/UserMenu';
import InvoiceModal from '@/components/orders/InvoiceModal';
import RecentPayments from '@/components/payment/RecentPayments';
import Skeleton from '@/components/ui/Skeleton';
import Toast from '@/components/ui/Toast';
import { LogoutIcon } from '@/components/ui/Icons';

const TIER_STYLE = { Silver: 'bg-foam/20 text-foam', Gold: 'bg-gold text-roast', Platinum: 'bg-foam text-roast' } as const;

export default function AccountView() {
  const router = useRouter();
  const { user, request, setUser, logout } = useAuth();
  const { addManyToCart } = useAppStore();
  const { orders } = useMyOrders();
  const [invoice, setInvoice] = useState<Order | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  if (!user) return null;

  const tier = tierOf(user.points);
  const memberSince = new Date(user.createdAt).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });

  function reorder(order: Order) {
    addManyToCart(
      order.items.map((it) => ({
        productId: it.productId,
        name: it.productName,
        size: it.size as SizeId | null,
        sugar: it.sugar as Level | null,
        ice: it.ice as Level | null,
        toppingIds: it.toppingIds,
        note: it.note,
        quantity: it.qty,
        unitPrice: it.unitPrice,
      })),
    );
    router.push('/checkout');
  }

  async function redeem(rewardId: string, name: string) {
    setRedeeming(rewardId);
    try {
      setUser(await request<User>('/auth/redeem', { method: 'POST', body: { rewardId } }));
      setToast(`Đã đổi ${name}. Đưa mã thành viên cho nhân viên khi tới quầy.`);
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : 'Chưa đổi được quà, thử lại sau.');
    } finally {
      setRedeeming(null);
    }
  }

  return (
    <>
      {/* Thẻ thành viên */}
      <section className="relative mt-6 animate-rise overflow-hidden rounded-[2rem] bg-gradient-to-br from-espresso via-[#5a3e2c] to-roast p-6 text-foam shadow-[0_30px_60px_-30px_rgba(59,42,32,.8)] sm:p-8">
        <svg className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 text-foam/5" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="48" fill="currentColor" />
        </svg>
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-foam text-xl font-extrabold text-espresso">{initialsOf(user.fullName)}</span>
          <div className="min-w-0">
            <p className="text-xl font-extrabold">{user.fullName}</p>
            <p className="truncate text-sm text-foam/70">{user.email}</p>
            <p className="text-xs text-foam/55">Thành viên từ {memberSince}</p>
          </div>
          <span className={`ml-auto rounded-full px-3 py-1 text-sm font-bold ${TIER_STYLE[tier.name]}`}>Hạng {tier.name}</span>
        </div>
        <div className="relative mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-foam/70">Điểm BrewLite</p>
            <p className="text-5xl font-extrabold tabular-nums tracking-tight">{formatNumber(user.points)}</p>
          </div>
          <p className="text-right text-sm text-foam/75">Tương đương {formatVnd(user.points * 100)} khi thanh toán</p>
        </div>
        {tier.next && (
          <div className="relative">
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-foam/15">
              <div className="h-full rounded-full bg-gold transition-[width] duration-700" style={{ width: `${Math.min(100, (user.points / tier.next) * 100)}%` }} />
            </div>
            <p className="mt-2 text-sm text-foam/75">
              Còn {formatNumber(tier.next - user.points)} điểm để lên hạng {tier.name === 'Silver' ? 'Gold' : 'Platinum'}.
            </p>
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Giao dịch VNPay / điểm gần đây */}
        <RecentPayments />

        {/* Lịch sử đơn hàng */}
        <section className="rounded-3xl bg-foam p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-extrabold">Lịch sử đơn hàng</h2>
            {orders && orders.length > 0 && (
              <Link href="/orders" className="text-sm font-semibold text-espresso underline underline-offset-4">
                Xem tất cả
              </Link>
            )}
          </div>
          {!orders ? (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : orders.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-cream px-4 py-6 text-center">
              <p className="font-semibold">Chưa có đơn hàng nào</p>
              <p className="mt-1 text-sm text-roast/65">Đặt món đầu tiên để bắt đầu tích điểm.</p>
              <Link href="/menu" className="mt-4 inline-flex rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-roast">
                Xem thực đơn
              </Link>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-roast/10">
              {orders.slice(0, 5).map((o) => (
                <li key={o.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <Link href={`/orders/${o.id}`} className="font-bold hover:underline">
                      #{o.id}
                    </Link>
                    <span className="font-semibold tabular-nums">{formatVnd(o.total)}</span>
                  </div>
                  <p className="text-xs text-roast/55">
                    {formatDateTime(o.createdAt)}, {o.items.reduce((n, i) => n + i.qty, 0)} món, {o.status}
                  </p>
                  <div className="mt-2 flex gap-4 text-sm font-semibold">
                    <button type="button" onClick={() => setInvoice(o)} className="text-espresso underline underline-offset-4">
                      Xem hoá đơn
                    </button>
                    <button type="button" onClick={() => reorder(o)} className="text-espresso underline underline-offset-4">
                      Đặt lại đơn này
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Đổi quà */}
        <section className="rounded-3xl bg-foam p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">Đổi quà bằng điểm</h2>
          <ul className="mt-3 space-y-2">
            {REWARDS.map((r) => {
              const enough = user.points >= r.cost;
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3">
                  <span>
                    <span className="block font-semibold">{r.name}</span>
                    <span className="block text-xs tabular-nums text-roast/60">{formatNumber(r.cost)} điểm</span>
                  </span>
                  <button
                    type="button"
                    disabled={!enough || redeeming !== null}
                    onClick={() => redeem(r.id, r.name)}
                    className="shrink-0 rounded-full bg-gold px-4 py-2 text-sm font-bold text-roast enabled:hover:bg-gold-deep enabled:hover:text-foam disabled:cursor-not-allowed disabled:bg-roast/10 disabled:text-roast/40"
                  >
                    {redeeming === r.id ? 'Đang đổi…' : enough ? 'Đổi quà' : 'Chưa đủ điểm'}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Lịch sử điểm */}
        <section className="rounded-3xl bg-foam p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">Lịch sử tích điểm</h2>
          <ul className="mt-3 divide-y divide-roast/10">
            {user.pointsLog.slice(0, 8).map((e) => (
              <li key={e.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                <span>
                  <span className="block font-medium">{e.label}</span>
                  <span className="block text-xs text-roast/50">{formatDateTime(e.at)}</span>
                </span>
                <span className={`shrink-0 font-bold tabular-nums ${e.delta >= 0 ? 'text-leaf' : 'text-chili'}`}>
                  {e.delta >= 0 ? '+' : '−'}
                  {formatNumber(Math.abs(e.delta))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-foam p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-extrabold">Kết nối máy chủ</h2>
          <div className="mt-1">
            <BackendStatus />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push('/');
          }}
          className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-chili/40 px-5 font-semibold text-chili hover:bg-chili/10"
        >
          <LogoutIcon /> Đăng xuất
        </button>
      </section>

      <InvoiceModal order={invoice} onClose={() => setInvoice(null)} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
