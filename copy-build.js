const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Ensure dist/public directory exists
if (!fs.existsSync('dist/public')) {
  fs.mkdirSync('dist/public', { recursive: true });
}

// Copy client/dist/public to dist/public
const src = 'client/dist/public';
const dest = 'dist/public';

function copyDir(srcPath, destPath) {
  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
  }
  
  const items = fs.readdirSync(srcPath);
  
  for (const item of items) {
    const srcItemPath = path.join(srcPath, item);
    const destItemPath = path.join(destPath, item);
    
    if (fs.statSync(srcItemPath).isDirectory()) {
      copyDir(srcItemPath, destItemPath);
    } else {
      fs.copyFileSync(srcItemPath, destItemPath);
    }
  }
}

if (fs.existsSync(src)) {
  copyDir(src, dest);
  console.log('✅ Build files copied successfully');
} else {
  console.error('❌ Source directory not found:', src);
  process.exit(1);
}
