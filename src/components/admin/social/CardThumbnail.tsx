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
  brandLogo,
}: {
  card: SocialCard;
  format: SocialFormat;
  content: ResolvedContent;
  brandLogo?: { src?: string; light?: string; dark?: string };
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

    ctx.save();
    ctx.scale(scale, scale);
    renderCard(ctx, card, format, { content, brandLogo });
    ctx.restore();
  }, [card, format, content, brandLogo]);

  return <canvas ref={canvasRef} className="w-full h-full object-contain" />;
}