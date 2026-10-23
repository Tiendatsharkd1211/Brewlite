'use client';

// Tấm chọn món bật lên ở bất kỳ trang nào: bấm + trên thẻ món, hoặc bấm "Sửa" trong giỏ hàng.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAppStore } from '@/context/app-store';
import { flyToCart } from '@/lib/fly-to-cart';
import { useProductMap } from '@/lib/products';
import type { CartItem, NewCartItem } from '@/lib/types';
import ProductImage from '@/components/menu/ProductImage';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import { CloseIcon } from '@/components/ui/Icons';
import ProductCustomizer from './ProductCustomizer';

interface SheetApi {
  openProduct: (productId: string, line?: CartItem) => void;
}

const SheetContext = createContext<SheetApi | null>(null);

export function ProductSheetProvider({ children }: { children: ReactNode }) {
  const { addToCart, updateLine } = useAppStore();
  const [state, setState] = useState<{ productId: string; line?: CartItem; key: number } | null>(null);
  const [toast, setToast] = useState<{ text: string; action: boolean } | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const productMap = useProductMap();
  const product = state ? productMap.get(state.productId) : undefined;

  const openProduct = useCallback((productId: string, line?: CartItem) => setState({ productId, line, key: Date.now() }), []);
  const close = useCallback(() => setState(null), []);

  function handleSubmit(item: NewCartItem) {
    if (state?.line) {
      updateLine(state.line.lineId, item);
      setToast({ text: `Đã cập nhật ${item.name}.`, action: false });
    } else {
      addToCart(item);
      flyToCart(imageRef.current);
      setToast({ text: `Đã thêm ${item.quantity} ${item.name}${item.size ? ` size ${item.size}` : ''} vào giỏ.`, action: true });
    }
    close();
  }

  const api = useMemo(() => ({ openProduct }), [openProduct]);

  return (
    <SheetContext.Provider value={api}>
      {children}
      <Modal open={Boolean(product)} titleId="product-sheet-title" onClose={close} wide flush>
        {product && state && (
          <>
            <div ref={imageRef} className="relative h-56 overflow-hidden sm:h-64">
              <ProductImage product={product} width={900} priority className="h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-roast/35 to-transparent" aria-hidden="true" />
              <button
                type="button"
                onClick={close}
                className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-foam/90 text-roast shadow hover:bg-foam"
                aria-label="Đóng"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="p-6">
              <ProductCustomizer
                key={state.key}
                product={product}
                initial={state.line}
                variant="sheet"
                titleId="product-sheet-title"
                submitLabel={state.line ? 'Cập nhật' : 'Thêm vào giỏ'}
                onSubmit={handleSubmit}
              />
            </div>
          </>
        )}
      </Modal>
      <Toast message={toast?.text ?? null} actionHref={toast?.action ? '/checkout' : undefined} actionLabel="Xem giỏ hàng" onDone={() => setToast(null)} />
    </SheetContext.Provider>
  );
}

export function useProductSheet(): SheetApi {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error('useProductSheet phải nằm trong <ProductSheetProvider>');
  return ctx;
}
