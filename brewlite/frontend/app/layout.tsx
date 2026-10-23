import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Be_Vietnam_Pro } from 'next/font/google';
import { AppStoreProvider } from '@/context/app-store';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import QueryProvider from '@/components/layout/QueryProvider';
import './globals.css';

// Be Vietnam Pro: font thiết kế cho tiếng Việt, dấu không bị lệch ở cỡ chữ nhỏ
const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-be-vietnam',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BrewLite – Đặt cà phê, thanh toán không tiền mặt',
  description: 'Đặt món trước, thanh toán bằng ví điện tử, VietQR hoặc thẻ, tới quầy đọc mã là lấy.',
};

export const viewport: Viewport = {
  themeColor: '#6f4e37',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <QueryProvider>
          <AppStoreProvider>
            <AppHeader />
            {children}
            <BottomNav />
          </AppStoreProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
