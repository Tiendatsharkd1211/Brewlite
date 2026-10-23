'use client';

import { PAYMENT_METHODS, STORE } from '@/lib/mock-data';
import { describeOptions, formatDateTime, formatNumber, formatVnd } from '@/lib/format';
import type { Order } from '@/lib/types';
import Modal from '@/components/ui/Modal';
import { CloseIcon } from '@/components/ui/Icons';

/** Hoá đơn điện tử của một đơn (dữ liệu mẫu, chưa phải hoá đơn có mã của cơ quan thuế) */
export default function InvoiceModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
  return (
    <Modal open={Boolean(order)} titleId="invoice-title" onClose={onClose} wide>
      {order && (
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="invoice-title" className="text-xl font-extrabold">
                Hoá đơn điện tử
              </h2>
              <p className="text-sm text-roast/60">
                Đơn #{order.id}, {formatDateTime(order.createdAt)}, trạng thái {order.status}
              </p>
            </div>
            <button type="button" onClick={onClose} className="-m-2 rounded-full p-2 hover:bg-roast/5" aria-label="Đóng hoá đơn">
              <CloseIcon />
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-cream p-4 text-sm">
            <p className="font-bold">Công ty TNHH BrewLite (dữ liệu mẫu)</p>
            <p className="text-roast/65">{STORE.name}, {STORE.address}</p>
            <p className="text-roast/65">Thanh toán: {PAYMENT_METHODS.find((m) => m.id === order.paymentMethod)?.name}</p>
          </div>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-roast/15 text-left text-roast/60">
                <th className="py-2 font-semibold">Món</th>
                <th className="py-2 text-right font-semibold">SL</th>
                <th className="py-2 text-right font-semibold">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it) => (
                <tr key={it.id} className="border-b border-roast/10 align-top">
                  <td className="py-2 pr-2">
                    <span className="font-semibold">{it.productName}</span>
                    <span className="block text-xs text-roast/55">{describeOptions(it)}</span>
                  </td>
                  <td className="py-2 text-right tabular-nums">{it.qty}</td>
                  <td className="py-2 text-right tabular-nums">{formatVnd(it.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-roast/60">Tiền hàng</dt>
              <dd className="tabular-nums">{formatVnd(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-roast/60">{order.fulfillment === 'DELIVERY' ? 'Phí giao hàng' : 'Phí dịch vụ'}</dt>
              <dd className="tabular-nums">{order.fee ? formatVnd(order.fee) : 'Miễn phí'}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-leaf">
                <dt>Giảm giá ({order.voucherCode})</dt>
                <dd className="tabular-nums">−{formatVnd(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-roast/15 pt-2 text-base font-extrabold">
              <dt>Tổng thanh toán</dt>
              <dd className="tabular-nums text-espresso">{formatVnd(order.total)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-roast/55">
            {order.pointsUsed ? `Đã dùng ${formatNumber(order.pointsUsed)} điểm. ` : ''}
            {order.pointsEarned ? `Tích ${formatNumber(order.pointsEarned)} điểm.` : ''}
          </p>
          <button type="button" onClick={() => window.print()} className="mt-5 h-11 w-full rounded-full border-2 border-espresso font-semibold text-espresso hover:bg-espresso hover:text-foam">
            In hoá đơn
          </button>
        </div>
      )}
    </Modal>
  );
}
