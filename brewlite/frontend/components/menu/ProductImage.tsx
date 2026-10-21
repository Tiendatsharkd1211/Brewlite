'use client';

// Ảnh món thật. Nếu mất mạng hoặc ảnh lỗi thì tự đổi sang hình minh hoạ SVG, giao diện không bị vỡ.
import { useEffect, useRef, useState } from 'react';
import { sized } from '@/lib/images';
import type { Product } from '@/lib/types';
import ProductArt from './ProductArt';

interface Props {
  product: Product;
  width?: number;
  className?: string;
  priority?: boolean;
}

export default function ProductImage({ product, width = 600, className = '', priority }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // Ảnh có thể đã tải xong (hoặc lỗi) trước khi React kịp gắn sự kiện
  useEffect(() => {
    const img = ref.current;
    if (img?.complete) {
      if (img.naturalWidth === 0) setFailed(true);
      else setLoaded(true);
    }
  }, []);

  if (failed) {
    return (
      <div className={`grid place-items-center bg-cream ${className}`}>
        <ProductArt color={product.color} kind={product.kind} className="h-3/4 w-3/4" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={sized(product.imageUrl, width)}
      alt={product.name}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={`bg-crema/30 object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  );
}
