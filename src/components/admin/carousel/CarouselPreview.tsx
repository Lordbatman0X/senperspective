import { useEffect, useRef } from 'react';
import type { CarouselCardKind, CarouselDraft } from '../../../lib/carousel/types';
import { CAROUSEL_SIZE } from '../../../lib/carousel/types';
import { renderCard } from '../../../lib/carousel/render';

interface CarouselPreviewProps {
  kind: CarouselCardKind;
  draft: CarouselDraft;
  /** Display width in CSS pixels; the canvas always renders at full 1080. */
  width?: number;
  className?: string;
}

/**
 * Draws one carousel card onto a canvas at full resolution and scales it down
 * with CSS.
 *
 * Rendering at 1080 and scaling (rather than shrinking the canvas) is what
 * keeps the preview pixel-identical to the downloaded PNG, so what the editor
 * approves is exactly what gets published.
 */
export function CarouselPreview({ kind, draft, width = 320, className }: CarouselPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Images are loaded in an effect so a slow network repaints the card when
  // they arrive, instead of rendering a card with its photo missing.
  const imagesRef = useRef<Record<string, CanvasImageSource>>({});

  useEffect(() => {
    let cancelled = false;
    const sources: Array<[string, string]> = [];
    if (draft.coverImage) sources.push(['coverImage', draft.coverImage]);
    if (draft.closingImage) sources.push(['closingImage', draft.closingImage]);
    if (draft.logoUrl) sources.push(['logo', draft.logoUrl]);

    const paint = () => {
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderCard(ctx, { kind, draft, images: imagesRef.current });
    };

    if (!sources.length) {
      imagesRef.current = {};
      paint();
      return () => { cancelled = true; };
    }

    Promise.all(sources.map(([key, url]) => new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!cancelled) imagesRef.current[key] = img;
        resolve();
      };
      img.onerror = () => resolve(); // a broken URL must not blank the whole card
      img.src = url;
    }))).then(paint);

    return () => { cancelled = true; };
  }, [kind, draft]);

  return (
    <canvas
      ref={canvasRef}
      width={CAROUSEL_SIZE}
      height={CAROUSEL_SIZE}
      style={{ width, height: width }}
      className={className}
    />
  );
}