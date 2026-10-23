// Hình minh hoạ món bằng SVG theo màu đồ uống: nhẹ, không cần ảnh, chạy offline.
interface Props {
  color: string;
  kind: 'drink' | 'food';
  className?: string;
  /** Cốc rỗng, dùng cho trạng thái giỏ hàng trống */
  empty?: boolean;
}

export default function ProductArt({ color, kind, className, empty }: Props) {
  if (kind === 'food') {
    return (
      <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
        <ellipse cx="60" cy="96" rx="48" ry="10" fill="#e9dcc7" />
        <path d="M18 88 Q22 50 60 44 Q98 50 102 88 Z" fill={color} />
        <path d="M38 86 Q42 62 60 54 M60 54 Q78 62 82 86 M60 54 V86" stroke="#3b2a20" strokeOpacity="0.22" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 150" className={className} aria-hidden="true">
      <rect x="64" y="4" width="7" height="44" rx="3.5" fill="#c99a6b" transform="rotate(14 67 26)" />
      <path d="M28 40 H92 L85 136 Q84 144 76 144 H44 Q36 144 35 136 Z" fill="#fffaf2" stroke="#3b2a20" strokeWidth="3" strokeLinejoin="round" />
      {!empty && <path d="M31.6 64 H88.4 L84.5 135 Q83.8 141 76 141 H44 Q36.2 141 35.5 135 Z" fill={color} />}
      {!empty && <path d="M32 64 H88" stroke="#fffaf2" strokeOpacity="0.55" strokeWidth="3" />}
      <rect x="22" y="31" width="76" height="12" rx="6" fill="#3b2a20" />
    </svg>
  );
}
