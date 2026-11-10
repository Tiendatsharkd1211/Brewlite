import type { Metadata } from 'next';
import DealsView from '@/components/deals/DealsView';
import Article from '@/components/layout/Article';

export const metadata: Metadata = { title: 'Ưu đãi – BrewLite', description: 'Mã giảm giá đang áp dụng và quà đổi bằng điểm BrewLite.' };

export default function DealsPage() {
  return (
    <Article kicker="Mục ưu đãi" title="Mã giảm giá đang áp dụng" lead="Bấm “Dùng mã này”, mã sẽ tự áp ở bước thanh toán. Mỗi đơn dùng được một mã.">
      <DealsView />
    </Article>
  );
}
