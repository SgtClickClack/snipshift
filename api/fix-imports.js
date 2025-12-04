/**
 * Post-build script to fix ESM import paths in compiled output
 * Ensures .js extensions are preserved for ESM modules
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distIndexPath = path.join(__dirname, 'dist', 'index.js');

if (fs.existsSync(distIndexPath)) {
  let content = fs.readFileSync(distIndexPath, 'utf8');
  
  // Fix the import to include .js extension and use correct path
  // Replace './src/index' with './src/index.js'
  content = content.replace(
    /import\s+app\s+from\s+['"]\.\/src\/index['"]/g,
    "import app from './src/index.js'"
  );
  
  fs.writeFileSync(distIndexPath, content, 'utf8');
  console.log('✅ Fixed import path in dist/index.js');
} else {
  console.warn('⚠️  dist/index.js not found, skipping fix');
}
