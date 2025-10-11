#!/bin/bash
# Production build script for deployment

set -e

echo "=== SnipShift Production Build ==="
echo "Building production-ready application..."
echo ""

# Install dependencies
echo "Step 1: Installing dependencies..."
npm ci --production=false

# Build client
echo "Step 2: Building client..."
npm run build:client

echo ""
echo "✅ Production build complete!"
echo "Build output: dist/public/"
echo ""
echo "To start: NODE_ENV=production tsx server/index.ts"
