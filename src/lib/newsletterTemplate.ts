/**
 * Newsletter email template.
 *
 * Extracted so the admin preview and the real send render identical HTML.
 * Previously the markup lived inline in the send handler, which meant the
 * preview could only ever be an approximation of what subscribers received.
 *
 * Deliberately inline-styled and table-free: Gmail strips <style> blocks and
 * many clients ignore external CSS, so every rule has to be on the element.
 */

export interface NewsletterTemplateInput {
  subject: string;
  body: string;
  /** Optional hero image chosen from the device or the media library. */
  imageUrl?: string;
  /** Rendered width in pixels for the hero image. */
  imageWidth?: number;
  viaGmail: boolean;
  lang: 'fr' | 'en';
  /** Images placed within the body, not just above it. */
  inlineImages?: InlineImage[];
}

/**
 * An image placed inside the body text, at a chosen position.
 */
export interface InlineImage {
  /** Where it sits in the body, as a 0-based line index. */
  afterLine: number;
  url: string;
  caption?: string;
  width?: number;
}

/** Escape text destined for an HTML body. */
export function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const NEWSLETTER_BRAND = 'Perspective Group';

/** The Perspective Group accent, matching the existing visual identity. */
const ACCENT = '#E85D42';

export function buildNewsletterHtml(input: NewsletterTemplateInput): string {
  const { subject, body, imageUrl, imageWidth, viaGmail, lang, inlineImages } = input;
  const w = Math.max(120, Math.min(Number(imageWidth) || 560, 600));

  const hero = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="" width="${w}" style="width:${w}px;max-width:100%;height:auto;display:block;border:0;border-radius:6px;margin:0 0 20px 0;" />`
    : '';

  const footerNote = viaGmail
    ? (lang === 'fr'
        ? 'Dispatché via Gmail'
        : 'Dispatched via Gmail')
    : (lang === 'fr'
        ? 'Dispatché par Perspective Group'
        : 'Dispatched by Perspective Group');

  // INLINE IMAGES.
  //
  // The body is escaped line by line and an <img> is injected after the chosen
  // line, so an image can sit inside the article rather than only above it.
  // Every part is escaped and the position is clamped, because a hand-edited
  // `afterLine` outside the body would otherwise either drop the image or shift
  // the whole layout.
  const lines = String(body ?? '').split('\n');
  const byLine = new Map<number, InlineImage[]>();
  (inlineImages || []).forEach(img => {
    if (!img?.url) return;
    const pos = Math.max(0, Math.min(Number(img.afterLine) || 0, lines.length));
    const list = byLine.get(pos) || [];
    list.push(img);
    byLine.set(pos, list);
  });

  const renderBody = (): string => {
    let html = '';
    // afterLine 0 means "before any text", so the very first position is
    // rendered ahead of line 0.
    (byLine.get(0) || []).forEach(img => { html += renderInlineImage(img); });

    lines.forEach((line, i) => {
      if (line.trim() !== '') {
        html += `<p style="margin:0 0 12px 0;">${escapeHtml(line)}</p>`;
      } else {
        html += `<div style="height:10px;line-height:1;"></div>`;
      }
      // Position N renders after the first N lines of text.
      (byLine.get(i + 1) || []).forEach(img => { html += renderInlineImage(img); });
    });
    return html;
  };

  const renderInlineImage = (img: InlineImage): string => {
    const iw = Math.max(120, Math.min(Number(img.width) || 520, 600));
    const caption = img.caption
      ? `<p style="margin:6px 0 16px 0;font-size:11px;color:#a1a1aa;text-align:center;font-style:italic;">${escapeHtml(img.caption)}</p>`
      : '<div style="height:14px;line-height:1;"></div>';
    return `<img src="${escapeHtml(img.url)}" alt="" width="${iw}" style="width:${iw}px;max-width:100%;height:auto;display:block;border:0;border-radius:6px;margin:8px auto 0 auto;" />${caption}`;
  };

  const bodyHtml = renderBody();

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#18181b;line-height:1.65;background:#ffffff;border:1px solid #e4e4e7;padding:28px;border-radius:10px;">
      <p style="margin:0 0 20px 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${ACCENT};font-weight:700;">
        ${NEWSLETTER_BRAND}
      </p>
      ${hero}
      <h1 style="margin:0 0 16px 0;font-size:21px;line-height:1.3;color:#18181b;font-weight:700;">
        ${escapeHtml(subject)}
      </h1>
      <div style="font-size:15px;color:#3f3f46;margin:0 0 24px 0;">
${bodyHtml}
      </div>
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0 14px 0;" />
      <p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center;">
        ${NEWSLETTER_BRAND} &middot; ${footerNote}
      </p>
    </div>
  `.trim();
}
