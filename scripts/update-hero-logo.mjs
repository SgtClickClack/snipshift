/**
 * Update the hero image by simply overlaying the navbar banner logo.
 * The navbar banner has a cream background that will cover the original logo.
 * NO dark cover - just the logo overlay.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

// Use the ORIGINAL hero image from git (before modifications)
const HERO_INPUT = path.resolve('public/hospogohero.webp');
const NAVBAR_BANNER = path.resolve('public/hospogo-navbar-banner.png');
const HERO_OUTPUT_WEBP = path.resolve('public/hospogohero-updated.webp');
const HERO_OUTPUT_JPG = path.resolve('public/hospogohero-updated.jpg');

async function main() {
  // Check inputs exist
  try {
    await fs.access(HERO_INPUT);
    await fs.access(NAVBAR_BANNER);
  } catch {
    console.error('Missing input files');
    process.exit(1);
  }

  console.log('Reading hero image...');
  const heroMeta = await sharp(HERO_INPUT).metadata();
  console.log(`Hero dimensions: ${heroMeta.width}x${heroMeta.height}`);

  // Resize the navbar banner to appropriate size
  const logoWidth = Math.round(heroMeta.width * 0.38);
  
  console.log('Resizing navbar banner...');
  const resizedLogo = await sharp(NAVBAR_BANNER)
    .resize(logoWidth, null, { fit: 'inside' })
    .png()
    .toBuffer();
  
  const logoMeta = await sharp(resizedLogo).metadata();
  
  // Center horizontally and position near top
  const logoLeft = Math.round((heroMeta.width - logoMeta.width) / 2);
  const logoTop = Math.round(heroMeta.height * 0.03);

  console.log(`Compositing logo at (${logoLeft}, ${logoTop}) size ${logoMeta.width}x${logoMeta.height}...`);

  // Simply composite the navbar logo onto the hero - NO dark cover
  const finalHero = await sharp(HERO_INPUT)
    .composite([
      {
        input: resizedLogo,
        left: logoLeft,
        top: logoTop,
      }
    ])
    .toBuffer();

  // Save as WebP
  console.log('Saving updated hero as WebP...');
  await sharp(finalHero)
    .webp({ quality: 90 })
    .toFile(HERO_OUTPUT_WEBP);

  // Save as JPG fallback
  console.log('Saving updated hero as JPG...');
  await sharp(finalHero)
    .jpeg({ quality: 90 })
    .toFile(HERO_OUTPUT_JPG);

  console.log('Done! Hero images updated with logo overlay only.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
