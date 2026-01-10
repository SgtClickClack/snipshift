/**
 * Crop `hospogologo.png` (a composite containing multiple marks) into separate assets.
 *
 * Output (written to `public/`):
 * - brand-logo.png        (full logo, left mark)
 * - brand-wordmark.png    (wordmark, right mark)
 * - brand-icon.png        (icon, middle mark, square)
 * - brand-logo-192.png    (icon resized to 192x192)
 * - brand-logo-512.png    (icon resized to 512x512)
 * - og-image.jpg          (banner-style OG image, 1200x630)
 *
 * NOTE: Crops are based on the current layout of hospogologo.png (2816x1536).
 * If the source image changes, update the crop boxes below.
 */

import { Buffer } from 'node:buffer';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const INPUT = path.resolve('hospogologo.png');
const OUT_DIR = path.resolve('public');
const APP_ICON_INPUT = path.resolve('hospogoappicon.png');

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function clampCrop({ left, top, width, height }, meta) {
  const l = Math.max(0, Math.min(left, meta.width - 1));
  const t = Math.max(0, Math.min(top, meta.height - 1));
  const w = Math.max(1, Math.min(width, meta.width - l));
  const h = Math.max(1, Math.min(height, meta.height - t));
  return { left: l, top: t, width: w, height: h };
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

/**
 * Convert a dark-background PNG into a transparent-background PNG by keying out pixels close to the given background color.
 *
 * This is intentionally conservative: it removes the "box" while preserving neon glow edges.
 */
async function makeBackgroundTransparent(pngBuffer, bgRgb, options = {}) {
  const { width, height } = await sharp(pngBuffer).metadata();
  if (!width || !height) throw new Error('Unable to read image dimensions for transparency processing');

  const {
    // Distance thresholds in RGB space
    near = 18, // fully transparent at/under this distance
    far = 55, // fully opaque at/over this distance
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
    const mult = t;

    // Apply multiplier to alpha (preserves any existing alpha)
    out[i + 3] = Math.round(out[i + 3] * mult);
  }

  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function sampleTopLeftRgb(pngBuffer) {
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels < 3) throw new Error('Expected at least RGB channels');
  return [data[0], data[1], data[2]];
}

async function main() {
  const meta = await sharp(INPUT).metadata();
  if (!meta.width || !meta.height) {
    throw new Error('Unable to read image dimensions for hospogologo.png');
  }

  // Source image: 2816x1536.
  // Visual layout:
  // - Left: full logo ("HospoGo" + cloche) around x~0..~1050, y~450..~1050
  // - Middle: icon around x~1150..~1750, y~410..~980
  // - Right: wordmark around x~1800..end, y~520..~900
  //
  // We keep some padding and then trim by background color to tighten.
  const fullLogoCrop = clampCrop(
    { left: 0, top: 380, width: 1180, height: 820 },
    meta
  );
  // The icon sits slightly left of center; keep this crop tight so we don't catch the wordmark.
  const iconCrop = clampCrop(
    { left: 980, top: 320, width: 760, height: 760 },
    meta
  );
  const wordmarkCrop = clampCrop(
    { left: 1700, top: 420, width: 1116, height: 640 },
    meta
  );

  await fs.mkdir(OUT_DIR, { recursive: true });

  // Full logo (left mark)
  await sharp(INPUT)
    .extract(fullLogoCrop)
    .trim({ threshold: 10 })
    .png()
    .toFile(path.join(OUT_DIR, 'brand-logo.png'));

  // Wordmark (right mark)
  const wordmarkPng = await sharp(INPUT)
    .extract(wordmarkCrop)
    .trim({ threshold: 10 })
    .png()
    .toBuffer();

  await sharp(wordmarkPng).toFile(path.join(OUT_DIR, 'brand-wordmark.png'));

  // Wordmark (right mark) with transparent background for navbar/footer usage.
  // Background color matches the composite source (#141A20-ish).
  const wordmarkTransparent = await makeBackgroundTransparent(wordmarkPng, [20, 26, 32], {
    near: 18,
    far: 60,
  });
  await sharp(wordmarkTransparent).toFile(path.join(OUT_DIR, 'brand-wordmark-transparent.png'));
  // Alias: canonical neon logo filename for navbar usage
  await sharp(wordmarkTransparent).toFile(path.join(OUT_DIR, 'hospogoneonlogo.png'));

  // Icon (middle mark) -> trimmed and padded to square for consistent app icons
  const iconBuffer = await sharp(INPUT)
    .extract(iconCrop)
    .trim({ threshold: 10 })
    .png()
    .toBuffer();

  const iconMeta = await sharp(iconBuffer).metadata();
  if (!iconMeta.width || !iconMeta.height) {
    throw new Error('Unable to read cropped icon dimensions');
  }

  // Ensure square by adding background padding using the source background color (dark slate).
  const iconSize = Math.max(iconMeta.width, iconMeta.height);
  const iconSquare = await sharp(iconBuffer)
    .extend({
      top: Math.floor((iconSize - iconMeta.height) / 2),
      bottom: Math.ceil((iconSize - iconMeta.height) / 2),
      left: Math.floor((iconSize - iconMeta.width) / 2),
      right: Math.ceil((iconSize - iconMeta.width) / 2),
      background: { r: 20, g: 26, b: 32, alpha: 1 },
    })
    .png()
    .toBuffer();

  await sharp(iconSquare).png().toFile(path.join(OUT_DIR, 'brand-icon.png'));
  await sharp(iconSquare)
    .resize(192, 192, { fit: 'cover' })
    .png()
    .toFile(path.join(OUT_DIR, 'brand-logo-192.png'));
  await sharp(iconSquare)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(path.join(OUT_DIR, 'brand-logo-512.png'));

  // OG image: 1200x630 using the wordmark centered with padding.
  // We create a solid dark background and composite the wordmark onto it.
  const ogBase = sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 20, g: 26, b: 32, alpha: 1 },
    },
  });

  const wordmarkForOg = await sharp(path.join(OUT_DIR, 'brand-wordmark.png'))
    .resize(1000, 400, { fit: 'inside' })
    .png()
    .toBuffer();

  await ogBase
    .composite([{ input: wordmarkForOg, gravity: 'center' }])
    .jpeg({ quality: 90 })
    .toFile(path.join(OUT_DIR, 'og-image.jpg'));

  // Navbar logo from app icon (crop + background-key to transparent + upscale for crisp rendering)
  // This keeps the navbar logo bright/clean and ensures it blends into the charcoal navbar.
  if (await fileExists(APP_ICON_INPUT)) {
    const appIconTrimmed = await sharp(APP_ICON_INPUT)
      .trim({ threshold: 10 })
      .png()
      .toBuffer();

    const bgRgb = await sampleTopLeftRgb(appIconTrimmed);
    const appIconTransparent = await makeBackgroundTransparent(appIconTrimmed, bgRgb, {
      near: 22,
      far: 80,
    });

    const appIconNavbar = await sharp(appIconTransparent)
      .trim({ threshold: 10 })
      // Export at ~2x the rendered size for crispness on high-DPI screens
      .resize({ height: 128, fit: 'inside', withoutEnlargement: false })
      .png({ compressionLevel: 9 })
      .toBuffer();

    await sharp(appIconNavbar).toFile(path.join(OUT_DIR, 'hospogoappicon-navbar.png'));
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


