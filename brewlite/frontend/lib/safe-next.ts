/** Chỉ cho chuyển hướng về đường dẫn nội bộ (tránh ?next=https://trang-la.com) */
export function safeNext(value: string | undefined): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}
