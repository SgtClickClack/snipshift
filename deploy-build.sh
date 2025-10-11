#!/bin/bash
# Production build script for deployment

set -e

echo "=== SnipShift Production Build ==="
echo "Building production-ready application..."
echo ""

# Build client (dependencies already installed)
echo "Building client..."
node node_modules/vite/bin/vite.js build --outDir dist/public

echo ""
echo "✅ Production build complete!"
echo "Build output: dist/public/"
echo ""
echo "To start: NODE_ENV=production tsx server/index.ts"
