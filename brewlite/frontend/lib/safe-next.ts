/**
 * Lọc đường dẫn chuyển hướng an toàn nhằm chống tấn công Open Redirect.
 * Chỉ chấp nhận đường dẫn nội bộ bắt đầu bằng '/' (loại trừ '//' dẫn ra domain ngoài), mặc định về '/'.
 */
export function safeNext(value: string | undefined): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

