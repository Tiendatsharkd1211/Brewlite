// Import kiểu dữ liệu Metadata từ Next.js để cấu hình các thẻ SEO (như title, description)
import type { Metadata } from 'next';

// Import component Checkout từ thư mục components. 
// File này chỉ làm nhiệm vụ "trang chứa", còn toàn bộ giao diện và logic thanh toán nằm hết ở trong component Checkout này.
import Checkout from '@/components/checkout/Checkout';

// Cấu hình tiêu đề trang. Khi người dùng vào trang này, tab trên trình duyệt sẽ hiển thị dòng chữ này.
export const metadata: Metadata = { 
  title: 'Giỏ hàng & thanh toán – BrewLite' 
};

// Component chính đại diện cho trang (thường là file page.tsx). 
// Chữ "export default" giúp Next.js nhận diện đây là trang để hiển thị ra màn hình.
export default function CheckoutPage() {
  
  // Trả về và hiển thị component Checkout đã import ở trên
  return <Checkout />;
}