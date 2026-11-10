'use client';

// GIỎ HÀNG NHANH: trượt ra từ bên phải khi bấm nút giỏ hàng, xem và sửa nhanh mà không rời trang đang xem
import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/context/app-store';
import { describeOptions, formatVnd } from '@/lib/format';
import { useProductMap } from '@/lib/products';
import ProductImage from '@/components/menu/ProductImage';
import QuantityStepper from '@/components/ui/QuantityStepper';
import { CloseIcon, TrashIcon } from '@/components/ui/Icons';

export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { cart, cartCount, subtotal, setQuantity, removeFromCart } = useAppStore();
  const productMap = useProductMap();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 animate-fade-in bg-roast/50" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l-[3px] border-double border-roast bg-cream"
      >
        <div className="flex items-center justify-between border-b-2 border-roast px-5 py-4">
          <h2 id="cart-title" className="text-2xl font-black">
            Giỏ hàng <span className="font-mono text-base font-normal text-roast/60">({cartCount} món)</span>
          </h2>
          <button type="button" onClick={onClose} aria-label="Đóng giỏ hàng" className="grid h-10 w-10 place-items-center hover:bg-roast/5">
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <p className="font-display text-2xl font-black">Giỏ hàng đang trống</p>
            <p className="mt-2 text-sm text-roast/70">Ghé thực đơn chọn vài món nhé.</p>
            <Link href="/menu" onClick={onClose} className="mt-5 inline-flex h-11 items-center bg-gold px-6 font-label text-sm font-semibold uppercase tracking-wider text-foam hover:bg-gold-deep">
              Xem thực đơn
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-5">
              {cart.map((line) => {
                const product = productMap.get(line.productId);
                return (
                  <li key={line.lineId} className="flex gap-3 border-b border-dotted border-roast/60 py-4">
                    <span className="h-16 w-16 shrink-0 overflow-hidden border border-roast">{product && <ProductImage product={product} width={160} className="h-full w-full" />}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display font-bold leading-tight">{line.name}</p>
                        <span className="shrink-0 tabular-nums text-sm">{formatVnd(line.unitPrice * line.quantity)}</span>
                      </div>
                      <p className="truncate text-xs text-roast/65">{describeOptions(line)}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <QuantityStepper compact value={line.quantity} onChange={(q) => setQuantity(line.lineId, q)} label={line.name} />
                        <button type="button" onClick={() => removeFromCart(line.lineId)} className="inline-flex items-center gap-1 text-xs font-semibold text-chili hover:underline">
                          <TrashIcon className="h-4 w-4" /> Xoá
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="border-t-[3px] border-double border-roast px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
              <div className="flex items-baseline justify-between">
                <span className="font-label text-sm uppercase tracking-wider">Tạm tính</span>
                <span className="tabular-nums text-2xl font-semibold">{formatVnd(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-roast/65">Phí giao hàng và mã giảm giá tính ở bước thanh toán.</p>
              <Link href="/checkout" onClick={onClose} className="mt-4 flex h-12 items-center justify-center bg-gold font-label text-base font-semibold uppercase tracking-wider text-foam hover:bg-gold-deep">
                Thanh toán · {formatVnd(subtotal)}
              </Link>
              {/* Đang ở trang khác thì đưa sang Thực đơn; đang ở Thực đơn rồi thì chỉ đóng giỏ để chọn tiếp */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (pathname !== '/menu') router.push('/menu');
                }}
                className="mt-2 h-11 w-full border-2 border-roast text-sm font-semibold hover:bg-roast hover:text-cream"
              >
                Chọn thêm món
              </button>
            </div>
          </>
        )}
      </aside>
    </div>,
    document.body,
  );
}
