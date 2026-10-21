// Import kiểu Metadata từ Next.js để cấu hình SEO (ví dụ: tiêu đề tab trình duyệt)
import type { Metadata } from 'next';

// Import component AuthGate: Đây đóng vai trò như một "bảo vệ". Nó sẽ kiểm tra xem người dùng 
// đã đăng nhập chưa. Nếu chưa đăng nhập, nó chặn lại và hiện form yêu cầu đăng nhập. 
// Nếu đã đăng nhập, nó mới mở cửa cho xem nội dung bên trong.
import AuthGate from '@/components/auth/AuthGate';

// Import component OrdersList: File này chứa phần ruột thực sự (logic gọi API lấy dữ liệu 
// các đơn hàng đã đặt từ database và hiển thị ra danh sách).
import OrdersList from '@/components/orders/OrdersList';

// Cấu hình tiêu đề của trang. Khi vào trang này, tab trên trình duyệt sẽ đổi thành chữ dưới đây.
export const metadata: Metadata = { title: 'Đơn hàng – BrewLite' };

// Component chính đại diện cho trang hiển thị danh sách đơn hàng
export default function OrdersPage() {
  return (
    // Thẻ <main> bọc toàn bộ nội dung chính của trang.
    // Các class Tailwind CSS được dùng để làm đẹp:
    // - mx-auto: tự động căn giữa trang.
    // - max-w-3xl: giới hạn chiều rộng tối đa (giúp giao diện không bị bè ngang quá xấu trên màn hình máy tính).
    // - px-4, pb-28, pt-6: các chỉ số padding (căn lề) để nội dung không dính sát vào lề và chừa chỗ cho thanh BottomNav ở dưới.
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 md:pb-16">
      
      {/* Tiêu đề chính của trang. Chữ to (text-3xl), in đậm (font-extrabold) */}
      <h1 className="text-3xl font-extrabold tracking-tight">Đơn hàng</h1>
      
      {/* Bao bọc danh sách đơn hàng bằng "cánh cổng" AuthGate. 
          Truyền sẵn dòng chữ title và description vào để nếu người dùng chưa đăng nhập, 
          màn hình sẽ in ra thông báo này khuyên họ đăng nhập. */}
      <AuthGate 
        title="Đăng nhập để xem đơn hàng" 
        description="Đơn của bạn được lưu theo tài khoản, xem được trên mọi thiết bị."
      >
        {/* Nếu người dùng ĐÃ ĐĂNG NHẬP, AuthGate sẽ "mở cửa" và render component OrdersList ở dưới đây ra màn hình */}
        <OrdersList />
      </AuthGate>
      
    </main>
  );
}