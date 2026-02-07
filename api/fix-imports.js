/**
 * Post-build script to fix ESM import paths in compiled tsc output.
 *
 * tsc (with no outDir) writes api/index.js in-place next to api/index.ts.
 * This script ensures any bare `./_src/index` imports get the `.js` extension
 * required by Node ESM resolution.
 *
 * In practice the source already uses `.js` specifiers, so this is a safety
 * net — if the import already ends in `.js`, the regex simply won't match and
 * the file is left untouched.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// tsc compiles in-place (no outDir) → api/index.js lives next to api/index.ts
const indexJsPath = path.join(__dirname, 'index.js');

if (fs.existsSync(indexJsPath)) {
  let content = fs.readFileSync(indexJsPath, 'utf8');
  let patched = false;

  // Fix bare _src/index imports that are missing the .js extension
  // e.g. from './_src/index' → from './_src/index.js' (preserves quote style)
  const fixedContent = content.replace(
    /from\s+(['"])(\.\/(_src|src)\/index)(?!\.js)\1/g,
    (match, quote, importPath) => {
      patched = true;
      return `from ${quote}${importPath}.js${quote}`;
    }
  );

  if (patched) {
    fs.writeFileSync(indexJsPath, fixedContent, 'utf8');
    console.log('✅ Fixed ESM import path in index.js');
  } else {
    console.log('✅ index.js imports already correct — no patching needed');
  }
} else {
  // This should not happen after a successful tsc run
  console.warn('⚠️  index.js not found — tsc may have failed. Check build logs.');
}
