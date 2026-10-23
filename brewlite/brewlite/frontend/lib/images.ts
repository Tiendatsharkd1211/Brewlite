// Ảnh thật từ Unsplash (giấy phép Unsplash: dùng miễn phí, kể cả thương mại, không bắt buộc ghi nguồn).
export function photo(id: string, width = 800): string {
  return sized(`https://images.unsplash.com/photo-${id}`, width);
}

/** Thêm tham số cắt ảnh theo chiều rộng cho ảnh Unsplash; ảnh nguồn khác giữ nguyên */
export function sized(url: string, width = 800): string {
  if (!url.includes('images.unsplash.com')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}auto=format&fit=crop&w=${width}&q=75`;
}

export const HERO_IMAGE = '1541167760496-1628856ab772'; // barista rót latte art
export const AUTH_IMAGE = '1514066558159-fc8c737ef259'; // rót sữa vào cà phê
