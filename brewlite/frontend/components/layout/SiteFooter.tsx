'use client';

import Link from 'next/link';
import { useManagerPreview } from '@/lib/preview';
import { STORE } from '@/lib/mock-data';

const COLUMNS = [
  {
    title: 'Mục lục',
    links: [
      { href: '/menu', label: 'Thực đơn hôm nay' },
      { href: '/uu-dai', label: 'Ưu đãi và mã giảm giá' },
      { href: '/orders', label: 'Đơn của tôi' },
      { href: '/payments', label: 'Lịch sử giao dịch' },
      { href: '/account', label: 'Tài khoản và điểm thưởng' },
    ],
  },
  {
    title: 'Về BrewLite',
    links: [
      { href: '/cau-chuyen', label: 'Câu chuyện BrewLite' },
      { href: '/lien-he', label: 'Liên hệ, góp ý' },
      { href: '/chinh-sach#doi-tra', label: 'Chính sách đổi trả, hoàn tiền' },
      { href: '/chinh-sach#bao-mat', label: 'Chính sách bảo mật' },
      { href: '/chinh-sach#dieu-khoan', label: 'Điều khoản sử dụng' },
    ],
  },
];

/** Chân trang kiểu "khung ghi chú cuối báo": thông tin quán, mục lục, chính sách */
export default function SiteFooter() {
  const preview = useManagerPreview();
  const hide = ['/orders', '/payments', '/account'];
  return (
    <footer className="mt-20 border-t-[3px] border-double border-roast pb-24 md:pb-10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2 lg:pr-8">
          <p className="font-display text-4xl font-black leading-none">BrewLite</p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-roast/80">Cà phê phin, cà phê máy, trà trái cây và bánh nướng mỗi sáng. Đặt trước trên web, tới quầy là có ly.</p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="font-label text-xs uppercase tracking-wider text-roast/60">Địa chỉ</dt>
            <dd>{STORE.address}</dd>
            <dt className="font-label text-xs uppercase tracking-wider text-roast/60">Mở cửa</dt>
            <dd>Hằng ngày {STORE.hours}</dd>
            <dt className="font-label text-xs uppercase tracking-wider text-roast/60">Thanh toán</dt>
            <dd>VNPay (thẻ ATM, thẻ quốc tế, QR) · Điểm BrewLite</dd>
          </dl>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="kicker border-b border-roast pb-1">{col.title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links
                .filter((l) => !preview || !hide.includes(l.href))
                .map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="font-serif normal-case tracking-normal underline-offset-4 hover:text-gold hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-6xl border-t border-roast px-4 pt-3 text-xs text-roast/60">© {new Date().getFullYear()} BrewLite. Mọi quyền được bảo lưu.</p>
    </footer>
  );
}
