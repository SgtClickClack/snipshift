/**
 * Generate a transparent neon logo overlay for the hero section.
 * Takes brand-wordmark.png (neon HospoGo text with dark background)
 * and keys out the dark background to create a clean overlay.
 */

import { Buffer } from 'node:buffer';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const INPUT = path.resolve('public/brand-wordmark.png');
const OUTPUT = path.resolve('public/hero-logo-overlay.png');

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

/**
 * Convert a dark-background PNG into a transparent-background PNG by keying out
 * pixels close to the given background color.
 * 
 * Uses a more aggressive key to fully remove the dark background while preserving
 * the bright neon text and glow.
 */
async function makeBackgroundTransparent(pngBuffer, bgRgb, options = {}) {
  const { width, height } = await sharp(pngBuffer).metadata();
  if (!width || !height) throw new Error('Unable to read image dimensions');

  const {
    near = 25,  // fully transparent at/under this distance
    far = 70,   // fully opaque at/over this distance
  } = options;

  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 4) throw new Error(`Expected RGBA (4 channels), got ${info.channels}`);

  const out = Buffer.from(data);
  const [br, bg, bb] = bgRgb;

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];

    const dr = r - br;
    const dg = g - bg;
    const db = b - bb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);

    // Map dist -> alpha multiplier: 0 at near, 1 at far
    const t = clamp01((dist - near) / (far - near));

    // Apply multiplier to alpha (preserves any existing alpha)
    out[i + 3] = Math.round(out[i + 3] * t);
  }

  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function main() {
  // Check if input exists
  try {
    await fs.access(INPUT);
  } catch {
    console.error(`Input file not found: ${INPUT}`);
    process.exit(1);
  }

  console.log('Reading brand-wordmark.png...');
  const inputBuffer = await fs.readFile(INPUT);

  // The brand-wordmark has a dark slate background around RGB(20, 26, 32)
  // We'll key this out to make it transparent
  console.log('Keying out dark background...');
  const transparentBuffer = await makeBackgroundTransparent(inputBuffer, [20, 26, 32], {
    near: 30,
    far: 80,
  });

  console.log(`Writing ${OUTPUT}...`);
  await sharp(transparentBuffer)
    .png({ compressionLevel: 9 })
    .toFile(OUTPUT);

  console.log('Done! Created hero-logo-overlay.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
