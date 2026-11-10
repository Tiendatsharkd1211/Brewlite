'use client';

// Bài chính trang nhất: chữ và ảnh do quản lý đặt ở khu Quản lý > Nội dung trang
import { photo, sized } from '@/lib/images';
import { useStorefront } from '@/lib/storefront';

/** Ảnh nhập là mã Unsplash hoặc đường dẫn đầy đủ */
export const heroSrc = (v: string, w = 1400) => (/^(https?:|data:|blob:)/.test(v) ? sized(v, w) : photo(v, w));

export default function HomeHero() {
  const c = useStorefront((s) => s.content);
  return (
    <>
      <p className="kicker">{c.heroKicker}</p>
      <h1 className="mt-2 text-4xl font-black leading-[1.02] sm:text-6xl">{c.heroTitle}</h1>
      <figure className="mt-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroSrc(c.heroImage)} alt="" className="newsprint aspect-[16/9] w-full object-cover" fetchPriority="high" />
        {c.heroCaption && <figcaption className="mt-2 border-b border-roast pb-3 font-serif text-lg italic leading-snug text-roast/80">{c.heroCaption}</figcaption>}
      </figure>
      <p className="mt-4 max-w-2xl text-[17px] leading-relaxed first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-6xl first-letter:font-black first-letter:leading-[0.8]">
        {c.heroLead}
      </p>
    </>
  );
}
