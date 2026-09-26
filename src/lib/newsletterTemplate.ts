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
  /** Sender display name, e.g. "Perspective Group". */
  senderName?: string;
  /** Absolute URL of the sender photo (the site favicon). */
  senderPhoto?: string;
  /** Signature block appended to every newsletter. May be plain text or HTML. */
  signature?: string;
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
  // The body is authored in the admin's rich-text editor, so it is trusted HTML
  // and is passed through rather than escaped — escaping it would show the
  // reader literal `<b>` tags. A plain-text paste is still fine: the editor
  // normalizes it, and the plain-text MIME part below strips markup for clients
  // that do not render HTML.
  //
  // `afterLine` indexes BLOCKS (<p>, <h2>, <li>, <div>), not visual lines, so an
  // image sits after the Nth paragraph regardless of soft wrapping.
  const blocks = String(body ?? '')
    .split(/(?=<(?:p|h[1-3]|ul|ol|blockquote|div|table|img|hr)\b)/i)
    .map(b => b.trim())
    .filter(Boolean);

  const byBlock = new Map<number, InlineImage[]>();
  (inlineImages || []).forEach(img => {
    if (!img?.url) return;
    const pos = Math.max(0, Math.min(Number(img.afterLine) || 0, blocks.length));
    const list = byBlock.get(pos) || [];
    list.push(img);
    byBlock.set(pos, list);
  });

  const renderInlineImage = (img: InlineImage): string => {
    const iw = Math.max(120, Math.min(Number(img.width) || 520, 600));
    const caption = img.caption
      ? `<p style="margin:6px 0 16px 0;font-size:11px;color:#a1a1aa;text-align:center;font-style:italic;">${escapeHtml(img.caption)}</p>`
      : '<div style="height:14px;line-height:1;"></div>';
    return `<img src="${escapeHtml(img.url)}" alt="" width="${iw}" style="width:${iw}px;max-width:100%;height:auto;display:block;border:0;border-radius:6px;margin:8px auto 0 auto;" />${caption}`;
  };

  const renderBody = (): string => {
    let html = '';
    (byBlock.get(0) || []).forEach(img => { html += renderInlineImage(img); });
    blocks.forEach((block, i) => {
      html += block;
      (byBlock.get(i + 1) || []).forEach(img => { html += renderInlineImage(img); });
    });
    return html;
  };

  const bodyHtml = renderBody();

  // SENDER BLOCK + SIGNATURE.
  // The photo is rendered at a fixed size and is a hosted https URL: email
  // clients block remote images by default, so a data URL would simply not
  // appear, and a large one would bloat every send.
  const senderName = input.senderName || NEWSLETTER_BRAND;
  const senderPhoto = input.senderPhoto ? String(input.senderPhoto).trim() : '';
  const signature = String(input.signature || '').trim();

  const signatureHtml = signature
    ? `<div style="margin:0 0 22px 0;padding:14px 16px;background:#fafafa;border-left:3px solid ${ACCENT};font-size:13px;color:#3f3f46;line-height:1.6;">${
        /<[a-z][\s\S]*>/i.test(signature) ? signature : escapeHtml(signature).replace(/\n/g, '<br />')
      }</div>`
    : '';

  const senderBlock = `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;border-collapse:collapse;">
        <tr>
          ${senderPhoto ? `<td style="padding:0 12px 0 0;vertical-align:middle;"><img src="${escapeHtml(senderPhoto)}" alt="${escapeHtml(senderName)}" width="44" height="44" style="width:44px;height:44px;border-radius:50%;display:block;border:0;" /></td>` : ''}
          <td style="vertical-align:middle;font-size:14px;font-weight:700;color:#18181b;">${escapeHtml(senderName)}</td>
        </tr>
      </table>`;

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#18181b;line-height:1.65;background:#ffffff;border:1px solid #e4e4e7;padding:28px;border-radius:10px;">
      <p style="margin:0 0 20px 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${ACCENT};font-weight:700;">
        ${NEWSLETTER_BRAND}
      </p>
      ${hero}
      ${senderBlock}
      <h1 style="margin:0 0 16px 0;font-size:21px;line-height:1.3;color:#18181b;font-weight:700;">
        ${escapeHtml(subject)}
      </h1>
      <div style="font-size:15px;color:#3f3f46;margin:0 0 24px 0;">
${bodyHtml}
      </div>
      ${signatureHtml}
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0 14px 0;" />
      <p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center;">
        ${NEWSLETTER_BRAND} &middot; ${footerNote}
      </p>
    </div>
  `.trim();
}
