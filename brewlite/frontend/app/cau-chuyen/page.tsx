import type { Metadata } from 'next';
import Link from 'next/link';
import Article from '@/components/layout/Article';
import { STORY_IMAGE, photo } from '@/lib/images';
import { STORE } from '@/lib/mock-data';

export const metadata: Metadata = { title: 'Câu chuyện – BrewLite', description: 'Quầy cà phê nhỏ ở góc An Dương Vương, nhưng cái tâm thì không nhỏ: từ hạt rang mộc tới ly pha phin.' };

// Từ hạt tới ly: bốn chặng, mỗi chặng một ảnh in cùng tông với thực đơn
const JOURNEY = [
  { n: 'I', img: '1671225142630-6fd7deff0def', alt: 'Bao hạt cà phê rang', title: 'Hạt', text: 'Robusta cho phin đậm vị, arabica cho cà phê máy thơm và chua nhẹ.' },
  { n: 'II', img: '1537130508299-46ab547b4be3', alt: 'Máy rang đổ hạt cà phê ra khay', title: 'Rang mộc', text: 'Không bơ, không hương liệu. Rang mẻ nhỏ để hạt giữ mùi tự nhiên.' },
  { n: 'III', img: '1789993603890-da860709dc9d', alt: 'Phin nhôm nhỏ giọt trên ly', title: 'Pha', text: 'Phin nhỏ giọt cho cà phê sữa đá, bạc xỉu. Máy espresso cho latte, cappuccino.' },
  { n: 'IV', img: '1791969777417-e16d34aced59', alt: 'Hai người pha chế đứng ở quầy', title: 'Tới tay bạn', text: 'Đơn đặt trên web vào thẳng màn hình quầy. Ly xong là web báo, bạn ghé lấy là đi.' },
];

// Khớp với những gì web làm thật và trang Chính sách
const PROMISES = [
  { title: 'Giá niêm yết, không phụ thu', text: 'Giá trên web là giá tại quầy. Tiền của đơn do hệ thống của quán tính, không đổi khi bạn thanh toán.' },
  { title: 'Ly đúng như bạn chọn', text: 'Size, độ ngọt, lượng đá, topping và ghi chú đều hiện trên phiếu pha của nhân viên.' },
  { title: 'Sai món thì pha lại', text: 'Ly không đúng đơn, bạn báo ngay tại quầy là được pha lại miễn phí.', href: '/chinh-sach', link: 'Xem chính sách' },
];

const DAY = [
  { time: '06:30', text: 'Mở cửa, mẻ phin đầu tiên nhỏ giọt cho khách đi làm sớm.' },
  { time: '07:00', text: 'Giờ đông nhất trong ngày. Khách đặt trước tới quầy đọc mã là cầm ly đi.' },
  { time: '14:00', text: 'Mẻ bánh chuối nướng và muffin buổi chiều ra lò.' },
  { time: '18:00', text: 'Trà trái cây và đá xay được gọi nhiều hơn cà phê.' },
  { time: '22:00', text: 'Đóng cửa, quầy lau dọn và xay hạt chuẩn bị cho sáng mai.' },
];

const MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STORE.address)}`;

export default function StoryPage() {
  return (
    <Article kicker="Câu chuyện" title="Quầy cà phê nhỏ, nhưng cái tâm thì không nhỏ" lead="Sáng nào cũng có một hàng dài người đứng chờ gọi món. Chúng tôi muốn bạn khỏi phải chờ.">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo(STORY_IMAGE, 1400)} alt="Bạn pha chế chăm chú rót nước pha cà phê ở quầy" className="newsprint aspect-[21/9] w-full object-cover" />
      <div className="mt-6 gap-8 sm:columns-2">
        <p className="first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-6xl first-letter:font-black first-letter:leading-[0.8]">
          BrewLite mở cửa từ 6 giờ 30 sáng ở {STORE.address}. Cà phê pha phin từ hạt robusta rang mộc, cà phê máy từ arabica, cùng trà trái cây và bánh nướng mỗi sáng.
        </p>
        <p className="mt-3">
          Giờ cao điểm, quán đông nhất là lúc gọi món và trả tiền. Vì vậy chúng tôi để bạn đặt trước trên điện thoại: chọn món, chọn độ ngọt, lượng đá, trả qua VNPay, rồi ghé quầy nhận ly đã pha sẵn.
        </p>
        <p className="mt-3">
          Khách quen được tích điểm sau mỗi đơn để đổi bánh, nâng size hoặc trừ vào lần sau. Có góp ý gì về đồ uống, bạn cứ nhắn cho chúng tôi ở mục Liên hệ.
        </p>
      </div>

      {/* Từ hạt tới ly */}
      <section className="mt-12" aria-labelledby="journey-title">
        <div className="flex items-end justify-between gap-3 border-b-2 border-roast pb-2">
          <h2 id="journey-title" className="text-3xl font-black">
            Từ hạt tới ly
          </h2>
          <p className="kicker hidden sm:block">Bốn chặng của một ly cà phê</p>
        </div>
        <ol className="mt-5 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4">
          {JOURNEY.map((j) => (
            <li key={j.n}>
              <div className="aspect-[4/5] overflow-hidden border border-roast bg-cream p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo(j.img, 500)} alt={j.alt} loading="lazy" className="menu-print h-full w-full object-cover" />
              </div>
              <p className="mt-3 font-display text-3xl font-black leading-none text-gold">{j.n}.</p>
              <h3 className="mt-1 font-display text-xl font-black italic">{j.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-roast/80">{j.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <blockquote className="my-12 border-y-[3px] border-double border-roast py-6 text-center font-display text-2xl font-bold italic leading-snug sm:text-3xl">
        “Pha đúng lúc bạn tới, để ly cà phê luôn còn thơm.”
      </blockquote>

      {/* Ba điều quán giữ */}
      <section aria-labelledby="promise-title">
        <h2 id="promise-title" className="text-center text-3xl font-black">
          Ba điều quán giữ
        </h2>
        <ul className="mt-6 grid gap-6 md:grid-cols-3 md:gap-0">
          {PROMISES.map((p, i) => (
            <li key={p.title} className={`md:px-6 ${i > 0 ? 'md:border-l md:border-roast' : 'md:pl-0'} ${i === PROMISES.length - 1 ? 'md:pr-0' : ''}`}>
              <p className="font-display text-4xl font-black leading-none text-gold">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="mt-2 font-display text-xl font-black">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-roast/80">{p.text}</p>
              {p.href && (
                <Link href={p.href} className="mt-2 inline-block font-label text-xs font-semibold uppercase tracking-wider underline underline-offset-4 hover:text-gold">
                  {p.link} →
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Một ngày ở quán + Ghé quán */}
      <div className="mt-12 grid gap-8 border-t-[3px] border-double border-roast pt-6 md:grid-cols-[1fr_17rem]">
        <section aria-labelledby="day-title">
          <h2 id="day-title" className="text-3xl font-black">
            Một ngày ở quán
          </h2>
          <ol className="mt-4">
            {DAY.map((d) => (
              <li key={d.time} className="grid grid-cols-[4.5rem_1fr] gap-4 border-b border-dotted border-roast/60 py-3 last:border-b-0">
                <span className="font-mono text-lg font-semibold text-gold">{d.time}</span>
                <span className="text-roast/85">{d.text}</span>
              </li>
            ))}
          </ol>
        </section>

        <aside className="border-2 border-roast p-5" aria-labelledby="visit-title">
          <p className="kicker">Ghé quán</p>
          <h2 id="visit-title" className="mt-1 font-display text-2xl font-black leading-tight">
            {STORE.name}
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="font-label text-[11px] uppercase tracking-wider text-roast/60">Địa chỉ</dt>
              <dd>{STORE.address}</dd>
            </div>
            <div>
              <dt className="font-label text-[11px] uppercase tracking-wider text-roast/60">Mở cửa</dt>
              <dd>Hằng ngày {STORE.hours}</dd>
            </div>
          </dl>
          <a href={MAP_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-label text-xs font-semibold uppercase tracking-wider underline underline-offset-4 hover:text-gold">
            Mở bản đồ chỉ đường ↗
          </a>
          <Link href="/menu" className="mt-4 flex h-11 items-center justify-center bg-gold font-label text-sm font-semibold uppercase tracking-wider text-foam hover:bg-gold-deep">
            Đặt trước, khỏi chờ
          </Link>
          <Link href="/lien-he" className="mt-2 flex h-11 items-center justify-center border-2 border-roast font-label text-sm font-semibold uppercase tracking-wider hover:bg-roast hover:text-cream">
            Gửi góp ý
          </Link>
        </aside>
      </div>
    </Article>
  );
}
