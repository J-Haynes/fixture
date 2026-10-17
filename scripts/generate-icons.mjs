// Generates the PWA icon set and favicon from src/app/icon.svg. Run: npm run icons
import sharp from 'sharp'; // ships with next
import fs from 'node:fs';
import path from 'node:path';
const repo = path.join(import.meta.dirname, '..');
const src = path.join(repo, 'src/app/icon.svg');
const BG = '#0b0b12';
const svg = fs.readFileSync(src);
const render = size => sharp(svg, { density: 72 * size / 1054 * 4 }).resize(size, size);

(async () => {
  for (const s of [192, 512]) await render(s).png().toFile(path.join(repo, `public/icon-${s}.png`));
  // iOS masks its own corners: full-bleed background, no transparency
  await render(180).flatten({ background: BG }).png().toFile(path.join(repo, 'src/app/apple-icon.png'));
  // Android maskable: logo inside the 80% safe zone on a full-bleed background
  const inner = await render(368).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: BG } })
    .composite([{ input: inner, gravity: 'centre' }]).png()
    .toFile(path.join(repo, 'public/icon-maskable-512.png'));
  // favicon.ico with embedded PNGs
  const sizes = [16, 32, 48];
  const pngs = await Promise.all(sizes.map(s => render(s).png().toBuffer()));
  const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  let offset = 6 + 16 * sizes.length;
  const dir = sizes.map((s, i) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(s, 0); e.writeUInt8(s, 1); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12); offset += pngs[i].length;
    return e;
  });
  fs.writeFileSync(path.join(repo, 'src/app/favicon.ico'), Buffer.concat([header, ...dir, ...pngs]));
  console.log('done');
})();
