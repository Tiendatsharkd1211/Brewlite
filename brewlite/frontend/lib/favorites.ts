'use client';

// MÓN YÊU THÍCH lưu trên máy chủ theo tài khoản (GET/PUT/DELETE /favorites), không lưu trong trình duyệt.
// Khách chưa đăng nhập bấm tim thì được đưa tới trang đăng nhập, xong quay lại đúng trang đang xem.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

const KEY = ['favorites'] as const;

export function useFavorites() {
  const { status, request, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const key = [...KEY, user?.id];

  const { data } = useQuery({
    queryKey: key,
    queryFn: () => request<string[]>('/favorites/me'),
    enabled: status === 'authed',
  });

  const mutation = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) =>
      request<string[]>(`/favorites/${encodeURIComponent(id)}`, { method: on ? 'PUT' : 'DELETE' }),
    // Đổi ngay trên giao diện, máy chủ trả về thì lấy danh sách thật; lỗi thì trả lại như cũ
    onMutate: async ({ id, on }) => {
      await qc.cancelQueries({ queryKey: key });
      const before = qc.getQueryData<string[]>(key);
      qc.setQueryData<string[]>(key, (list = []) => (on ? [id, ...list.filter((f) => f !== id)] : list.filter((f) => f !== id)));
      return { before };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.before),
    onSuccess: (list) => qc.setQueryData(key, list),
  });

  const favorites = status === 'authed' ? (data ?? []) : [];

  function toggleFavorite(id: string) {
    if (status !== 'authed') {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    mutation.mutate({ id, on: !favorites.includes(id) });
  }

  return { favorites, toggleFavorite, signedIn: status === 'authed' };
}
