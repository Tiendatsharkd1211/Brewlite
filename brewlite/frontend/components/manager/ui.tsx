'use client';

// Mảnh giao diện dùng chung cho khu Quản lý: đầu trang, ô số liệu, nhãn trạng thái tồn, hộp thoại chi tiết
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { STATE_LABEL, STATE_TONE, type StockState } from '@/lib/inventory';
import { CloseIcon } from '@/components/ui/Icons';

export const btnSolid = 'inline-flex h-10 items-center justify-center gap-1.5 bg-gold px-4 font-label text-xs font-semibold uppercase tracking-wider text-foam hover:bg-gold-deep disabled:opacity-50';
export const btnInk = 'inline-flex h-10 items-center justify-center gap-1.5 bg-roast px-4 font-label text-xs font-semibold uppercase tracking-wider text-cream hover:bg-espresso disabled:opacity-50';
export const btnLine =
  'inline-flex h-10 items-center justify-center gap-1.5 border-2 border-roast px-4 font-label text-xs font-semibold uppercase tracking-wider hover:bg-roast hover:text-cream disabled:opacity-50';
export const input = 'h-10 w-full border-2 border-roast/30 bg-cream px-3 text-sm focus:border-roast focus:outline-none';
/** Ô chọn gọn theo nội dung, dùng trong hàng bộ lọc */
export const select = 'h-10 border-2 border-roast/30 bg-cream px-3 text-sm focus:border-roast focus:outline-none';

export function PageHead({ kicker, title, lead, actions }: { kicker?: string; title: string; lead?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-roast pb-4">
      <div>
        {kicker && <p className="kicker">{kicker}</p>}
        <h1 className="mt-1 text-3xl font-black leading-tight sm:text-4xl">{title}</h1>
        {lead && <p className="mt-1 max-w-2xl text-sm text-roast/70">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: string }) {
  return (
    <div className="border-2 border-roast bg-cream p-4">
      <p className="font-label text-[11px] font-semibold uppercase tracking-wider text-roast/60">{label}</p>
      <p className={`mt-1 whitespace-nowrap font-display text-xl font-black leading-none tabular-nums sm:text-2xl xl:text-3xl ${tone ?? ''}`}>{value}</p>
      {hint && <p className="mt-1.5 text-xs text-roast/65">{hint}</p>}
    </div>
  );
}

export function StateText({ state }: { state: StockState }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold ${STATE_TONE[state]}`}>
      <span className={`keep-round h-2 w-2 rounded-full ${state === 'ok' ? 'bg-leaf' : state === 'low' ? 'bg-amber-600' : 'bg-chili'}`} aria-hidden="true" />
      {STATE_LABEL[state]}
    </span>
  );
}

/** Hộp thoại giữa màn hình để xem chi tiết, chỉnh sửa mà không rời trang (điện thoại: trượt lên từ đáy) */
export function DetailDialog({ open, title, onClose, children, footer, wide }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-roast/50 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[92vh] w-full flex-col ${wide ? 'max-w-5xl' : 'max-w-2xl'} border-2 border-roast bg-cream shadow-[0_30px_80px_-30px_rgba(59,42,32,.7)]`}
      >
        <div className="flex items-center justify-between gap-3 border-b-2 border-roast px-5 py-4">
          <h2 className="font-display text-2xl font-black leading-tight">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="grid h-10 w-10 place-items-center hover:bg-roast/5">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t-2 border-roast px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function FieldLabel({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="font-label text-xs uppercase tracking-wider text-roast/70">{label}</span>
      <span className="mt-1 block">{children}</span>
      {hint && <span className="mt-1 block text-xs text-roast/55">{hint}</span>}
    </label>
  );
}

/** Công tắc bật/tắt (ẩn món, chạy mã, bật thông báo) */
export function Toggle({ on, onChange, label, size = 'md' }: { on: boolean; onChange: (v: boolean) => void; label: string; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
  const knob = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const shift = size === 'sm' ? 'translate-x-4' : 'translate-x-5';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
      className={`relative inline-flex shrink-0 items-center border-2 border-roast transition-colors ${box} ${on ? 'bg-leaf' : 'bg-cream'}`}
    >
      <span className={`absolute left-0.5 transition-transform ${knob} ${on ? `${shift} bg-cream` : 'bg-roast'}`} />
    </button>
  );
}

/** Nhãn trạng thái nhỏ có viền */
export function Chip({ tone = 'ink', children }: { tone?: 'ink' | 'ok' | 'warn' | 'bad' | 'mute'; children: ReactNode }) {
  const cls = { ink: 'border-roast text-roast', ok: 'border-leaf text-leaf', warn: 'border-amber-700 text-amber-700', bad: 'border-chili text-chili', mute: 'border-roast/40 text-roast/55' }[tone];
  return <span className={`inline-flex items-center whitespace-nowrap border px-1.5 py-px font-label text-[10px] font-semibold uppercase tracking-wider ${cls}`}>{children}</span>;
}

export const textarea = 'w-full border-2 border-roast/30 bg-cream px-3 py-2 text-sm leading-relaxed focus:border-roast focus:outline-none';

// ----- Khung bảng dữ liệu dùng chung cho các trang kho -----

/** Số trong bảng: chữ thường, các chữ số cùng bề rộng để cột thẳng hàng */
export const num = 'whitespace-nowrap [font-variant-numeric:tabular-nums]';

/** Khung chứa bảng: viền mảnh, thanh công cụ phía trên, chân bảng phía dưới */
export function Panel({ toolbar, footer, children, className = '' }: { toolbar?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`border border-roast/25 bg-foam ${className}`}>
      {toolbar && <div className="flex flex-wrap items-center gap-2 border-b border-roast/15 p-3">{toolbar}</div>}
      {children}
      {footer && <div className="border-t border-roast/15 px-4 py-3">{footer}</div>}
    </section>
  );
}

/** Lớp chữ cho bảng: đầu bảng nền nhạt, hàng cao đều, rê chuột sáng nhẹ */
export const th = 'bg-roast/[0.04] px-4 py-2.5 text-left font-label text-[11px] font-semibold uppercase tracking-wider text-roast/55';
export const td = 'px-4 py-3 align-middle';
export const tr = 'border-t border-roast/10 hover:bg-roast/[0.03]';

/** Nhãn trạng thái tồn có nền nhạt */
export function StockBadge({ state }: { state: StockState }) {
  const cls = { ok: 'bg-leaf/10 text-leaf', low: 'bg-amber-600/10 text-amber-700', out: 'bg-chili/10 text-chili' }[state];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2 py-0.5 text-xs font-semibold ${cls}`}>
      <span className={`keep-round h-1.5 w-1.5 rounded-full ${state === 'ok' ? 'bg-leaf' : state === 'low' ? 'bg-amber-600' : 'bg-chili'}`} aria-hidden="true" />
      {STATE_LABEL[state]}
    </span>
  );
}

/** Chia trang: "1–10 trên 25" và hai nút trước/sau */
export function Pager({ page, size, total, onPage }: { page: number; size: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (total <= size) return <p className="text-xs text-roast/55">{total} dòng</p>;
  const from = page * size + 1;
  const to = Math.min(total, from + size - 1);
  const btn = 'grid h-8 w-8 place-items-center border border-roast/25 text-sm hover:bg-roast/5 disabled:opacity-35';
  return (
    <div className="flex items-center justify-between gap-3 text-xs text-roast/60">
      <span className={num}>
        {from}–{to} trên {total}
      </span>
      <span className="flex items-center gap-1">
        <button type="button" className={btn} onClick={() => onPage(page - 1)} disabled={page === 0} aria-label="Trang trước">
          ‹
        </button>
        <span className={`px-2 ${num}`}>
          {page + 1}/{pages}
        </span>
        <button type="button" className={btn} onClick={() => onPage(page + 1)} disabled={page >= pages - 1} aria-label="Trang sau">
          ›
        </button>
      </span>
    </div>
  );
}

/** Ô số liệu bấm được để lọc bảng */
export function FilterTile({ label, value, active, tone = '', onClick }: { label: string; value: ReactNode; active?: boolean; tone?: string; onClick?: () => void }) {
  const body = (
    <>
      <span className="block font-label text-[11px] font-semibold uppercase tracking-wider text-roast/55">{label}</span>
      <span className={`mt-1 block text-2xl font-bold leading-none ${num} ${tone}`}>{value}</span>
    </>
  );
  if (!onClick) return <div className="border border-roast/25 bg-foam px-4 py-3">{body}</div>;
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`plain-btn border bg-foam px-4 py-3 text-left transition-colors ${active ? 'border-roast ring-1 ring-roast' : 'border-roast/25 hover:border-roast/60'}`}>
      {body}
    </button>
  );
}

/** Ô tìm trong thanh công cụ */
export const searchInput = 'h-9 w-full border border-roast/25 bg-cream pl-9 pr-3 text-sm focus:border-roast focus:outline-none';
export const toolSelect = 'h-9 border border-roast/25 bg-cream px-2.5 text-sm focus:border-roast focus:outline-none';
