import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// High-visibility, crisp vector SVG favicon for Perspective Group
// 512x512 ViewBox with a rounded rectangle container and bold, geometric 'P' vector path
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E85D42"/>
      <stop offset="100%" stop-color="#C8432A"/>
    </linearGradient>
  </defs>
  <!-- Background Badge filling the frame -->
  <rect x="0" y="0" width="512" height="512" rx="100" fill="url(#bgGrad)"/>
  
  <!-- Bold Geometric 'P' Path taking up ~80% of the canvas height -->
  <path fill="#FFFFFF" d="M 128 80 H 290 C 370 80 424 126 424 206 C 424 286 370 332 290 332 H 216 V 432 H 128 V 80 Z M 216 160 V 252 H 282 C 322 252 342 236 342 206 C 342 176 322 160 282 160 H 216 Z" />
</svg>`;

async function main() {
  const publicDir = path.join(process.cwd(), 'public');
  
  // Save SVG
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf-8');
  console.log('Saved favicon.svg');

  // Generate 512x512 PNG
  const buffer512 = await sharp(Buffer.from(svgContent))
    .resize(512, 512)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), buffer512);
  console.log('Saved favicon.png (512x512)');

  // Generate 180x180 Apple Touch Icon
  const buffer180 = await sharp(Buffer.from(svgContent))
    .resize(180, 180)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), buffer180);
  console.log('Saved apple-touch-icon.png (180x180)');

  // Generate 32x32 Favicon PNG / ICO fallback
  const buffer32 = await sharp(Buffer.from(svgContent))
    .resize(32, 32)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), buffer32);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), buffer32);
  console.log('Saved favicon.ico & favicon-32x32.png');
}

main().catch(console.error);
