'use client';

// KHO NGUYÊN VẬT LIỆU (phần quản lý): nạp và lưu qua API (backend/src/inventory), lưu CSDL.
// Quầy bấm "Bắt đầu pha" thì máy chủ tự trừ nguyên liệu theo công thức; trang quản lý nạp lại định kỳ để thấy tồn mới.
import { create } from 'zustand';
import { ApiError, apiRequest, type RequestOptions } from './api';

export type GroupId = 'ca-phe' | 'sua' | 'tra' | 'duong' | 'banh' | 'bao-bi';
export type StockState = 'ok' | 'low' | 'out';
/** Lịch sử kho chỉ ghi việc quan trọng: nhập kho và xuất pha chế. Sửa số tồn bằng tay không ghi. */
export type MoveKind = 'receipt' | 'usage';

export const GROUPS: { id: GroupId; name: string }[] = [
  { id: 'ca-phe', name: 'Cà phê' },
  { id: 'sua', name: 'Sữa & kem' },
  { id: 'tra', name: 'Trà & trái cây' },
  { id: 'duong', name: 'Đường & siro' },
  { id: 'banh', name: 'Làm bánh' },
  { id: 'bao-bi', name: 'Ly & bao bì' },
];

export interface Ingredient {
  id: string;
  name: string;
  group: GroupId;
  /** Đơn vị nhập kho (kg, lít, hộp...) */
  unit: string;
  /** Đơn vị dùng trong công thức và hệ số đổi: 1 unit = per sub (1 kg = 1000 g) */
  sub: string;
  per: number;
  stock: number;
  min: number;
  /** Giá vốn bình quân cho 1 unit */
  cost: number;
}

export interface Movement {
  id: string;
  ingredientId: string;
  kind: MoveKind;
  /** Số lượng theo unit, dương là vào kho, âm là ra kho */
  qty: number;
  at: string;
  note: string;
  ref?: string;
}

export interface ReceiptLine {
  ingredientId: string;
  qty: number;
  price: number;
}

/** Phiếu nhập kho: quản lý nhập tay số lượng và giá mua, tồn tăng ngay khi lưu */
export interface Receipt {
  id: string;
  at: string;
  by: string;
  lines: ReceiptLine[];
  note: string;
}

export interface RecipeLine {
  ingredientId: string;
  /** Số lượng theo đơn vị công thức (sub) */
  amount: number;
}

export interface Recipe {
  productId: string;
  size: string;
  lines: RecipeLine[];
}

export const MOVE_LABEL: Record<MoveKind, string> = {
  receipt: 'Nhập kho',
  usage: 'Xuất pha chế',
};


interface InventoryState {
  ready: boolean;
  ingredients: Ingredient[];
  receipts: Receipt[];
  movements: Movement[];
  recipes: Recipe[];
  /** Lỗi lần lưu gần nhất (câu máy chủ trả về) */
  error: string | null;
  /** Nạp lại toàn bộ kho từ máy chủ (quầy vừa pha xong thì tồn đổi) */
  load: () => Promise<void>;
  /** Lưu phiếu nhập: máy chủ cộng tồn, tính giá vốn bình quân; trả về mã phiếu (null nếu lỗi) */
  saveReceipt: (r: Pick<Receipt, 'lines' | 'note'>) => Promise<string | null>;
  /** Thêm (isNew) hoặc sửa nguyên liệu, kể cả số tồn */
  saveIngredient: (i: Ingredient, isNew: boolean) => Promise<boolean>;
  /** Lưu công thức của một món (thay toàn bộ dòng định lượng) */
  saveRecipe: (r: Recipe) => Promise<boolean>;
}

/** Gọi API bằng token đang lưu (store nằm ngoài React) */
function call<T>(path: string, options: Omit<RequestOptions, 'token'> = {}) {
  const token = typeof window === 'undefined' ? null : localStorage.getItem('brewlite.token');
  return apiRequest<T>(path, { ...options, token });
}
const messageOf = (err: unknown) => (err instanceof ApiError ? err.message : 'Chưa lưu được, thử lại sau ít phút.');

type Snapshot = Pick<InventoryState, 'ingredients' | 'receipts' | 'movements' | 'recipes'>;

export const useInventory = create<InventoryState>()((set, get) => ({
  ready: false,
  ingredients: [],
  receipts: [],
  movements: [],
  recipes: [],
  error: null,

  load: async () => {
    try {
      set({ ...(await call<Snapshot>('/staff/inventory')), ready: true });
    } catch {
      /* chưa đăng nhập quản lý hoặc mất mạng: giữ dữ liệu cũ */
    }
  },

  saveReceipt: async (input) => {
    try {
      const receipt = await call<Receipt>('/staff/receipts', { method: 'POST', body: input });
      await get().load();
      set({ error: null });
      return receipt.id;
    } catch (err) {
      set({ error: messageOf(err) });
      return null;
    }
  },

  saveIngredient: async (ing, isNew) => {
    try {
      const { id, ...body } = ing;
      const saved = await call<Ingredient>(isNew ? '/staff/ingredients' : `/staff/ingredients/${encodeURIComponent(id)}`, { method: isNew ? 'POST' : 'PUT', body });
      set((s) => ({ ingredients: isNew ? [...s.ingredients, saved] : s.ingredients.map((i) => (i.id === saved.id ? saved : i)), error: null }));
      return true;
    } catch (err) {
      set({ error: messageOf(err) });
      return false;
    }
  },

  saveRecipe: async (r) => {
    try {
      const saved = await call<Recipe>(`/staff/recipes/${encodeURIComponent(r.productId)}`, { method: 'PUT', body: { lines: r.lines } });
      set((s) => ({ recipes: s.recipes.some((x) => x.productId === saved.productId) ? s.recipes.map((x) => (x.productId === saved.productId ? saved : x)) : [...s.recipes, saved], error: null }));
      return true;
    } catch (err) {
      set({ error: messageOf(err) });
      return false;
    }
  },
}));

// ----- Phép tính dùng chung cho các trang -----

export function stateOf(i: Pick<Ingredient, 'stock' | 'min'>): StockState {
  if (i.stock <= 0) return 'out';
  if (i.stock <= i.min) return 'low';
  return 'ok';
}

export const STATE_LABEL: Record<StockState, string> = { ok: 'Đủ dùng', low: 'Sắp hết', out: 'Hết hàng' };
export const STATE_TONE: Record<StockState, string> = { ok: 'text-leaf', low: 'text-amber-700', out: 'text-chili' };

/** Gợi ý nhập: đưa tồn lên gấp đôi mức tối thiểu */
export const suggestQty = (i: Ingredient) => Math.max(0, Math.ceil(i.min * 2 - i.stock));

export const receiptTotal = (r: Pick<Receipt, 'lines'>) => r.lines.reduce((n, l) => n + l.qty * l.price, 0);

/** Giá vốn một ly theo công thức */
export function recipeCost(r: Recipe, map: Map<string, Ingredient>): number {
  return Math.round(r.lines.reduce((n, l) => {
    const ing = map.get(l.ingredientId);
    return ing ? n + (l.amount / ing.per) * ing.cost : n;
  }, 0));
}

/** Với tồn hiện tại còn pha được bao nhiêu ly, và nguyên liệu nào giới hạn */
export function cupsLeft(r: Recipe, map: Map<string, Ingredient>): { cups: number; limitBy: Ingredient | null } {
  let cups = Infinity;
  let limitBy: Ingredient | null = null;
  for (const l of r.lines) {
    const ing = map.get(l.ingredientId);
    if (!ing || l.amount <= 0) continue;
    const n = Math.floor((ing.stock * ing.per) / l.amount);
    if (n < cups) {
      cups = n;
      limitBy = ing;
    }
  }
  return { cups: cups === Infinity ? 0 : cups, limitBy };
}

/** "18,5 kg" */
export function qtyText(n: number, unit: string): string {
  return `${n.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ${unit}`;
}
