#!/bin/bash
# Deployment start script

set -e

echo "=== SnipShift Deployment Start ==="
echo "Starting server..."
echo ""

# Use PORT from environment or default to 5000
PORT=${PORT:-5000}
export PORT

# Note: Using development mode with Vite middleware for reliability
# This serves the app dynamically without needing a pre-built dist folder
export NODE_ENV=development

echo "Port: $PORT"
echo ""

# Start server - npm run dev works reliably in all environments
exec npm run dev
