/**
 * Crop the HospoGo landing hero image to remove the navbar visible at the top.
 *
 * Input (repo root):
 * - hospogohero.png (preferred)
 * - hospgohero.png  (fallback, legacy filename)
 *
 * Output (written to `public/`):
 * - hospogohero.webp
 * - hospogohero.jpg
 *
 * The crop is detected automatically by scanning the top portion of the image for the
 * strongest horizontal luminance edge (navbar -> hero content transition).
 *
 * If the source image changes significantly, re-run this script and (if needed) tune
 * the scan window or thresholds.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const INPUT_CANDIDATES = ['hospogohero.png', 'hospgohero.png'];
const OUT_DIR = path.resolve('public');
const OUT_WEBP = path.join(OUT_DIR, 'hospogohero.webp');
const OUT_JPG = path.join(OUT_DIR, 'hospogohero.jpg');

async function resolveInput() {
  for (const candidate of INPUT_CANDIDATES) {
    try {
      await fs.access(path.resolve(candidate));
      return path.resolve(candidate);
    } catch {
      // continue
    }
  }

  throw new Error(
    `Unable to find hero source image. Expected one of: ${INPUT_CANDIDATES.join(', ')}`
  );
}

function luma(r, g, b) {
  // ITU-R BT.709 luminance approximation
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function clampInt(n, min, max) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

async function detectCropTopPx(inputPath, meta) {
  if (!meta.width || !meta.height) {
    throw new Error('Unable to read image dimensions for hero source');
  }

  const sampleWidth = Math.min(600, meta.width);
  const resized = sharp(inputPath).resize({
    width: sampleWidth,
    withoutEnlargement: true,
  });

  const { data, info } = await resized
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (!width || !height || channels < 3) {
    throw new Error('Unable to sample hero image pixels for crop detection');
  }

  const rowAvg = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    const rowStart = y * width * channels;
    for (let x = 0; x < width; x++) {
      const i = rowStart + x * channels;
      sum += luma(data[i], data[i + 1], data[i + 2]);
    }
    rowAvg[y] = sum / width;
  }

  const edge = new Array(height).fill(0);
  for (let y = 1; y < height; y++) {
    edge[y] = Math.abs(rowAvg[y] - rowAvg[y - 1]);
  }

  // Scan the top part of the image for the strongest horizontal edge.
  // Navbar transitions tend to be near the top, but the *bottom* of the navbar
  // (what we want to crop past) is often the lowest strong edge in the header region.
  const scanStart = clampInt(Math.round(height * 0.06), 10, height - 2);
  const scanEnd = clampInt(Math.round(height * 0.42), scanStart + 10, height - 2);

  const scores = new Array(height).fill(0);
  for (let y = 1; y < height - 1; y++) {
    scores[y] = edge[y - 1] * 0.25 + edge[y] * 0.5 + edge[y + 1] * 0.25;
  }

  // Pick the *lowest* meaningful local maximum to better target the navbar bottom edge.
  const minPeakScore = 3;
  const peaks = [];
  for (let y = scanStart + 1; y <= scanEnd - 1; y++) {
    if (scores[y] > scores[y - 1] && scores[y] >= scores[y + 1] && scores[y] >= minPeakScore) {
      peaks.push({ y, score: scores[y] });
    }
  }

  let chosenY;
  let chosenScore;
  if (peaks.length > 0) {
    // Deepest peak (largest y) is usually navbar bottom boundary.
    peaks.sort((a, b) => b.y - a.y);
    chosenY = peaks[0].y;
    chosenScore = peaks[0].score;
  } else {
    // Fall back to global max in scan window.
    let bestY = scanStart;
    let bestScore = -Infinity;
    for (let y = scanStart; y <= scanEnd; y++) {
      if (scores[y] > bestScore) {
        bestScore = scores[y];
        bestY = y;
      }
    }
    chosenY = bestY;
    chosenScore = bestScore;
  }

  // If the edge signal is unusually weak, fall back to a reasonable default.
  const fallbackPreviewPx = clampInt(Math.round(height * 0.16), 50, Math.min(220, height - 2));
  const previewCropTop = chosenScore < 2 ? fallbackPreviewPx : chosenY;

  const scale = meta.width / width;
  const cropTopPx = clampInt(Math.round(previewCropTop * scale), 0, meta.height - 1);

  return {
    cropTopPx,
    debug: {
      sampleWidth: width,
      sampleHeight: height,
      scanStart,
      scanEnd,
      chosenPreviewY: previewCropTop,
      chosenScore,
      peaksFound: peaks.length,
      scale,
    },
  };
}

async function main() {
  const inputPath = await resolveInput();
  const meta = await sharp(inputPath).metadata();

  if (!meta.width || !meta.height) {
    throw new Error('Unable to read image dimensions for hero source');
  }

  // We only want to remove the *baked-in* navbar strip at the top of the provided hero image.
  // Default to ~12% of image height, which matches the current hospogohero.png layout.
  // Override if needed:
  //   - PowerShell: $env:HOSPOGO_HERO_CROP_TOP_PX=160; node scripts/crop-hospogo-hero.mjs
  //   - Bash: HOSPOGO_HERO_CROP_TOP_PX=160 node scripts/crop-hospogo-hero.mjs
  const envCropTop = Number.parseInt(process.env.HOSPOGO_HERO_CROP_TOP_PX ?? '', 10);
  const defaultCropTopPx = clampInt(Math.round(meta.height * 0.12), 80, 240);
  const finalCropTopPx = clampInt(
    Number.isFinite(envCropTop) ? envCropTop : defaultCropTopPx,
    0,
    meta.height - 1
  );

  const cropHeight = meta.height - finalCropTopPx;
  if (cropHeight < 50) {
    throw new Error(
      `Crop height too small after detection (top=${finalCropTopPx}, height=${meta.height}). Aborting.`
    );
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  const base = sharp(inputPath)
    .extract({ left: 0, top: finalCropTopPx, width: meta.width, height: cropHeight })
    // Keep hero assets reasonably sized for the landing background.
    .resize({ width: 2400, withoutEnlargement: true })
    .withMetadata();

  await base
    .clone()
    .webp({ quality: 82 })
    .toFile(OUT_WEBP);

  await base
    .clone()
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(OUT_JPG);

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        input: path.relative(process.cwd(), inputPath),
        inputSize: { width: meta.width, height: meta.height },
        cropTopPx: finalCropTopPx,
        defaultCropTopPx,
        envCropTopPx: Number.isFinite(envCropTop) ? envCropTop : null,
        output: {
          webp: path.relative(process.cwd(), OUT_WEBP),
          jpg: path.relative(process.cwd(), OUT_JPG),
        },
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

