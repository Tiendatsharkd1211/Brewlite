import type { Metadata } from 'next';
import ProductDetail from '@/components/product/ProductDetail';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/products/${encodeURIComponent(id)}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const product = (await res.json()) as { name: string };
      return { title: `${product.name} – BrewLite` };
    }
  } catch {
    // Backend chưa chạy: dùng tiêu đề chung
  }
  return { title: 'Chi tiết món – BrewLite' };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  // key: chuyển sang món khác thì các lựa chọn được đặt lại từ đầu
  return <ProductDetail key={id} productId={id} />;
}
