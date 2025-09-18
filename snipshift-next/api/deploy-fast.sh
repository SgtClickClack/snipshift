#!/bin/bash

echo "=== SnipShift Fast Deployment Script ==="
echo "Starting deployment at $(date)"

# Set environment variables
export PORT=5000
export NODE_ENV=production
export SKIP_DB=1
export SKIP_REDIS=1
export SKIP_STRIPE=1

echo "=== Installing dependencies ==="
npm ci --silent --no-audit --no-fund

echo "=== Building application (fast mode) ==="
npm run build:fast

echo "=== Starting server ==="
echo "Server starting on port: $PORT"
node dist/index.js
