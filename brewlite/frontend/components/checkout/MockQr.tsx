// Mã QR MINH HOẠ (không quét được). Khi tích hợp thật, backend tạo chuỗi VietQR
// theo chuẩn Napas và frontend vẽ bằng thư viện QR, hoặc dùng ảnh do cổng thanh toán trả về.
const N = 29;

function seeded(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** 3 ô vuông định vị ở 3 góc (kèm 1 hàng trống bao quanh) */
function inFinder(x: number, y: number) {
  return (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
}

export default function MockQr({ value, className }: { value: string; className?: string }) {
  const rand = seeded(value);
  const cells: string[] = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (inFinder(x, y)) continue;
      if (rand() > 0.52) cells.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  const finder = (x: number, y: number) => `M${x} ${y}h7v7h-7z M${x + 1} ${y + 1}v5h5v-5z M${x + 2} ${y + 2}h3v3h-3z`;

  return (
    <svg viewBox={`-2 -2 ${N + 4} ${N + 4}`} className={className} role="img" aria-label="Mã QR minh hoạ">
      <rect x="-2" y="-2" width={N + 4} height={N + 4} fill="#fff" />
      <path d={cells.join('')} fill="#3b2a20" />
      <path d={`${finder(0, 0)} ${finder(N - 7, 0)} ${finder(0, N - 7)}`} fill="#3b2a20" fillRule="evenodd" />
    </svg>
  );
}
