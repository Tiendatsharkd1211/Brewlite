import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

// Import font Be Vietnam Pro từ Google Fonts (tối ưu cho Next.js)
import { Be_Vietnam_Pro } from 'next/font/google';

// Import các Provider để quản lý state (trạng thái) toàn cục của ứng dụng
import { AppStoreProvider } from '@/context/app-store'; // Quản lý state chung (giỏ hàng, thông báo,...)
import { AuthProvider } from '@/context/auth-context'; // Quản lý trạng thái người dùng (đăng nhập/đăng xuất)
import QueryProvider from '@/components/layout/QueryProvider'; // Quản lý cấu hình gọi API (thường dùng React Query)
import { ProductSheetProvider } from '@/components/product/ProductSheetProvider'; // Quản lý popup chi tiết sản phẩm

// Import các thành phần giao diện (UI) dùng chung cho mọi trang
import AppHeader from '@/components/layout/AppHeader'; // Thanh điều hướng/tiêu đề phía trên
import BottomNav from '@/components/layout/BottomNav'; // Thanh menu chức năng phía dưới (cho giao diện mobile)

// Import file CSS toàn cục (thường chứa cấu hình Tailwind CSS)
import './globals.css';

// Cấu hình font chữ Be Vietnam Pro: font thiết kế cho tiếng Việt, dấu không bị lệch ở cỡ chữ nhỏ
const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'], // Chỉ tải bộ ký tự Latin và Tiếng Việt để tối ưu dung lượng
  weight: ['400', '500', '600', '700', '800'], // Các độ đậm của chữ sẽ sử dụng trong dự án
  variable: '--font-be-vietnam', // Tạo biến CSS '--font-be-vietnam' để cấu hình vào Tailwind
  display: 'swap', // Hiển thị font mặc định trước khi tải xong font này để tránh lỗi chớp chữ (FOUC)
});

// Cấu hình Metadata: Dùng cho SEO, định nghĩa thẻ <meta> khi chia sẻ link hoặc tìm kiếm trên Google
export const metadata: Metadata = {
  title: 'BrewLite – Đặt cà phê, thanh toán không tiền mặt',
  description: 'Đặt món trước, thanh toán bằng ví điện tử, VietQR hoặc thẻ, tới quầy đọc mã là lấy.',
};

// Cấu hình Viewport: Tối ưu hóa cách trang web hiển thị trên thiết bị di động
export const viewport: Viewport = {
  themeColor: '#6f4e37', // Đổi màu thanh trạng thái (status bar) trên điện thoại thành màu nâu cà phê
  viewportFit: 'cover', // Cho phép web hiển thị tràn viền (phủ qua vùng tai thỏ/dynamic island)
};

// RootLayout: Thành phần gốc (layout cha) bọc toàn bộ ứng dụng Next.js
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // Khai báo ngôn ngữ tiếng Việt và nhúng biến font chữ đã cấu hình vào toàn bộ thẻ HTML
    <html lang="vi" className={beVietnam.variable}>
      {/* antialiased: làm mịn viền chữ; min-h-dvh: chiều cao tối thiểu bằng chiều cao màn hình thực tế */}
      <body className="min-h-dvh font-sans antialiased">
        
        {/* Lớp bọc 1: Cung cấp môi trường để gọi và cache dữ liệu API */}
        <QueryProvider>
          {/* Lớp bọc 2: Cung cấp thông tin phiên đăng nhập cho toàn ứng dụng */}
          <AuthProvider>
            {/* Lớp bọc 3: Cung cấp state chung (giỏ hàng, lựa chọn,...) */}
            <AppStoreProvider>
              {/* Lớp bọc 4: Cung cấp môi trường để mở popup sản phẩm ở bất kỳ trang nào */}
              <ProductSheetProvider>
                
                {/* Component Header luôn hiển thị ở trên cùng */}
                <AppHeader />
                
                {/* {children} là nội dung động của từng trang (ví dụ: Trang chủ, Menu, Hồ sơ) sẽ được nhúng vào đây */}
                {children}
                
                {/* Component Thanh điều hướng dưới cùng luôn hiển thị */}
                <BottomNav />
                
              </ProductSheetProvider>
            </AppStoreProvider>
          </AuthProvider>
        </QueryProvider>
        
      </body>
    </html>
  );
}