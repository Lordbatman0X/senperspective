/**
 * A small read-only preview of a card, used in the card strip.
 *
 * It renders through the same `renderCard` as the main stage and the export, at
 * a reduced backing size, so the strip can never show a different design from the
 * card it represents.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { SocialCard } from '../../../types/social';
import type { SocialFormat } from '../../../lib/social/networks';
import type { ResolvedContent } from '../../../lib/social/content';
import { renderCard } from '../../../lib/social/renderer';

export function CardThumbnail({
  card,
  format,
  content,
  logoSrc,
  logoLight,
  logoDark,
}: {
  card: SocialCard;
  format: SocialFormat;
  content: ResolvedContent;
  logoSrc?: string;
  logoLight?: string;
  logoDark?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Backing store at full size would allocate dozens of 1080x1350 canvases for
  // the strip; a small store is enough for a 90px preview.
  const scale = 0.09;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = Math.max(1, Math.round(format.width * scale));
    canvas.height = Math.max(1, Math.round(format.height * scale));

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill the brand logo onto any layer that has none, so a template seeded
    // without site settings still previews with the wordmark.
    const withLogo = {
      ...card,
      layers: card.layers.map(l => (
        l.kind === 'logo' && !l.src && logoSrc
          ? { ...l, src: logoSrc, toneSrc: { light: logoLight || logoSrc, dark: logoDark || logoSrc } }
          : l
      )),
    };

    ctx.save();
    ctx.scale(scale, scale);
    renderCard(ctx, withLogo, format, { content });
    ctx.restore();
  }, [card, format, content, logoSrc, logoLight, logoDark]);

  return <canvas ref={canvasRef} className="w-full h-full object-contain" />;
}