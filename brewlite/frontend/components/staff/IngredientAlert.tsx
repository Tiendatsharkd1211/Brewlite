'use client';

// Quầy pha chế thấy nguyên liệu đã hết / sắp hết (GET /staff/inventory/alerts), cập nhật mỗi 30 giây.
// Kho bị trừ tự động khi quầy bấm "Bắt đầu pha", nên đây là số thật sau mỗi đơn.
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { AlertIcon } from '@/components/ui/Icons';

interface Alert {
  id: string;
  name: string;
  stock: number;
  min: number;
  unit: string;
  out: boolean;
}

export default function IngredientAlert() {
  const { status, request } = useAuth();
  const [open, setOpen] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ['inventory-alerts'],
    queryFn: () => request<Alert[]>('/staff/inventory/alerts'),
    enabled: status === 'authed',
    refetchInterval: 30_000,
  });
  if (!data.length) return null;
  const out = data.filter((a) => a.out);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex h-10 items-center gap-1.5 px-3 font-label text-xs font-semibold uppercase tracking-wider ${out.length ? 'bg-chili text-foam' : 'bg-amber-600 text-foam'}`}
      >
        <AlertIcon className="h-4 w-4" />
        {out.length ? `Hết ${out.length} nguyên liệu` : `${data.length} nguyên liệu sắp hết`}
      </button>
      {open && (
        <ul className="absolute left-0 top-11 z-20 w-72 border-2 border-roast bg-cream p-2 text-sm shadow-lg">
          {data.map((a) => (
            <li key={a.id} className="flex justify-between gap-3 py-1">
              <span>{a.name}</span>
              <span className={`shrink-0 font-semibold tabular-nums ${a.out ? 'text-chili' : 'text-amber-700'}`}>
                {a.out ? 'Hết' : `${a.stock.toLocaleString('vi-VN')} ${a.unit}`}
              </span>
            </li>
          ))}
          <li className="mt-1 border-t border-roast/20 pt-1.5 text-xs text-roast/60">Báo quản lý nhập thêm.</li>
        </ul>
      )}
    </div>
  );
}
