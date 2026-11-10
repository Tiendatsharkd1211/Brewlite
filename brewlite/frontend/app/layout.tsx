import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { IBM_Plex_Mono, Lora, Oswald, Playfair_Display } from 'next/font/google';
import { AppStoreProvider } from '@/context/app-store';
import { AuthProvider } from '@/context/auth-context';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import QueryProvider from '@/components/layout/QueryProvider';
import StorefrontSync from '@/components/layout/StorefrontSync';
import SiteChrome from '@/components/layout/SiteChrome';
import SiteFooter from '@/components/layout/SiteFooter';
import { ProductSheetProvider } from '@/components/product/ProductSheetProvider';
import './globals.css';

// Bộ chữ kiểu báo in, đều có bảng chữ tiếng Việt: Playfair (tít), Lora (bài), Oswald (nhãn, nút), Plex Mono (giá, mã đơn)
const playfair = Playfair_Display({ subsets: ['latin', 'vietnamese'], weight: ['700', '900'], variable: '--font-playfair', display: 'swap' });
const lora = Lora({ subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600', '700'], style: ['normal', 'italic'], variable: '--font-lora', display: 'swap' });
const oswald = Oswald({ subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600', '700'], variable: '--font-oswald', display: 'swap' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin', 'vietnamese'], weight: ['400', '600'], variable: '--font-plex-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'BrewLite – Đặt cà phê, thanh toán không tiền mặt',
  description: 'Đặt món trước tại BrewLite An Dương Vương, thanh toán bằng ví điện tử hoặc thẻ liên kết, tới quầy đọc mã đơn là lấy.',
};

export const viewport: Viewport = {
  themeColor: '#efe7d4',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" className={`${playfair.variable} ${lora.variable} ${oswald.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <QueryProvider>
          <AuthProvider>
            <StorefrontSync />
            <AppStoreProvider>
              <ProductSheetProvider>
                <SiteChrome
                  header={<AppHeader />}
                  footer={
                    <>
                      <SiteFooter />
                      <BottomNav />
                    </>
                  }
                >
                  {children}
                </SiteChrome>
              </ProductSheetProvider>
            </AppStoreProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
