import Link from 'next/link';
import BestSellerRail from '@/components/menu/BestSellerRail';
import MenuBrowser from '@/components/menu/MenuBrowser';
import { ClockIcon, SparkIcon, WalletIcon } from '@/components/ui/Icons';
import { HERO_IMAGE, photo } from '@/lib/images';

const PERKS = [
  { Icon: ClockIcon, title: 'Đặt trước, không xếp hàng', text: 'Tới quầy An Dương Vương đọc mã đơn là lấy' },
  { Icon: WalletIcon, title: '100% không tiền mặt', text: 'Trừ tiền vào ví hoặc thẻ ảo đã liên kết' },
  { Icon: SparkIcon, title: 'Tích điểm mỗi đơn', text: '1.000đ = 1 điểm, đổi quà ngay' },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 md:pb-16">
      {/* Hero: ảnh thật toàn khối, chữ trắng trên lớp phủ tối */}
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-roast text-foam shadow-[0_40px_80px_-40px_rgba(59,42,32,.8)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo(HERO_IMAGE, 1600)}
          alt=""
          className="absolute inset-0 -z-10 h-full w-full animate-ken-burns object-cover opacity-80"
          fetchPriority="high"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-roast via-roast/75 to-roast/10" aria-hidden="true" />
        <div className="max-w-xl px-6 py-12 sm:px-12 sm:py-20">
          <p className="inline-flex animate-rise items-center gap-2 rounded-full bg-foam/15 px-3 py-1 text-sm font-semibold backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-gold" aria-hidden="true" /> Ưu đãi đến hết tháng 10
          </p>
          <h1 className="mt-4 animate-rise text-4xl font-extrabold leading-[1.05] tracking-tight [animation-delay:80ms] sm:text-6xl">
            Giảm 20% khi trả bằng MoMo
          </h1>
          <p className="mt-4 max-w-md animate-rise text-lg leading-relaxed text-foam/85 [animation-delay:160ms]">
            Nhập mã <b className="text-gold">MOMO20</b> ở bước thanh toán, giảm tối đa 25.000đ. Đặt trước, tới quầy là có ly.
          </p>
          <div className="mt-8 flex animate-rise flex-wrap gap-3 [animation-delay:240ms]">
            <Link href="#menu" className="inline-flex h-12 items-center rounded-full bg-gold px-7 font-bold text-roast shadow-[0_12px_30px_-10px_rgba(224,154,43,.9)] transition-[background-color,transform] hover:bg-gold-deep hover:text-foam active:scale-[0.98]">
              Đặt ngay
            </Link>
            <Link href="/account" className="inline-flex h-12 items-center rounded-full border-2 border-foam/40 px-6 font-semibold text-foam transition-colors hover:border-foam hover:bg-foam/10">
              Xem điểm thưởng
            </Link>
          </div>
        </div>
      </section>

      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {PERKS.map(({ Icon, title, text }) => (
          <li key={title} className="flex items-center gap-3 rounded-2xl bg-foam px-4 py-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cream text-espresso">
              <Icon className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-bold leading-tight">{title}</span>
              <span className="block text-sm text-roast/60">{text}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-12">
        <BestSellerRail />
      </div>

      <div className="mt-14">
        <MenuBrowser title="Thực đơn hôm nay" />
      </div>
    </main>
  );
}
