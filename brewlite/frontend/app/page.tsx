import Link from 'next/link';
import HomeSidebar from '@/components/home/HomeSidebar';
import BestSellerRail from '@/components/menu/BestSellerRail';
import CategoryShelf from '@/components/menu/CategoryShelf';
import HomeHero from '@/components/home/HomeHero';
import { BellIcon, CupIcon, WalletIcon } from '@/components/ui/Icons';

const STEPS = [
  { n: 'I', Icon: CupIcon, title: 'Chọn món', text: 'Chọn size, độ ngọt, lượng đá và topping theo đúng khẩu vị của bạn.' },
  { n: 'II', Icon: WalletIcon, title: 'Thanh toán', text: 'Trả bằng thẻ ATM, thẻ quốc tế, quét QR qua VNPay hoặc dùng điểm BrewLite.' },
  { n: 'III', Icon: BellIcon, title: 'Nhận món', text: 'Ly sẵn sàng là web báo ngay. Tới quầy đọc mã đơn là nhận, không phải xếp hàng.' },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-10 pt-6">
      {/* Trang nhất: bài chính bên trái, cột giá bên phải, cách nhau bằng đường kẻ dọc */}
      <section className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:gap-0">
        <article className="lg:border-r lg:border-roast lg:pr-8">
          <HomeHero />
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/menu" className="inline-flex h-12 items-center bg-gold px-7 font-label text-sm font-semibold uppercase tracking-wider text-foam hover:bg-gold-deep">
              Đặt món ngay
            </Link>
            <Link href="/uu-dai" className="inline-flex h-12 items-center border-2 border-roast px-6 font-label text-sm font-semibold uppercase tracking-wider hover:bg-roast hover:text-cream">
              Xem mã ưu đãi
            </Link>
          </div>

          {/* Ba bước đặt món: khung "hướng dẫn" viền kép như mục chuyên đề trên báo xưa */}
          <section className="relative mt-12 border-[3px] border-double border-roast px-5 pb-7 pt-8 sm:px-8" aria-labelledby="how-title">
            <p className="kicker absolute -top-2.5 left-1/2 -translate-x-1/2 bg-cream px-3">Hướng dẫn</p>
            <h2 id="how-title" className="text-center text-3xl font-black sm:text-4xl">
              Đặt món chỉ ba bước
            </h2>
            <p className="mt-1 text-center font-serif italic text-roast/70">Từ lúc mở web tới lúc cầm ly cà phê trên tay</p>
            <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-6">
              {STEPS.map((s, i) => (
                <li key={s.n} className="relative text-center">
                  {/* Mũi tên chấm nối sang bước kế tiếp */}
                  {i < STEPS.length - 1 && (
                    <span className="absolute left-[calc(50%+2.75rem)] right-[calc(-50%+2.75rem)] top-8 hidden border-t-2 border-dotted border-roast/50 md:block" aria-hidden="true">
                      <span className="absolute -right-1 -top-[7px] text-xs text-roast/60">▶</span>
                    </span>
                  )}
                  <span className="keep-round mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-roast bg-cream text-gold">
                    <s.Icon className="h-7 w-7" />
                  </span>
                  <p className="kicker mt-3">Bước {s.n}</p>
                  <h3 className="mt-1 font-display text-2xl font-black italic">{s.title}</h3>
                  <p className="mx-auto mt-2 max-w-[16rem] text-[15px] leading-relaxed text-roast/80">{s.text}</p>
                </li>
              ))}
            </ol>
          </section>
        </article>

        <HomeSidebar />
      </section>


      <div className="mt-12">
        <BestSellerRail />
      </div>

      <div className="mt-12">
        <CategoryShelf />
      </div>
    </main>
  );
}
