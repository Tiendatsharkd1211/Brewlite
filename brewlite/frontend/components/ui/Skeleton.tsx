/** Khối giữ chỗ trong lúc tải dữ liệu, có dải sáng chạy ngang */
export default function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} aria-hidden="true" />;
}
