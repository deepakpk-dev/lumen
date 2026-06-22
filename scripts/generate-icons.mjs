// Rasterizes the source SVG icons in public/ into the PNG assets the manifest
// and iOS reference. Run with: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');

const jobs = [
  { src: 'icon.svg', out: 'icon-192.png', size: 192 },
  { src: 'icon.svg', out: 'icon-512.png', size: 512 },
  // iOS adds its own rounded mask, so it wants the standard (rounded) art.
  { src: 'icon.svg', out: 'apple-touch-icon.png', size: 180 },
  // Maskable art is full-bleed with the mark inside the safe zone.
  { src: 'icon-maskable.svg', out: 'icon-maskable-512.png', size: 512 },
];

for (const { src, out, size } of jobs) {
  const svg = await readFile(join(pub, src));
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(join(pub, out));
  console.log(`wrote public/${out} (${size}x${size}) from ${src}`);
}
