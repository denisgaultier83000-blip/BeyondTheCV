import React from 'react';

interface ResponsiveImageProps {
  /** Fallback source (usually the original PNG/JPEG). */
  src: string;
  alt: string;
  /** Generated widths that must exist as `{base}-{w}.webp` and `{base}-{w}.avif`. */
  widths: number[];
  /** `sizes` attribute matching the displayed width. */
  sizes: string;
  width?: number;
  height?: number;
  loading?: 'eager' | 'lazy';
  decoding?: 'async' | 'sync' | 'auto';
  className?: string;
}

/**
 * Renders a responsive <picture> with AVIF/WebP srcSet and an original fallback.
 * Assumes `scripts/optimize-images.js` has generated the variants in /public.
 */
export function ResponsiveImage({
  src,
  alt,
  widths,
  sizes,
  width,
  height,
  loading = 'lazy',
  decoding = 'async',
  className,
}: ResponsiveImageProps) {
  const base = src.replace(/\.[^/.]+$/, '');
  const avifSrcSet = widths.map((w) => `${base}-${w}.avif ${w}w`).join(', ');
  const webpSrcSet = widths.map((w) => `${base}-${w}.webp ${w}w`).join(', ');

  return (
    <picture>
      <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} />
      <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        className={className}
      />
    </picture>
  );
}
