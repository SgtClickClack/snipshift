/**
 * Update the hero image by compositing the clean navbar banner logo
 * on top of the baked-in logo in the hero image.
 * 
 * This creates a new hero image with the improved logo baked in.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

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

  // Calculate positioning for the logo overlay
  // The baked-in logo is centered horizontally and very near the top
  // Make the new logo slightly larger to fully cover the old one's glow
  const logoWidth = Math.round(heroMeta.width * 0.42); // ~42% of hero width (slightly larger than original)
  const logoTop = Math.round(heroMeta.height * 0.01);  // ~1% from top (positioned to cover old logo)
  
  console.log('Resizing navbar banner to match...');
  const resizedLogo = await sharp(NAVBAR_BANNER)
    .resize(logoWidth, null, { fit: 'inside' })
    .png()
    .toBuffer();
  
  const logoMeta = await sharp(resizedLogo).metadata();
  const logoLeft = Math.round((heroMeta.width - logoMeta.width) / 2); // Center horizontally

  console.log(`Compositing logo at (${logoLeft}, ${logoTop}) size ${logoMeta.width}x${logoMeta.height}...`);

  // Composite the logo onto the hero
  const compositedHero = await sharp(HERO_INPUT)
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
  await sharp(compositedHero)
    .webp({ quality: 90 })
    .toFile(HERO_OUTPUT_WEBP);

  // Save as JPG fallback
  console.log('Saving updated hero as JPG...');
  await sharp(compositedHero)
    .jpeg({ quality: 90 })
    .toFile(HERO_OUTPUT_JPG);

  console.log('Done! Hero images updated with clean logo.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
