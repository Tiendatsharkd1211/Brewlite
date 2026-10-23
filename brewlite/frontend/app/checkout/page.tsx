import type { Metadata } from 'next';
import Checkout from '@/components/checkout/Checkout';

export const metadata: Metadata = { title: 'Giỏ hàng & thanh toán – BrewLite' };

export default function CheckoutPage() {
  return <Checkout />;
}
