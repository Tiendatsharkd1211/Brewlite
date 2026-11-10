import type { Metadata } from 'next';
import Article from '@/components/layout/Article';

export const metadata: Metadata = { title: 'Chính sách – BrewLite', description: 'Chính sách đổi trả, hoàn tiền, bảo mật thông tin và điều khoản sử dụng BrewLite.' };

const SECTIONS = [
  {
    id: 'doi-tra',
    title: 'Đổi trả và hoàn tiền',
    items: [
      'Đơn chưa thanh toán: huỷ miễn phí bất kỳ lúc nào ở trang theo dõi đơn.',
      'Đơn đã thanh toán nhưng quầy chưa pha: liên hệ quầy để được huỷ và hoàn tiền về phương thức đã trả.',
      'Món pha sai so với đơn: quầy pha lại miễn phí khi bạn báo ngay tại quầy.',
      'Lỡ thanh toán hai lần cho cùng một đơn: khoản thứ hai được hoàn lại đầy đủ.',
    ],
  },
  {
    id: 'bao-mat',
    title: 'Bảo mật thông tin',
    items: [
      'BrewLite chỉ lưu họ tên, email, lịch sử đơn và điểm thưởng của bạn.',
      'Mật khẩu được mã hoá, nhân viên BrewLite cũng không xem được.',
      'BrewLite không lưu thông tin thẻ. Bạn nhập thẻ trên trang thanh toán của VNPay.',
      'Mỗi tài khoản chỉ xem được đơn và giao dịch của chính mình. Nhân viên quầy chỉ thấy tên khách và món cần pha.',
      'Đăng nhập sai nhiều lần liên tiếp, web sẽ tạm khoá đăng nhập trong ít phút để bảo vệ tài khoản.',
    ],
  },
  {
    id: 'dieu-khoan',
    title: 'Điều khoản sử dụng',
    items: [
      'Giá có thể thay đổi theo thời điểm; giá áp dụng là giá lúc bạn đặt đơn.',
      'Mỗi đơn áp dụng tối đa một mã giảm giá; mã có điều kiện riêng ghi ở mục Ưu đãi.',
      'Điểm thưởng chỉ cộng khi đơn thanh toán thành công và không quy đổi thành tiền mặt.',
      'BrewLite có thể khoá tài khoản dùng công cụ tự động để đặt đơn hoặc dò mã giảm giá.',
    ],
  },
];

export default function PolicyPage() {
  return (
    <Article kicker="Quy định" title="Chính sách và điều khoản" lead="Áp dụng cho mọi đơn đặt trên BrewLite.">
      {SECTIONS.map((s, i) => (
        <section key={s.id} id={s.id} className="scroll-mt-36 border-t-[3px] border-double border-roast pb-8 pt-4 first:border-t-0 first:pt-0">
          <h2 className="text-2xl font-black">
            <span className="text-gold">Điều {i + 1}.</span> {s.title}
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-6 marker:font-mono marker:text-roast/60">
            {s.items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </section>
      ))}
    </Article>
  );
}
