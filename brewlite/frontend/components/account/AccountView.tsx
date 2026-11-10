'use client';

// MÀN HÌNH TÀI KHOẢN: thẻ thành viên, giao dịch thanh toán, lịch sử đơn, đổi quà, lịch sử điểm, đăng xuất.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/context/app-store';
import { useAuth } from '@/context/auth-context';
import { useRedeem } from '@/lib/redeem';
import { REWARDS } from '@/lib/mock-data';
import { formatDateTime, formatNumber, formatVnd } from '@/lib/format';
import { tierOf } from '@/lib/pricing';
import { useMyOrders } from '@/lib/use-orders';
import type { Level, Order, SizeId } from '@/lib/types';
import { initialsOf } from '@/components/layout/UserMenu';
import InvoiceModal from '@/components/orders/InvoiceModal';
import OrderStatusPill from '@/components/orders/OrderStatusPill';
import Skeleton from '@/components/ui/Skeleton';
import Toast from '@/components/ui/Toast';
import PhoneField from './PhoneField';
import ChangePassword from '@/components/auth/ChangePassword';
import { LogoutIcon } from '@/components/ui/Icons';

/** Số quà đổi được ngay và số dòng lịch sử điểm hiện sẵn, phần còn lại thu gọn */
const READY_SHOWN = 3;
const LOG_SHOWN = 5;

export default function AccountView() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { addManyToCart } = useAppStore();
  const { orders } = useMyOrders();
  const [invoice, setInvoice] = useState<Order | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [changingPw, setChangingPw] = useState(false);
  const { redeem: redeemReward, redeeming } = useRedeem();
  const [showAllLog, setShowAllLog] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(null), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  if (!user) return null;

  const tier = tierOf(user.points);
  // Quà đủ điểm: món giá trị cao xếp trước; quà kế tiếp là món rẻ nhất còn thiếu điểm
  const ready = REWARDS.filter((r) => r.cost <= user.points).sort((a, b) => b.cost - a.cost);
  const next = REWARDS.filter((r) => r.cost > user.points).sort((a, b) => a.cost - b.cost)[0];
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

  // Bấm "Đổi quà" lần đầu chỉ hỏi lại, bấm lần nữa mới trừ điểm (giống trang Ưu đãi)
  async function redeem(rewardId: string) {
    if (confirming !== rewardId) {
      setConfirming(rewardId);
      return;
    }
    setConfirming(null);
    const error = await redeemReward(rewardId);
    if (error) setToast(error);
  }

  return (
    <>
      {/* Thẻ hội viên: in như thẻ báo dài hạn, viền đôi, số điểm chữ máy đánh */}
      <section className="relative mt-6 animate-rise border-[3px] border-double border-roast bg-foam p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center border-2 border-roast font-display text-2xl font-black">{initialsOf(user.fullName)}</span>
          <div className="min-w-0">
            <p className="kicker">Thẻ hội viên BrewLite</p>
            <p className="font-display text-2xl font-black leading-tight">{user.fullName}</p>
            <p className="truncate text-sm text-roast/70">
              {user.email} · thành viên từ {memberSince}
            </p>
            <PhoneField />
          </div>
          <span className="stamp ml-auto text-sm text-gold">Hạng {tier.name}</span>
        </div>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-roast pt-4">
          <div>
            <p className="font-label text-xs uppercase tracking-wider text-roast/60">Điểm hiện có</p>
            <p className="text-5xl font-semibold tabular-nums tracking-tight">{formatNumber(user.points)}</p>
          </div>
          <p className="text-right text-sm text-roast/75">Tương đương {formatVnd(user.points * 100)} khi thanh toán</p>
        </div>
        {tier.next && (
          <div>
            <div className="mt-4 h-2 border border-roast">
              <div className="h-full bg-gold transition-[width] duration-700" style={{ width: `${Math.min(100, (user.points / tier.next) * 100)}%` }} />
            </div>
            <p className="mt-2 text-sm text-roast/75">
              Còn {formatNumber(tier.next - user.points)} điểm để lên hạng {tier.name === 'Silver' ? 'Gold' : 'Platinum'}.
            </p>
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Đơn hàng gần đây: khách chỉ cần nhìn đơn và trạng thái; các lần trả tiền chi tiết nằm ở Lịch sử giao dịch */}
        <section className="rounded-3xl bg-foam p-5 sm:p-6 lg:col-span-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-extrabold">Đơn hàng gần đây</h2>
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
              {orders.slice(0, 5).map((o) => {
                const unpaid = o.status === 'PENDING' || o.status === 'PAYMENT_FAILED';
                return (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <Link href={`/orders/${o.id}`} className="font-bold hover:underline">
                          #{o.id}
                        </Link>
                        <OrderStatusPill status={o.status} fulfillment={o.fulfillment} />
                      </div>
                      <p className="mt-0.5 text-xs text-roast/55">
                        {formatDateTime(o.createdAt)} · {o.items.reduce((n, i) => n + i.qty, 0)} món
                      </p>
                    </div>
                    <div className="flex items-center gap-5">
                      <span className="font-semibold tabular-nums">{formatVnd(o.total)}</span>
                      <div className="flex gap-4 text-sm font-semibold">
                        {unpaid ? (
                          // Đơn chưa trả xong: việc cần làm là thanh toán tiếp (hoặc huỷ) ở trang đơn
                          <Link href={`/orders/${o.id}`} className="font-label uppercase tracking-wider text-gold underline underline-offset-4">
                            Thanh toán tiếp
                          </Link>
                        ) : (
                          o.status !== 'CANCELLED' && (
                            <button type="button" onClick={() => setInvoice(o)} className="text-espresso underline underline-offset-4">
                              Hoá đơn
                            </button>
                          )
                        )}
                        <button type="button" onClick={() => reorder(o)} className="text-espresso underline underline-offset-4">
                          Đặt lại
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Đổi quà: chỉ tóm tắt quà đổi được ngay và quà kế tiếp; danh sách đầy đủ ở trang Ưu đãi */}
        <section id="doi-qua" className="scroll-mt-36 rounded-3xl bg-foam p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-extrabold">Đổi quà bằng điểm</h2>
            <span className="text-sm text-roast/60">
              Bạn có <b className="tabular-nums text-roast">{formatNumber(user.points)}</b> điểm
            </span>
          </div>

          {ready.length > 0 ? (
            <>
              <p className="kicker mt-4">Đổi được ngay</p>
              <ul className="mt-2 space-y-2">
                {ready.slice(0, READY_SHOWN).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3">
                    <span>
                      <span className="block font-semibold">{r.name}</span>
                      <span className="block text-xs tabular-nums text-roast/60">{formatNumber(r.cost)} điểm</span>
                    </span>
                    <button
                      type="button"
                      disabled={redeeming !== null}
                      onClick={() => redeem(r.id)}
                      className="shrink-0 rounded-full bg-gold px-4 py-2 text-sm font-bold text-foam enabled:hover:bg-gold-deep disabled:opacity-50"
                    >
                      {redeeming === r.id ? 'Đang đổi…' : confirming === r.id ? `Bấm lần nữa: trừ ${formatNumber(r.cost)} điểm` : 'Đổi quà'}
                    </button>
                  </li>
                ))}
              </ul>
              {ready.length > READY_SHOWN && <p className="mt-2 text-sm text-roast/60">Và {ready.length - READY_SHOWN} quà khác bạn cũng đủ điểm.</p>}
            </>
          ) : (
            <p className="mt-4 text-sm text-roast/70">Chưa đủ điểm cho món quà nào. Mỗi 1.000đ trả qua VNPay được cộng 1 điểm.</p>
          )}

          {next && (
            <div className="mt-4 rounded-2xl border-2 border-dashed border-roast/30 px-4 py-3">
              <p className="kicker">Quà kế tiếp</p>
              <p className="mt-1 font-semibold">{next.name}</p>
              <div className="mt-2 h-2 overflow-hidden bg-roast/10" role="progressbar" aria-valuemin={0} aria-valuemax={next.cost} aria-valuenow={user.points} aria-label={`Tiến độ tới ${next.name}`}>
                <div className="h-full bg-gold" style={{ width: `${Math.min(100, (user.points / next.cost) * 100)}%` }} />
              </div>
              <p className="mt-1 text-xs tabular-nums text-roast/60">
                {formatNumber(user.points)} / {formatNumber(next.cost)} điểm · còn thiếu {formatNumber(next.cost - user.points)}
              </p>
            </div>
          )}

          <Link href="/uu-dai#rewards-title" className="mt-4 inline-block font-label text-xs font-semibold uppercase tracking-wider underline underline-offset-4 hover:text-gold">
            Xem tất cả {REWARDS.length} quà →
          </Link>
        </section>

        {/* Lịch sử điểm: 5 dòng mới nhất, bấm Xem thêm để mở hết */}
        <section className="rounded-3xl bg-foam p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">Lịch sử tích điểm</h2>
          <ul className="mt-3 divide-y divide-roast/10">
            {(showAllLog ? user.pointsLog : user.pointsLog.slice(0, LOG_SHOWN)).map((e) => (
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
          {user.pointsLog.length > LOG_SHOWN && (
            <button type="button" onClick={() => setShowAllLog((v) => !v)} className="mt-2 font-label text-xs font-semibold uppercase tracking-wider underline underline-offset-4 hover:text-gold">
              {showAllLog ? 'Thu gọn' : `Xem thêm ${user.pointsLog.length - LOG_SHOWN} dòng`}
            </button>
          )}
        </section>
      </div>

      <div className="mt-8 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => setChangingPw(true)} className="inline-flex h-11 items-center gap-2 border-2 border-roast px-5 font-semibold hover:bg-roast hover:text-cream">
          Đổi mật khẩu
        </button>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push('/');
          }}
          className="inline-flex h-11 items-center gap-2 border-2 border-chili px-5 font-semibold text-chili hover:bg-chili hover:text-foam"
        >
          <LogoutIcon /> Đăng xuất
        </button>
      </div>

      <InvoiceModal order={invoice} onClose={() => setInvoice(null)} />
      <ChangePassword open={changingPw} onClose={() => setChangingPw(false)} onDone={() => setToast('Đã đổi mật khẩu. Các máy khác đã bị đăng xuất.')} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
