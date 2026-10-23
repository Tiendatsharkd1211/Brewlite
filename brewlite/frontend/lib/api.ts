// Gọi API NestJS. Mọi lỗi được đổi thành ApiError có câu thông báo tiếng Việt để hiện cho người dùng.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
}

export async function apiRequest<T>(path: string, { method = 'GET', body, token, headers }: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ. Kiểm tra cửa sổ BrewLite Backend còn chạy không.');
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    // NestJS trả lỗi dạng { message: string | string[] }
    const raw = (data as { message?: string | string[] } | null)?.message;
    const message = Array.isArray(raw) ? raw[0] : raw;
    throw new ApiError(res.status, message ?? `Máy chủ báo lỗi ${res.status}`);
  }
  return data as T;
}
