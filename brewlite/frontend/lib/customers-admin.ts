'use client';

// Tài khoản khách cho quản lý (API /staff/customers, chỉ MANAGER): xem, thêm, khoá, mở khoá. Không có xoá.
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';

export interface CustomerRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  loyaltyPoints: number;
  createdAt: string;
  lockedAt: string | null;
  lockReason: string | null;
}

export interface CustomerDetail extends CustomerRow {
  accountLogs: { id: string; action: 'LOCK' | 'UNLOCK'; reason: string; byName: string; createdAt: string }[];
}

// Cùng danh sách với backend/src/customers/reasons.ts (máy chủ kiểm lại mã lý do)
export const LOCK_REASONS: Record<string, string> = {
  'fake-orders': 'Đặt nhiều đơn rồi không nhận, không thanh toán',
  'promo-abuse': 'Lạm dụng mã giảm giá hoặc điểm thưởng',
  'payment-fraud': 'Có dấu hiệu gian lận khi thanh toán',
  behavior: 'Có lời lẽ, hành vi không phù hợp với nhân viên',
  'owner-request': 'Theo yêu cầu của chính chủ tài khoản',
  other: 'Lý do khác',
};
export const UNLOCK_REASONS: Record<string, string> = {
  resolved: 'Sự việc đã được xác minh và giải quyết xong',
  mistake: 'Tài khoản bị khoá nhầm',
  'owner-request': 'Theo yêu cầu của chính chủ tài khoản',
  other: 'Lý do khác',
};

const KEY = ['customers'];

function useManager() {
  const { status, user, request } = useAuth();
  return { request, enabled: status === 'authed' && user?.role === 'MANAGER' };
}

export type CustomerStatus = 'all' | 'active' | 'locked';
export interface CustomerQuery {
  q: string;
  status: CustomerStatus;
  sort: 'new' | 'name';
  /** Trang tính từ 1 */
  page: number;
  size: number;
}
export interface CustomerPage {
  items: CustomerRow[];
  total: number;
  page: number;
  size: number;
  counts: { all: number; active: number; locked: number; fresh: number };
}

/** Một trang danh sách khách; lọc, tìm, cắt trang làm ở máy chủ. Đổi trang vẫn giữ bảng cũ tới khi có dữ liệu mới. */
export function useCustomers(query: CustomerQuery) {
  const { request, enabled } = useManager();
  const qs = new URLSearchParams({ status: query.status, sort: query.sort, page: String(query.page), size: String(query.size), ...(query.q.trim() ? { q: query.q.trim() } : {}) });
  return useQuery({
    queryKey: [...KEY, 'list', query],
    queryFn: () => request<CustomerPage>(`/staff/customers?${qs}`),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

/** Hiện số điện thoại dạng 0912 345 678 */
export const formatPhone = (p: string | null) => (p ? p.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3') : '');

export function useCustomer(id: string | null) {
  const { request, enabled } = useManager();
  return useQuery({ queryKey: [...KEY, 'one', id], queryFn: () => request<CustomerDetail>(`/staff/customers/${id}`), enabled: enabled && !!id });
}

/** Thêm, khoá, mở khoá: xong thì làm mới danh sách và chi tiết */
export function useCustomerActions() {
  const { request } = useAuth();
  const qc = useQueryClient();
  const done = (c: CustomerDetail) => {
    qc.setQueryData([...KEY, 'one', c.id], c);
    return qc.invalidateQueries({ queryKey: [...KEY, 'list'] });
  };
  return {
    create: useMutation({
      mutationFn: (body: { fullName: string; email: string; phone?: string; password: string }) => request<CustomerDetail>('/staff/customers', { method: 'POST', body }),
      onSuccess: done,
    }),
    setLock: useMutation({
      mutationFn: ({ id, lock, reason, note }: { id: string; lock: boolean; reason: string; note: string }) =>
        request<CustomerDetail>(`/staff/customers/${id}/${lock ? 'lock' : 'unlock'}`, { method: 'POST', body: { reason, ...(note.trim() ? { note: note.trim() } : {}) } }),
      onSuccess: done,
    }),
  };
}
