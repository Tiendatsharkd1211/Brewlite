import type { Metadata } from 'next';
import Link from 'next/link';
import FeedbackForm from '@/components/contact/FeedbackForm';
import Article from '@/components/layout/Article';
import { STORE } from '@/lib/mock-data';

export const metadata: Metadata = { title: 'Liên hệ – BrewLite', description: `Địa chỉ, giờ mở cửa, hỏi đáp và gửi góp ý cho ${STORE.name}.` };

const MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STORE.address)}`;

/** Câu trả lời: một đoạn, hoặc các bước làm theo (steps), có thể kèm lời nhắc cuối (note) */
interface Faq {
  q: string;
  a?: string;
  steps?: string[];
  note?: string;
}

// Mọi câu trả lời khớp với cách web đang chạy thật (luật giá, điểm, trạng thái đơn) và trang Chính sách
const FAQ_GROUPS: { id: string; title: string; items: Faq[] }[] = [
  {
    id: 'dat-mon',
    title: 'Đặt món và nhận món',
    items: [
      {
        q: 'Đặt món trên web như thế nào?',
        steps: [
          'Vào Thực đơn, bấm vào món muốn uống.',
          'Chọn size, độ ngọt, lượng đá, topping (tối đa 5) và ghi chú nếu cần, rồi bấm Thêm vào giỏ.',
          'Bấm Giỏ hàng ở góc trên bên phải, kiểm tra lại món và bấm Thanh toán.',
          'Chọn Đến lấy tại quán (lấy ngay hoặc hẹn giờ) hoặc Giao tận nơi, chọn cách trả tiền rồi đặt đơn.',
        ],
        note: 'Bạn cần đăng nhập ở bước thanh toán để quán gửi thông báo và cộng điểm cho bạn.',
      },
      {
        q: 'Làm sao biết ly của tôi đã pha xong?',
        a: 'Sau khi trả tiền, trang theo dõi đơn hiện bốn bước: Đã thanh toán, Đang pha chế, Sẵn sàng lấy món, Đã hoàn thành. Mỗi lần đơn đổi bước, chuông Thông báo ở đầu trang sẽ báo cho bạn, kể cả khi bạn đang xem trang khác. Web tự cập nhật khoảng 15 giây một lần, không cần tải lại trang.',
      },
      {
        q: 'Tới quầy rồi mà quên mã đơn?',
        steps: ['Đăng nhập trên điện thoại.', 'Vào Đơn của tôi và mở đơn vừa đặt.', 'Mã đơn có dạng BL và 6 chữ số, nằm ngay đầu trang. Đọc mã này cho nhân viên.'],
        note: 'Thông báo "đơn đã sẵn sàng" trong chuông cũng ghi mã đơn.',
      },
      {
        q: 'Giao tận nơi tốn phí bao nhiêu, mất bao lâu?',
        a: 'Phí giao là 15.000đ mỗi đơn, thời gian dự kiến 25–35 phút sau khi quán nhận đơn. Nhập mã FREESHIP ở bước thanh toán để được miễn phí giao. Nhớ ghi địa chỉ đầy đủ số nhà, tên đường và phường để người giao tìm nhanh.',
      },
      {
        q: 'Một đơn đặt được tối đa bao nhiêu?',
        a: 'Mỗi món tối đa 20 ly và một đơn có tối đa 30 món khác nhau. Đặt cho cả văn phòng nhiều hơn thế, bạn gửi góp ý ở cuối trang để quán chuẩn bị trước.',
      },
    ],
  },
  {
    id: 'thanh-toan',
    title: 'Thanh toán',
    items: [
      {
        q: 'Quán nhận những cách trả tiền nào?',
        a: 'Đặt trên web là trả trước, bằng một trong hai cách: VNPay (thẻ ATM nội địa, thẻ quốc tế Visa/Mastercard, hoặc quét QR bằng app ngân hàng) và điểm BrewLite (1 điểm = 100đ, cần đủ điểm cho cả đơn). Web chưa nhận trả tiền mặt khi nhận món.',
      },
      {
        q: 'Tôi đã trả tiền nhưng đơn vẫn "Chờ thanh toán"?',
        steps: [
          'Thường là VNPay báo kết quả chậm. Bạn đợi 1–2 phút rồi tải lại trang đơn.',
          'Vẫn chưa đổi: bấm vào tài khoản ở góc trên bên phải, chọn Lịch sử giao dịch, mở giao dịch của đơn đó.',
          'Bấm "Kiểm tra lại với VNPay". Quán sẽ hỏi lại VNPay ngay lúc đó.',
          'VNPay xác nhận đã trừ tiền thì đơn tự chuyển sang Đã thanh toán và quầy bắt đầu pha. VNPay báo không có giao dịch nghĩa là tiền chưa bị trừ, bạn thanh toán lại.',
        ],
        note: 'Ngân hàng đã trừ tiền mà vẫn không cập nhật được, bạn gửi góp ý chủ đề "Thanh toán" kèm mã đơn.',
      },
      {
        q: 'Thanh toán thất bại có bị trừ tiền không?',
        a: 'Không. Đơn chuyển sang "Thanh toán lỗi", món trong đơn vẫn được giữ cho bạn. Mở lại đơn và bấm thanh toán để tạo một lần trả mới. Link VNPay chỉ dùng được trong 15 phút; quá thời gian này link hết hạn và bạn cũng chỉ cần thanh toán lại.',
      },
      {
        q: 'Lỡ bấm nút thanh toán nhiều lần có bị trừ tiền nhiều lần?',
        a: 'Không. Mỗi lượt bấm mang một mã riêng, bấm lặp lại cùng lượt đó thì hệ thống chỉ ghi nhận một lần thanh toán. Một đơn đã thanh toán xong cũng không thể bị thanh toán thêm lần nữa.',
      },
    ],
  },
  {
    id: 'huy-doi',
    title: 'Huỷ đơn và đổi trả',
    items: [
      {
        q: 'Huỷ đơn thế nào?',
        a: 'Đơn đang "Chờ thanh toán" hoặc "Thanh toán lỗi": mở đơn và bấm Huỷ đơn, món được trả lại cho khách khác đặt. Đơn đã thanh toán thì không tự huỷ trên web được; nếu quầy chưa pha, bạn liên hệ quầy để được huỷ và hoàn tiền về đúng cách bạn đã trả.',
      },
      {
        q: 'Ly pha không đúng như tôi đặt?',
        a: 'Bạn báo ngay tại quầy khi nhận ly, quầy pha lại miễn phí theo đúng đơn (size, độ ngọt, lượng đá, topping đều có trên phiếu pha của nhân viên).',
      },
    ],
  },
  {
    id: 'diem',
    title: 'Điểm, ưu đãi và đổi quà',
    items: [
      {
        q: 'Tích điểm như thế nào?',
        a: 'Mỗi 1.000đ trả qua VNPay được cộng 1 điểm, cộng ngay khi đơn thanh toán thành công. Đơn trả bằng điểm thì không được cộng thêm điểm. Thành viên mới được tặng 1.250 điểm khi đăng ký. Điểm không đổi được thành tiền mặt.',
      },
      {
        q: 'Dùng mã giảm giá ra sao?',
        a: 'Vào Ưu đãi và bấm "Dùng mã này", mã sẽ tự áp ở bước thanh toán; hoặc nhập mã trực tiếp ở bước thanh toán. Mỗi đơn dùng một mã. VNPAY20 cần chọn trả qua VNPay, BREW20 cho đơn từ 50.000đ, FREESHIP cho đơn giao tận nơi.',
      },
      {
        q: 'Đổi quà xong nhận quà ở đâu?',
        steps: ['Vào Ưu đãi, phần Đổi điểm lấy quà, bấm Đổi quà ở món quà bạn đủ điểm.', 'Bấm thêm lần nữa để xác nhận trừ điểm.', 'Mã quà được gửi vào chuông Thông báo. Tới quầy, đọc mã quà cho nhân viên để nhận.'],
      },
    ],
  },
  {
    id: 'tai-khoan',
    title: 'Tài khoản',
    items: [
      {
        q: 'Vì sao phải đăng nhập?',
        a: 'Đăng nhập để thanh toán, theo dõi đơn, nhận thông báo khi ly sẵn sàng, tích và dùng điểm, lưu món yêu thích (đổi máy vẫn còn). Mỗi lần đăng nhập được giữ 7 ngày trên thiết bị đó.',
      },
      {
        q: 'Quên mật khẩu thì làm sao?',
        a: 'Web chưa có chức năng tự đặt lại mật khẩu. Bạn gửi góp ý chủ đề "Tài khoản, đăng nhập" bằng đúng email đã đăng ký, quán sẽ hỗ trợ qua email.',
      },
    ],
  },
];

export default function ContactPage() {
  return (
    <Article kicker="Hỗ trợ khách hàng" title="Liên hệ và hỏi đáp" lead="Phần lớn câu hỏi về đơn hàng, thanh toán và điểm đã có lời đáp bên dưới. Chưa thấy câu của bạn thì gửi thư cho quán ở cuối trang.">
      <div className="grid gap-6 sm:grid-cols-2">
        <section className="border-2 border-roast p-5">
          <h2 className="kicker">Quầy nhận món</h2>
          <p className="mt-2 font-display text-2xl font-bold leading-tight">{STORE.name}</p>
          <p className="mt-1">{STORE.address}</p>
          <p className="mt-1">Mở cửa hằng ngày {STORE.hours}</p>
          <a href={MAP_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-label text-xs uppercase tracking-wider underline underline-offset-4 hover:text-gold">
            Mở bản đồ chỉ đường ↗
          </a>
        </section>
        <section className="flex flex-col border-2 border-roast p-5">
          <h2 className="kicker">Thư từ, góp ý</h2>
          <dl className="mt-2 space-y-2">
            <div>
              <dt className="font-label text-xs uppercase tracking-wider text-roast/60">Email</dt>
              <dd>
                <a href="mailto:hotro@brewlite.vn" className="underline underline-offset-4 hover:text-gold">
                  hotro@brewlite.vn
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-label text-xs uppercase tracking-wider text-roast/60">Thời gian trả lời</dt>
              <dd>Trong giờ mở cửa, thường dưới 1 ngày</dd>
            </div>
          </dl>
          <a href="#gop-y" className="mt-auto inline-flex h-10 items-center justify-center self-start bg-roast px-5 pt-0 font-label text-xs font-semibold uppercase tracking-wider text-cream hover:bg-espresso">
            Viết góp ý ngay ↓
          </a>
        </section>
      </div>

      {/* Hỏi đáp chia nhóm, có mục lục nhảy nhanh */}
      <section className="mt-12 border-t-[3px] border-double border-roast pt-4" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-3xl font-black">
          Hỏi đáp
        </h2>
        <nav className="mt-3 flex flex-wrap gap-2" aria-label="Nhóm câu hỏi">
          {FAQ_GROUPS.map((g) => (
            <a key={g.id} href={`#${g.id}`} className="border-2 border-roast/30 px-3 py-1.5 font-label text-xs font-semibold uppercase tracking-wider hover:border-roast">
              {g.title}
            </a>
          ))}
        </nav>

        {FAQ_GROUPS.map((g) => (
          <div key={g.id} id={g.id} className="mt-8 scroll-mt-36">
            <h3 className="kicker border-b-2 border-gold pb-1">{g.title}</h3>
            {g.items.map((f) => (
              <details key={f.q} className="group border-b border-roast/60 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold">
                  {f.q}
                  <span className="font-mono text-xl text-gold transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <div className="mt-2 max-w-3xl text-roast/85">
                  {f.a && <p>{f.a}</p>}
                  {f.steps && (
                    <ol className="mt-1 space-y-1.5">
                      {f.steps.map((s, i) => (
                        <li key={i} className="grid grid-cols-[1.75rem_1fr]">
                          <span className="font-mono font-semibold text-gold">{i + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                  {f.note && <p className="mt-2 border-l-2 border-gold pl-3 text-sm italic text-roast/70">{f.note}</p>}
                </div>
              </details>
            ))}
          </div>
        ))}
      </section>

      {/* Form góp ý */}
      <section id="gop-y" className="mt-12 scroll-mt-36 border-t-[3px] border-double border-roast pt-4" aria-labelledby="feedback-title">
        <h2 id="feedback-title" className="text-3xl font-black">
          Chưa thấy câu trả lời? Gửi thư cho quán
        </h2>
        <p className="mt-1 text-roast/75">
          Hỏi về đơn hàng hay thanh toán, bạn ghi kèm mã đơn để quán tra nhanh hơn. Xem cách quán dùng thông tin của bạn ở{' '}
          <Link href="/chinh-sach" className="underline underline-offset-4 hover:text-gold">
            Chính sách
          </Link>
          .
        </p>
        <div className="mt-5">
          <FeedbackForm />
        </div>
      </section>
    </Article>
  );
}
