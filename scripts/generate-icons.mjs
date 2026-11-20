// Build the web and installed app icons from the adapted Lumen mark.
// Run with: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const source = join(root, 'scripts', 'assets', 'lumen-logo.png');
const plum = '#832750';

for (const size of [96, 512]) {
  await sharp(source).resize(size, size).webp({ quality: 92 }).toFile(join(pub, `lumen-mark-${size}.webp`));
}

for (const size of [192, 512]) {
  await sharp(source).resize(size, size).png().toFile(join(pub, `icon-${size}.png`));
}

// Use opaque tiles so the operating system can apply its own icon shape.
for (const { name, size, markSize } of [
  { name: 'apple-touch-icon.png', size: 180, markSize: 158 },
  // Keep the complete mark inside the center 80% maskable safe area.
  { name: 'icon-maskable-512.png', size: 512, markSize: 408 },
]) {
  const mark = await sharp(source).resize(markSize, markSize).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 3, background: plum } })
    .composite([{ input: mark, gravity: 'centre' }])
    .png()
    .toFile(join(pub, name));
}

// An ICO directory can contain PNGs at multiple sizes for browser tabs.
const faviconSizes = [16, 32, 48];
const faviconImages = await Promise.all(faviconSizes.map((size) =>
  sharp(source).resize(size, size).png().toBuffer(),
));
const directory = Buffer.alloc(6 + 16 * faviconSizes.length);
directory.writeUInt16LE(1, 2); // ICO image type
directory.writeUInt16LE(faviconSizes.length, 4);

let imageOffset = directory.length;
for (const [index, size] of faviconSizes.entries()) {
  const entry = 6 + 16 * index;
  const imageLength = faviconImages[index].length;
  directory[entry] = size;
  directory[entry + 1] = size;
  directory.writeUInt16LE(1, entry + 4); // color planes
  directory.writeUInt16LE(32, entry + 6); // bits per pixel
  directory.writeUInt32LE(imageLength, entry + 8);
  directory.writeUInt32LE(imageOffset, entry + 12);
  imageOffset += imageLength;
}
await writeFile(join(root, 'app', 'favicon.ico'), Buffer.concat([directory, ...faviconImages]));
