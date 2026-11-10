import type { ReactNode } from 'react';

/** Khung chung cho các trang bài viết (Câu chuyện, Chính sách, Liên hệ, Ưu đãi): mục nhỏ đỏ, tít lớn, sapo nghiêng */
export default function Article({ kicker, title, lead, children }: { kicker: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-4xl px-4 pb-10 pt-8">
      <p className="kicker">{kicker}</p>
      <h1 className="mt-2 text-4xl font-black leading-[1.05] sm:text-5xl">{title}</h1>
      {lead && <p className="mt-3 border-b border-roast pb-5 font-serif text-lg italic leading-relaxed text-roast/75">{lead}</p>}
      <div className="mt-6 text-[15px] leading-relaxed">{children}</div>
    </main>
  );
}
