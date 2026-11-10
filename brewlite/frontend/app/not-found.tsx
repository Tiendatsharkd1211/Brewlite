import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p className="kicker">Đính chính</p>
      <p className="mt-3 font-display text-8xl font-black leading-none">404</p>
      <h1 className="mt-3 text-3xl font-black">Trang này không có trong số báo hôm nay</h1>
      <p className="mt-3 text-roast/75">Đường dẫn có thể đã gõ sai hoặc trang đã được dời đi.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="inline-flex h-11 items-center bg-gold px-6 font-label text-sm font-semibold uppercase tracking-wider text-foam hover:bg-gold-deep">
          Về trang nhất
        </Link>
        <Link href="/menu" className="inline-flex h-11 items-center border-2 border-roast px-5 font-label text-sm font-semibold uppercase tracking-wider hover:bg-roast hover:text-cream">
          Xem thực đơn
        </Link>
      </div>
    </main>
  );
}
