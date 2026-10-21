// Bộ icon SVG nhỏ, vẽ bằng nét để đồng bộ. Màu lấy theo màu chữ (currentColor).
import type { ReactNode } from 'react';

type IconProps = { className?: string };

function Svg({ className = 'h-5 w-5', children }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></Svg>;
export const BagIcon = (p: IconProps) => <Svg {...p}><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></Svg>;
export const BellIcon = (p: IconProps) => <Svg {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></Svg>;
export const HomeIcon = (p: IconProps) => <Svg {...p}><path d="M4 11 12 4l8 7" /><path d="M6 9.5V20h12V9.5" /></Svg>;
export const CupIcon = (p: IconProps) => <Svg {...p}><path d="M6 8h12l-1.3 11.3a2 2 0 0 1-2 1.7H9.3a2 2 0 0 1-2-1.7L6 8Z" /><path d="M5 5.5h14" /><path d="m13 5.5 1-3" /></Svg>;
export const ReceiptIcon = (p: IconProps) => <Svg {...p}><path d="M6 3h12v18l-3-1.8L12 21l-3-1.8L6 21V3Z" /><path d="M9 8h6M9 12h6" /></Svg>;
export const UserIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></Svg>;
export const PinIcon = (p: IconProps) => <Svg {...p}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></Svg>;
export const ChevronLeftIcon = (p: IconProps) => <Svg {...p}><path d="m15 5-7 7 7 7" /></Svg>;
export const ChevronDownIcon = (p: IconProps) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>;
export const PlusIcon = (p: IconProps) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const MinusIcon = (p: IconProps) => <Svg {...p}><path d="M5 12h14" /></Svg>;
export const TrashIcon = (p: IconProps) => <Svg {...p}><path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12M9.5 7V4.5h5V7" /></Svg>;
export const CheckIcon = (p: IconProps) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>;
export const CloseIcon = (p: IconProps) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
export const PhoneIcon = (p: IconProps) => <Svg {...p}><path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5L16 14l4 1.5V19a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z" /></Svg>;
export const RouteIcon = (p: IconProps) => <Svg {...p}><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="6" r="2.2" /><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8" /></Svg>;
export const CopyIcon = (p: IconProps) => <Svg {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></Svg>;
export const AlertIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></Svg>;
export const HeartIcon = ({ className = 'h-5 w-5', filled }: IconProps & { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.1a4.3 4.3 0 0 1 7.5 2.7C19.5 15.4 12 20 12 20Z" />
  </svg>
);
export const StarIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8L12 3.5Z" />
  </svg>
);
export const EyeIcon = (p: IconProps) => <Svg {...p}><path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></Svg>;
export const EyeOffIcon = (p: IconProps) => <Svg {...p}><path d="M4 4l16 16M10 6a9.7 9.7 0 0 1 2-.2c6 0 9.5 6.2 9.5 6.2a16 16 0 0 1-3 3.6M6.4 7.6A16 16 0 0 0 2.5 12s3.5 6.5 9.5 6.5a9 9 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Svg>;
export const LogoutIcon = (p: IconProps) => <Svg {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" /></Svg>;
export const EditIcon = (p: IconProps) => <Svg {...p}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></Svg>;
export const LockIcon = (p: IconProps) => <Svg {...p}><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></Svg>;
export const ClockIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>;
export const SparkIcon = (p: IconProps) => <Svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></Svg>;
export const WalletIcon = (p: IconProps) => <Svg {...p}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v4" /><rect x="4" y="9" width="16" height="10.5" rx="2.5" /><path d="M16 14.25h.01" /></Svg>;
