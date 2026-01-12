/**
 * Update the hero image by:
 * 1. Creating a full-width dark strip at the top that fades to transparent
 * 2. Compositing the clean navbar banner logo on top
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

  // Step 1: First resize the logo to know its exact dimensions
  const logoWidth = Math.round(heroMeta.width * 0.38);
  const resizedLogoForSize = await sharp(NAVBAR_BANNER)
    .resize(logoWidth, null, { fit: 'inside' })
    .png()
    .toBuffer();
  const logoMeta = await sharp(resizedLogoForSize).metadata();
  
  // Step 2: Create a dark cover that's exactly the size of the logo
  // No extra margin - just cover what's behind the logo
  const coverWidth = logoMeta.width;
  const coverHeight = logoMeta.height + Math.round(heroMeta.height * 0.02); // Minimal extra height
  const coverLeft = Math.round((heroMeta.width - coverWidth) / 2);
  const coverTop = 0;
  
  console.log(`Creating tight dark cover: ${coverWidth}x${coverHeight} at (${coverLeft}, ${coverTop})`);
  
  // Create an SVG with soft edges - tight to the logo
  const svg = `
    <svg width="${coverWidth}" height="${coverHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fadeBottom" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgb(10,12,15);stop-opacity:1" />
          <stop offset="70%" style="stop-color:rgb(10,12,15);stop-opacity:1" />
          <stop offset="90%" style="stop-color:rgb(10,12,15);stop-opacity:0.5" />
          <stop offset="100%" style="stop-color:rgb(10,12,15);stop-opacity:0" />
        </linearGradient>
        <linearGradient id="fadeSides" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:white;stop-opacity:0" />
          <stop offset="10%" style="stop-color:white;stop-opacity:1" />
          <stop offset="90%" style="stop-color:white;stop-opacity:1" />
          <stop offset="100%" style="stop-color:white;stop-opacity:0" />
        </linearGradient>
        <mask id="sideMask">
          <rect width="100%" height="100%" fill="url(#fadeSides)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#fadeBottom)" mask="url(#sideMask)" />
    </svg>
  `;
  
  const darkCover = await sharp(Buffer.from(svg)).png().toBuffer();

  // Step 2: Composite the dark cover onto the hero image (centered)
  console.log('Covering original logo area...');
  const coveredHero = await sharp(HERO_INPUT)
    .composite([
      {
        input: darkCover,
        left: coverLeft,
        top: 0,
      }
    ])
    .toBuffer();

  // Step 3: Use the already-resized logo from step 1
  const resizedLogo = resizedLogoForSize;
  
  // Center horizontally and position near top
  const logoLeft = Math.round((heroMeta.width - logoMeta.width) / 2);
  const logoTop = Math.round(heroMeta.height * 0.02); // Near top to cover original

  console.log(`Compositing logo at (${logoLeft}, ${logoTop}) size ${logoMeta.width}x${logoMeta.height}...`);

  // Step 4: Composite the navbar logo onto the covered hero
  const finalHero = await sharp(coveredHero)
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

  console.log('Done! Hero images updated with clean logo.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
