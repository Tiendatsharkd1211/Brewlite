'use client';

// NỘI DUNG CỬA HÀNG mà quản lý chỉnh được: món (ẩn, báo hết, sửa, thêm), mã giảm giá, chữ trang nhất,
// dải thông báo, trạng thái xử lý góp ý. Mọi thay đổi gọi API và lưu CSDL (backend/src/manage), nên khách thấy
// ngay và tải lại trang không mất. Store này giữ bản sao để các trang đọc nhanh; StorefrontSync nạp khi mở trang.
import { create } from 'zustand';
import { ApiError, apiRequest, type RequestOptions } from './api';
import type { CategoryId, Product } from './types';

export type ProductEdit = Partial<Pick<Product, 'name' | 'price' | 'imageUrl' | 'description' | 'tagline' | 'tag' | 'category' | 'keywords'>> & {
  hidden?: boolean;
  soldOut?: boolean;
};

export type VoucherType = 'PERCENT' | 'FREESHIP';

export interface Voucher {
  code: string;
  type: VoucherType;
  /** Tiêu đề và điều kiện hiện trên trang Ưu đãi */
  title: string;
  terms: string;
  percent: number;
  maxDiscount: number;
  minOrder: number;
  requiredMethod: 'VNPAY' | 'POINTS' | null;
  requiresDelivery: boolean;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
  /** Hiện trên trang Ưu đãi (tắt đi thì mã vẫn dùng được nếu khách biết) */
  showOnSite: boolean;
  /** yyyy-mm-dd, để trống là không giới hạn */
  startsAt: string;
  endsAt: string;
}

export interface SiteContent {
  heroKicker: string;
  heroTitle: string;
  heroCaption: string;
  heroLead: string;
  /** Mã ảnh Unsplash hoặc đường dẫn ảnh đầy đủ */
  heroImage: string;
  notice: { on: boolean; text: string; href: string };
  promo: { code: string; badge: string; title: string; text: string };
}

export type FeedbackStatus = 'new' | 'doing' | 'done';
export interface FeedbackState {
  status: FeedbackStatus;
  note: string;
  updatedAt: string;
}

export interface ChangeLog {
  id: number;
  at: string;
  text: string;
  href: string;
}

export const DEFAULT_CONTENT: SiteContent = {
  heroKicker: 'Cà phê kiểu Sài Gòn xưa',
  heroTitle: 'Ly phin chậm rãi ngày xưa, nay đặt trước khỏi chờ',
  heroCaption: 'Bàn gỗ, ghế đệm, sàn gạch bông và tiếng phin nhỏ giọt, như một quán quen của Sài Gòn những năm 80.',
  heroLead: 'Đặt món trên điện thoại trước khi ra khỏi nhà, tới quầy là có ly. Mỗi 1.000đ bạn được tích 1 điểm, dùng để đổi bánh, nâng size hoặc trừ thẳng vào đơn sau.',
  heroImage: '1571851534298-1ffa72eab79e',
  notice: { on: false, text: 'Tuần này: cà phê muối giảm 10% cho đơn đặt trước 9 giờ sáng.', href: '/menu' },
  promo: { code: 'VNPAY20', badge: '−20%', title: 'Trả qua VNPay, giảm 20% mỗi đơn', text: 'Giảm tới 25.000đ cho mỗi đơn trả bằng thẻ ATM, thẻ quốc tế hoặc QR.' },
};

export type VoucherState = 'running' | 'paused' | 'used-up' | 'expired' | 'scheduled';
export const VOUCHER_STATE_LABEL: Record<VoucherState, string> = {
  running: 'Đang chạy',
  paused: 'Tạm dừng',
  'used-up': 'Hết lượt',
  expired: 'Hết hạn',
  scheduled: 'Chưa tới ngày',
};

/** Hôm nay theo giờ Việt Nam, dạng yyyy-mm-dd */
const today = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);

export function voucherState(v: Voucher): VoucherState {
  if (!v.active) return 'paused';
  if (v.usageLimit !== null && v.usedCount >= v.usageLimit) return 'used-up';
  if (v.endsAt && v.endsAt < today()) return 'expired';
  if (v.startsAt && v.startsAt > today()) return 'scheduled';
  return 'running';
}

/** Mô tả ngắn mức giảm: "−20%", "Freeship" */
export const voucherBadge = (v: Pick<Voucher, 'type' | 'percent'>) => (v.type === 'FREESHIP' ? 'Freeship' : `−${v.percent}%`);

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = { new: 'Mới', doing: 'Đang xử lý', done: 'Đã xong' };

interface StorefrontState {
  /** Đã nạp dữ liệu từ máy chủ chưa */
  ready: boolean;
  vouchers: Voucher[];
  content: SiteContent;
  feedback: Record<string, FeedbackState>;
  log: ChangeLog[];
  /** Lỗi lần lưu gần nhất (hiện thành thông báo ở khu Quản lý) */
  error: string | null;
  clearError: () => void;
  /** Nạp lại mã giảm giá, nội dung, trạng thái góp ý từ máy chủ */
  load: (asManager: boolean) => Promise<void>;
  editProduct: (id: string, patch: ProductEdit, label?: string) => Promise<boolean>;
  editProducts: (ids: string[], patch: ProductEdit, label: string) => Promise<boolean>;
  /** Thêm món, trả về mã món mới (null nếu lỗi) */
  createProduct: (input: { name: string; price: number; category: CategoryId }) => Promise<string | null>;
  saveVoucher: (v: Voucher, original?: string) => Promise<boolean>;
  setVoucherActive: (code: string, active: boolean) => Promise<boolean>;
  removeVoucher: (code: string) => Promise<boolean>;
  setContent: (patch: Partial<SiteContent>, label?: string) => Promise<boolean>;
  setFeedback: (id: string, patch: Partial<Omit<FeedbackState, 'updatedAt'>>) => Promise<boolean>;
}

let logId = 0;
const entry = (text: string, href: string): ChangeLog => ({ id: ++logId, at: new Date().toISOString(), text, href });

/** Gọi API bằng token đang lưu (store nằm ngoài React nên không dùng useAuth được) */
function call<T>(path: string, options: Omit<RequestOptions, 'token'> = {}) {
  const token = typeof window === 'undefined' ? null : localStorage.getItem('brewlite.token');
  return apiRequest<T>(path, { ...options, token });
}
const messageOf = (err: unknown) => (err instanceof ApiError ? err.message : 'Chưa lưu được, thử lại sau ít phút.');

/** Báo React Query tải lại thực đơn sau khi sửa món (StorefrontSync gắn hàm này khi chạy) */
let refreshProducts: () => void = () => undefined;
export function onProductsChanged(fn: () => void) {
  refreshProducts = fn;
}

interface FeedbackRowState {
  id: string;
  status: FeedbackStatus;
  note: string;
  updatedAt: string | null;
}

export const useStorefront = create<StorefrontState>((set, get) => {
  /** Chạy một thao tác lưu: lỗi thì ghi lại để hiện thông báo, trả về true/false */
  async function run(fn: () => Promise<void>, label?: string, href = '/quan-ly') {
    try {
      await fn();
      if (label) set((s) => ({ log: [entry(label, href), ...s.log].slice(0, 30), error: null }));
      return true;
    } catch (err) {
      set({ error: messageOf(err) });
      return false;
    }
  }

  return {
    ready: false,
    vouchers: [],
    content: DEFAULT_CONTENT,
    feedback: {},
    log: [],
    error: null,
    clearError: () => set({ error: null }),

    load: async (asManager) => {
      const [vouchers, content, feedback] = await Promise.all([
        call<Voucher[]>(asManager ? '/staff/vouchers' : '/vouchers').catch(() => get().vouchers),
        call<SiteContent>('/content').catch(() => get().content),
        asManager ? call<FeedbackRowState[]>('/staff/feedback').catch(() => null) : Promise.resolve(null),
      ]);
      set({
        ready: true,
        vouchers,
        content,
        ...(feedback && { feedback: Object.fromEntries(feedback.map((f) => [f.id, { status: f.status, note: f.note, updatedAt: f.updatedAt ?? '' }])) }),
      });
    },

    editProduct: (id, patch, label) =>
      run(async () => {
        await call(`/staff/products/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
        refreshProducts();
      }, label, `/quan-ly/thuc-don?sua=${id}`),

    editProducts: (ids, patch, label) =>
      run(async () => {
        await call('/staff/products/bulk', { method: 'POST', body: { ids, ...patch } });
        refreshProducts();
      }, label, '/quan-ly/thuc-don'),

    createProduct: async (input) => {
      let id: string | null = null;
      await run(async () => {
        id = (await call<{ id: string }>('/staff/products', { method: 'POST', body: input })).id;
        refreshProducts();
      }, `Thêm món ${input.name}`, '/quan-ly/thuc-don');
      return id;
    },

    saveVoucher: (v, original) =>
      run(async () => {
        const { usedCount: _u, ...body } = v;
        const saved = await call<Voucher>(original ? `/staff/vouchers/${encodeURIComponent(original)}` : '/staff/vouchers', { method: original ? 'PUT' : 'POST', body });
        set((s) => ({ vouchers: original ? s.vouchers.map((x) => (x.code === original ? saved : x)) : [saved, ...s.vouchers] }));
      }, `${original ? 'Sửa' : 'Tạo'} mã ${v.code}`, '/quan-ly/ma-giam-gia'),

    setVoucherActive: (code, active) =>
      run(async () => {
        const saved = await call<Voucher>(`/staff/vouchers/${encodeURIComponent(code)}/active`, { method: 'PATCH', body: { active } });
        set((s) => ({ vouchers: s.vouchers.map((x) => (x.code === code ? saved : x)) }));
      }, `${active ? 'Chạy lại' : 'Tạm dừng'} mã ${code}`, '/quan-ly/ma-giam-gia'),

    removeVoucher: (code) =>
      run(async () => {
        await call(`/staff/vouchers/${encodeURIComponent(code)}`, { method: 'DELETE' });
        set((s) => ({ vouchers: s.vouchers.filter((x) => x.code !== code) }));
      }, `Xoá mã ${code}`, '/quan-ly/ma-giam-gia'),

    setContent: (patch, label) =>
      run(async () => {
        const saved = await call<SiteContent>('/staff/content', { method: 'PUT', body: { ...get().content, ...patch } });
        set({ content: saved });
      }, label, '/quan-ly/noi-dung'),

    setFeedback: (id, patch) =>
      run(async () => {
        const saved = await call<FeedbackRowState>(`/staff/feedback/${id}`, { method: 'PATCH', body: patch });
        set((s) => ({ feedback: { ...s.feedback, [id]: { status: saved.status, note: saved.note, updatedAt: saved.updatedAt ?? '' } } }));
      }),
  };
});

/** Món từ máy chủ -> dạng giao diện: món báo hết hiện tồn 0, kèm cờ ẩn */
export function applyEdit(p: Product & { hidden?: boolean; soldOut?: boolean }): Product & { hidden: boolean } {
  const { hidden = false, soldOut = false, ...rest } = p;
  return { ...rest, stock: soldOut ? 0 : rest.stock, hidden };
}

export const CATEGORY_OPTIONS: CategoryId[] = ['truyen-thong', 'pha-may', 'tra-da-xay', 'banh-ngot'];
