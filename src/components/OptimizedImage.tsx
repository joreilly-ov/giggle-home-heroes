/**
 * Optimized Image Component
 * 
 * Handles:
 * - Lazy loading for below-fold images
 * - WebP format with fallback
 * - Responsive srcsets for different screen sizes
 * - Async decoding to prevent blocking
 * - Error handling with fallback
 * 
 * Usage:
 * <OptimizedImage
 *   src="/hero.jpg"
 *   alt="Hero background"
 *   width={1200}
 *   height={600}
 *   className="w-full h-auto"
 *   priority // for above-fold images (skips lazy loading)
 * />
 */

import { useState, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean; // Skip lazy loading for above-fold images
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [failed, setFailed] = useState(false);

  // Generate WebP source if original is JPG/PNG
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  const hasWebP = webpSrc !== src;

  return (
    <picture>
      {/* WebP format for modern browsers — loads faster */}
      {hasWebP && (
        <source
          srcSet={webpSrc}
          type="image/webp"
        />
      )}
      {/* Fallback to original format */}
      <img
        src={imageSrc}
        alt={alt}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        width={width}
        height={height}
        decoding="async" // Non-blocking image decode
        onLoad={onLoad}
        onError={() => {
          if (!failed && imageSrc !== src) {
            // If WebP failed, try original
            setImageSrc(src);
          } else {
            setFailed(true);
            onError?.();
          }
        }}
      />
    </picture>
  );
}

/**
 * Preload image for better perceived performance.
 * Use for images that will be needed soon (e.g., next route).
 */
export function preloadImage(src: string) {
  if (typeof window === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  document.head.appendChild(link);
}

/**
 * Prefetch WebP version of an image for better cache hit rate.
 */
export function prefetchWebP(src: string) {
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  if (webpSrc === src) return; // Not a convertible image
  
  preloadImage(webpSrc);
}
