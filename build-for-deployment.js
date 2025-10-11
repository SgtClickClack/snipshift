#!/usr/bin/env node

const { build } = require('vite');
const path = require('path');

console.log('=== Building for Deployment ===');
console.log('Starting Vite build...\n');

async function buildApp() {
  try {
    await build({
      root: path.resolve(__dirname, 'client'),
      build: {
        outDir: path.resolve(__dirname, 'dist/public'),
        emptyOutDir: true,
      }
    });
    
    console.log('\n✅ Build complete!');
    console.log('Output: dist/public/');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildApp();
