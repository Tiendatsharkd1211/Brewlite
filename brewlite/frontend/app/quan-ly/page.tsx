import type { Metadata } from 'next';
import Overview from '@/components/manager/Overview';

export const metadata: Metadata = { title: 'Tổng quan kho – Quản lý BrewLite' };

export default function Page() {
  return <Overview />;
}
