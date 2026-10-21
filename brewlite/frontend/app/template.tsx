import type { ReactNode } from 'react';

/** Mỗi lần chuyển trang, nội dung mới hiện dần lên (chỉ đổi độ mờ để không ảnh hưởng thanh nút cố định) */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
