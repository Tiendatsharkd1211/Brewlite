'use client';

// GIỎ HÀNG (Task 5) quản lý bằng Zustand, lưu localStorage để tải lại trang không mất.
// Kèm vài tuỳ chọn cá nhân: chi nhánh đang chọn, món yêu thích, ví đã liên kết.
import { useEffect, type ReactNode } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORES } from '@/lib/mock-data';
import type { CartItem, NewCartItem, PaymentMethodId } from '@/lib/types';

export const MAX_QTY = 20;

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Hai dòng giỏ hàng có cùng món và cùng tuỳ chọn thì gộp số lượng */
function sameConfig(a: NewCartItem, b: NewCartItem): boolean {
  return (
    a.productId === b.productId &&
    a.size === b.size &&
    a.sugar === b.sugar &&
    a.ice === b.ice &&
    a.note.trim() === b.note.trim() &&
    [...a.toppingIds].sort().join() === [...b.toppingIds].sort().join()
  );
}

function merge(items: CartItem[], item: NewCartItem): CartItem[] {
  const existing = items.find((c) => sameConfig(c, item));
  if (existing) {
    return items.map((c) => (c.lineId === existing.lineId ? { ...c, quantity: Math.min(c.quantity + item.quantity, MAX_QTY) } : c));
  }
  return [...items, { ...item, lineId: uid() }];
}

interface CartState {
  items: CartItem[];
  add: (item: NewCartItem) => void;
  addMany: (items: NewCartItem[]) => void;
  updateLine: (lineId: string, item: NewCartItem) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  remove: (lineId: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) => set((s) => ({ items: merge(s.items, item) })),
      addMany: (items) => set((s) => ({ items: items.reduce(merge, s.items) })),
      updateLine: (lineId, item) =>
        set((s) => {
          const others = s.items.filter((c) => c.lineId !== lineId);
          const twin = others.find((c) => sameConfig(c, item));
          if (twin) {
            // Sửa xong trùng hẳn với một dòng khác thì gộp lại
            return { items: others.map((c) => (c.lineId === twin.lineId ? { ...c, quantity: Math.min(c.quantity + item.quantity, MAX_QTY) } : c)) };
          }
          return { items: s.items.map((c) => (c.lineId === lineId ? { ...item, lineId } : c)) };
        }),
      setQuantity: (lineId, quantity) =>
        set((s) => ({ items: s.items.map((c) => (c.lineId === lineId ? { ...c, quantity: Math.max(1, Math.min(quantity, MAX_QTY)) } : c)) })),
      remove: (lineId) => set((s) => ({ items: s.items.filter((c) => c.lineId !== lineId) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'brewlite.cart', storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);

interface PrefsState {
  storeId: string;
  favorites: string[];
  linkedWallets: PaymentMethodId[];
  setStoreId: (id: string) => void;
  toggleFavorite: (productId: string) => void;
  toggleWallet: (id: PaymentMethodId) => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      storeId: STORES[0].id,
      favorites: [],
      linkedWallets: ['MOMO'],
      setStoreId: (storeId) => set({ storeId }),
      toggleFavorite: (id) => set((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id] })),
      toggleWallet: (id) => set((s) => ({ linkedWallets: s.linkedWallets.includes(id) ? s.linkedWallets.filter((w) => w !== id) : [...s.linkedWallets, id] })),
    }),
    { name: 'brewlite.prefs', storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);

const useHydration = create<{ hydrated: boolean }>(() => ({ hydrated: false }));

/** Nạp giỏ hàng đã lưu sau khi trang chạy trên trình duyệt (tránh lệch giữa HTML server và client) */
export function AppStoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    Promise.all([useCartStore.persist.rehydrate(), usePrefsStore.persist.rehydrate()]).finally(() => useHydration.setState({ hydrated: true }));
  }, []);
  return <>{children}</>;
}

/** Hook gộp tiện dùng cho component: giỏ hàng + tuỳ chọn cá nhân */
export function useAppStore() {
  const cart = useCartStore();
  const prefs = usePrefsStore();
  const hydrated = useHydration((s) => s.hydrated);
  return {
    hydrated,
    cart: cart.items,
    cartCount: cart.items.reduce((n, c) => n + c.quantity, 0),
    subtotal: cart.items.reduce((n, c) => n + c.unitPrice * c.quantity, 0),
    addToCart: cart.add,
    addManyToCart: cart.addMany,
    updateLine: cart.updateLine,
    setQuantity: cart.setQuantity,
    removeFromCart: cart.remove,
    clearCart: cart.clear,
    storeId: prefs.storeId,
    favorites: prefs.favorites,
    linkedWallets: prefs.linkedWallets,
    setStoreId: prefs.setStoreId,
    toggleFavorite: prefs.toggleFavorite,
    toggleWallet: prefs.toggleWallet,
  };
}
