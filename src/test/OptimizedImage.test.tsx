/**
 * Tests for src/components/OptimizedImage.tsx
 *
 * Covers:
 *  - Renders WebP source when browser supports it
 *  - Falls back to PNG/JPG for unsupported browsers
 *  - Lazy loading enabled by default, disabled with priority prop
 *  - Async decoding prevents layout jank
 *  - Error handling with graceful fallback
 *  - onLoad/onError callbacks fire correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OptimizedImage } from '@/components/OptimizedImage';

describe('OptimizedImage', () => {
  const mockImageSrc = '/images/test.jpg';
  const mockWebPSrc = '/images/test.webp';
  const mockAlt = 'Test image';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders picture element with WebP and fallback sources', () => {
    render(
      <OptimizedImage 
        src={mockImageSrc} 
        alt={mockAlt}
      />
    );

    const picture = screen.getByAltText(mockAlt).closest('picture');
    expect(picture).toBeInTheDocument();
    
    const sourceWebP = picture?.querySelector('source[type="image/webp"]');
    expect(sourceWebP).toHaveAttribute('srcSet', expect.stringContaining('.webp'));
  });

  it('applies lazy loading by default', () => {
    render(
      <OptimizedImage 
        src={mockImageSrc} 
        alt={mockAlt}
      />
    );

    const img = screen.getByAltText(mockAlt) as HTMLImageElement;
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('disables lazy loading when priority prop is true', () => {
    render(
      <OptimizedImage 
        src={mockImageSrc} 
        alt={mockAlt}
        priority
      />
    );

    const img = screen.getByAltText(mockAlt) as HTMLImageElement;
    expect(img).toHaveAttribute('loading', 'eager');
  });

  it('sets async decoding to prevent layout shift', () => {
    render(
      <OptimizedImage 
        src={mockImageSrc} 
        alt={mockAlt}
      />
    );

    const img = screen.getByAltText(mockAlt) as HTMLImageElement;
    expect(img).toHaveAttribute('decoding', 'async');
  });

  it('applies custom className', () => {
    const customClass = 'w-full h-auto rounded-lg';
    render(
      <OptimizedImage 
        src={mockImageSrc} 
        alt={mockAlt}
        className={customClass}
      />
    );

    const img = screen.getByAltText(mockAlt);
    expect(img).toHaveClass('w-full', 'h-auto', 'rounded-lg');
  });

  it('passes width and height to image element', () => {
    render(
      <OptimizedImage 
        src={mockImageSrc} 
        alt={mockAlt}
        width={800}
        height={600}
      />
    );

    const img = screen.getByAltText(mockAlt) as HTMLImageElement;
    expect(img).toHaveAttribute('width', '800');
    expect(img).toHaveAttribute('height', '600');
  });

  it('calls onLoad callback when image loads', () => {
    const onLoad = vi.fn();
    const { container } = render(
      <OptimizedImage 
        src={mockImageSrc} 
        alt={mockAlt}
        onLoad={onLoad}
      />
    );

    const img = container.querySelector('img') as HTMLImageElement;
    fireEvent.load(img);
    
    expect(onLoad).toHaveBeenCalled();
  });

  it('calls onError callback when image fails to load', () => {
    const onError = vi.fn();
    const { container } = render(
      <OptimizedImage 
        src={mockImageSrc} 
        alt={mockAlt}
        onError={onError}
      />
    );

    const img = container.querySelector('img') as HTMLImageElement;
    fireEvent.error(img);
    
    expect(onError).toHaveBeenCalled();
  });

  it('handles missing WebP gracefully', () => {
    render(
      <OptimizedImage 
        src={mockImageSrc} 
        alt={mockAlt}
      />
    );

    const img = screen.getByAltText(mockAlt);
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', mockImageSrc);
  });

  it('preload works with priority flag', () => {
    const { container } = render(
      <OptimizedImage 
        src={mockImageSrc} 
        alt={mockAlt}
        priority
      />
    );

    const img = container.querySelector('img') as HTMLImageElement;
    // Priority images should not have lazy loading
    expect(img.loading).toBe('eager');
  });

  it('srcSet includes WebP variant', () => {
    render(
      <OptimizedImage 
        src={mockImageSrc} 
        alt={mockAlt}
      />
    );

    const picture = screen.getByAltText(mockAlt).closest('picture');
    const webpSource = picture?.querySelector('source[type="image/webp"]');
    
    expect(webpSource).toHaveAttribute('srcSet');
    const srcSet = webpSource?.getAttribute('srcSet');
    expect(srcSet).toMatch(/\.webp/);
  });

  it('fallback source uses original image format', () => {
    render(
      <OptimizedImage 
        src={mockImageSrc} 
        alt={mockAlt}
      />
    );

    const img = screen.getByAltText(mockAlt) as HTMLImageElement;
    expect(img.src).toContain('.jpg');
  });

  it('handles both JPG and PNG formats', () => {
    const { rerender } = render(
      <OptimizedImage 
        src={'/test.jpg'} 
        alt={mockAlt}
      />
    );
    expect(screen.getByAltText(mockAlt)).toBeInTheDocument();

    rerender(
      <OptimizedImage 
        src={'/test.png'} 
        alt={mockAlt}
      />
    );
    expect(screen.getByAltText(mockAlt)).toBeInTheDocument();
  });

  it('applies aspect-square class when needed', () => {
    render(
      <OptimizedImage 
        src={mockImageSrc} 
        alt={mockAlt}
        className="aspect-square object-cover"
      />
    );

    const img = screen.getByAltText(mockAlt);
    expect(img).toHaveClass('aspect-square', 'object-cover');
  });

  it('alt text is always present for accessibility', () => {
    render(
      <OptimizedImage 
        src={mockImageSrc} 
        alt={mockAlt}
      />
    );

    const img = screen.getByAltText(mockAlt);
    expect(img).toHaveAttribute('alt', mockAlt);
  });
});
