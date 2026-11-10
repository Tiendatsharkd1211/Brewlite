// Ảnh thật từ Unsplash (giấy phép Unsplash: dùng miễn phí, kể cả thương mại, không bắt buộc ghi nguồn).
export function photo(id: string, width = 800): string {
  return sized(`https://images.unsplash.com/photo-${id}`, width);
}

/** Thêm tham số cắt ảnh theo chiều rộng cho ảnh Unsplash; ảnh nguồn khác giữ nguyên */
export function sized(url: string, width = 800): string {
  if (!url.includes('images.unsplash.com')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}auto=format&fit=crop&w=${width}&q=75`;
}

export const HERO_IMAGE = '1571851534298-1ffa72eab79e'; // quán cà phê kiểu Sài Gòn xưa: bàn ghế gỗ, sàn gạch bông
export const AUTH_IMAGE = '1514066558159-fc8c737ef259'; // rót sữa vào cà phê
export const STORY_IMAGE = '1541437971345-e3a6af6cb491'; // bạn pha chế chăm chú rót nước pha cà phê
