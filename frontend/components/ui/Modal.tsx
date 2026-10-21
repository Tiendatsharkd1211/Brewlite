'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  /** id của tiêu đề trong modal, để trình đọc màn hình đọc đúng tên hộp thoại */
  titleId: string;
  /** Bỏ trống = không cho đóng (ví dụ khi đang xử lý thanh toán) */
  onClose?: () => void;
  children: ReactNode;
  wide?: boolean;
  /** Bỏ khoảng đệm, để nội dung (ví dụ ảnh) tràn sát mép */
  flush?: boolean;
}

/** Trên mobile trượt lên từ đáy như app, trên màn hình lớn hiện giữa màn hình */
export default function Modal({ open, titleId, onClose, children, wide, flush }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-roast/55 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={`relative max-h-[92dvh] w-full animate-sheet-in overflow-y-auto overscroll-contain rounded-t-[1.75rem] bg-foam shadow-2xl sm:animate-pop-in sm:rounded-[1.75rem] ${
          flush ? '' : 'p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]'
        } ${wide ? 'sm:max-w-lg' : 'sm:max-w-md'}`}
      >
        {/* Thanh nắm kéo kiểu bottom sheet trên mobile */}
        <span className="pointer-events-none absolute left-1/2 top-2 z-10 h-1 w-10 -translate-x-1/2 rounded-full bg-roast/20 sm:hidden" aria-hidden="true" />
        {children}
      </div>
    </div>,
    document.body,
  );
}
