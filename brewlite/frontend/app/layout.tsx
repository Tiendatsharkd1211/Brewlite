import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Be_Vietnam_Pro } from 'next/font/google';
import { AppStoreProvider } from '@/context/app-store';
import { AuthProvider } from '@/context/auth-context';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import QueryProvider from '@/components/layout/QueryProvider';
import { ProductSheetProvider } from '@/components/product/ProductSheetProvider';
import './globals.css';

// Cấu hình font Be Vietnam Pro tối ưu cho hiển thị tiếng Việt
const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-be-vietnam',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BrewLite – Đặt cà phê, thanh toán không tiền mặt',
  description: 'Đặt món trước tại BrewLite An Dương Vương, thanh toán bằng ví điện tử hoặc thẻ liên kết, tới quầy đọc mã đơn là lấy.',
};

export const viewport: Viewport = {
  themeColor: '#6f4e37',
  viewportFit: 'cover',
};

/** Layout gốc của ứng dụng: bọc các Provider toàn cục (Query, Auth, Store, UI) và khung điều hướng */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <QueryProvider>
          <AuthProvider>
            <AppStoreProvider>
              <ProductSheetProvider>
                <AppHeader />
                {children}
                <BottomNav />
              </ProductSheetProvider>
            </AppStoreProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

