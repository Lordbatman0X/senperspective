import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// High-visibility vector SVG favicon: Standalone big orange 'P' with transparent background
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="pGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF5533"/>
      <stop offset="100%" stop-color="#E85D42"/>
    </linearGradient>
  </defs>
  <text x="50%" y="50%" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="340" fill="url(#pGrad)" text-anchor="middle" dominant-baseline="central" letter-spacing="-0.045em">P</text>
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

