// Đọc DATABASE_URL từ backend/.env; đặt độ trễ cổng thanh toán giả lập ngắn để test chạy nhanh
import { config } from 'dotenv';

config();
process.env.PAYMENT_MOCK_LATENCY_MS = '60';
