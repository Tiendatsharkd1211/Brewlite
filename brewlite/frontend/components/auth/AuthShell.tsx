import type { ReactNode } from 'react';
import { AUTH_IMAGE, photo } from '@/lib/images';

/**
 * Khung giao diện dùng chung cho các trang xác thực (Đăng nhập / Đăng ký):
 * - Desktop: hiển thị ảnh bìa thương hiệu kèm thông điệp (quote) bên trái, form nhập liệu bên phải.
 * - Mobile: căn giữa form nhập liệu trên màn hình nhỏ.
 */
export default function AuthShell({ children, quote }: { children: ReactNode; quote: string }) {

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 pb-28 pt-6 md:min-h-[calc(100dvh-5rem)] md:grid-cols-2 md:items-center md:pb-12">
      <div className="relative hidden h-full min-h-[560px] overflow-hidden rounded-[2rem] md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo(AUTH_IMAGE, 1200)} alt="" className="absolute inset-0 h-full w-full animate-ken-burns object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-roast via-roast/30 to-transparent" aria-hidden="true" />
        <p className="absolute inset-x-8 bottom-8 text-2xl font-extrabold leading-snug text-foam">{quote}</p>
      </div>
      <div className="mx-auto w-full max-w-md animate-rise">{children}</div>
    </main>
  );
}
