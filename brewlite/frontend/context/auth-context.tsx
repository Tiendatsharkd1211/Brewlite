'use client';

// Quản lý trạng thái xác thực người dùng. Token JWT được lưu tại localStorage và tự động đính kèm khi gọi API.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, apiRequest, type RequestOptions } from '@/lib/api';
import type { User } from '@/lib/types';

const TOKEN_KEY = 'brewlite.token';

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type Status = 'loading' | 'guest' | 'authed';

interface AuthValue {
  status: Status;
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
  /** Gọi API có kèm token; tự động logout nếu token hết hạn (401) */
  request: <T>(path: string, options?: Omit<RequestOptions, 'token'>) => Promise<T>;
}

const AuthContext = createContext<AuthValue | null>(null);

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Trình duyệt chặn lưu trữ: vẫn dùng được trong phiên hiện tại
  }
}

/** Provider quản lý phiên đăng nhập, lưu token và xác thực thông tin tài khoản người dùng */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('loading');


  const logout = useCallback(() => {
    writeToken(null);
    setToken(null);
    setUser(null);
    setStatus('guest');
  }, []);

  // Mở trang: có token thì hỏi máy chủ token còn hợp lệ không
  useEffect(() => {
    const saved = readToken();
    if (!saved) {
      setStatus('guest');
      return;
    }
    apiRequest<User>('/auth/me', { token: saved })
      .then((me) => {
        setToken(saved);
        setUser(me);
        setStatus('authed');
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) writeToken(null);
        setStatus('guest');
      });
  }, []);

  const startSession = useCallback((accessToken: string, me: User) => {
    writeToken(accessToken);
    setToken(accessToken);
    setUser(me);
    setStatus('authed');
    return me;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiRequest<{ accessToken: string; user: User }>('/auth/login', { method: 'POST', body: { email, password } });
      return startSession(res.accessToken, res.user);
    },
    [startSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const res = await apiRequest<{ accessToken: string; user: User }>('/auth/register', { method: 'POST', body: input });
      return startSession(res.accessToken, res.user);
    },
    [startSession],
  );

  const request = useCallback(
    async <T,>(path: string, options: Omit<RequestOptions, 'token'> = {}) => {
      try {
        return await apiRequest<T>(path, { ...options, token });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) logout();
        throw err;
      }
    },
    [token, logout],
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    const me = await request<User>('/auth/me');
    setUser(me);
  }, [token, request]);

  const value = useMemo<AuthValue>(
    () => ({ status, user, login, register, logout, refresh, setUser, request }),
    [status, user, login, register, logout, refresh, request],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook truy cập trạng thái xác thực và các thao tác tài khoản từ AuthContext */
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong <AuthProvider>');
  return ctx;
}

