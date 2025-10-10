#!/bin/bash
# Production build script that works around Firebase bundling issues

echo "🔨 Building SnipShift for production..."

# Build client with production vite config (excludes problematic Firebase bundling)
echo "📦 Building client..."
vite build --config vite.config.prod.ts --outDir dist/public

# Build server
echo "🖥️  Building server..."
tsc server/index.ts --outDir dist/server --target es2020 --module commonjs --moduleResolution node --esModuleInterop --allowSyntheticDefaultImports --skipLibCheck

echo "✅ Build completed successfully!"
