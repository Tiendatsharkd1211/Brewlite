'use client';

// Quầy huỷ đơn đã thanh toán, chưa pha (POST /staff/orders/:id/cancel): chọn lý do, máy chủ trả món về kho,
// hoàn điểm (trả bằng điểm) hoặc ghi "cần hoàn tiền" (trả qua VNPay), báo khách kèm lý do.
import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api';

const REASONS = ['Khách đổi ý, nhờ quầy huỷ', 'Quầy hết món hoặc hết nguyên liệu', 'Máy pha gặp sự cố'];

export default function CancelOrderButton({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const { request } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel(reason: string) {
    setBusy(true);
    setError(null);
    try {
      await request(`/staff/orders/${encodeURIComponent(orderId)}/cancel`, { method: 'POST', body: { reason } });
      setOpen(false);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chưa huỷ được đơn.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 w-full text-center text-xs font-semibold text-roast/55 underline underline-offset-4 hover:text-chili">
        Huỷ đơn
      </button>
    );
  }
  return (
    <div className="mt-2 border border-chili/40 bg-chili/5 p-2">
      <p className="text-xs font-semibold text-chili">Huỷ đơn {orderId} vì:</p>
      <div className="mt-1.5 grid gap-1">
        {REASONS.map((r) => (
          <button key={r} type="button" disabled={busy} onClick={() => void cancel(r)} className="h-8 border border-roast/25 bg-cream px-2 text-left text-xs hover:border-chili hover:text-chili disabled:opacity-50">
            {r}
          </button>
        ))}
      </div>
      {error && <p className="mt-1.5 text-xs text-chili">{error}</p>}
      <button type="button" onClick={() => setOpen(false)} className="mt-1.5 text-xs text-roast/60 hover:text-roast">
        Không huỷ
      </button>
    </div>
  );
}
