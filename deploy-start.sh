#!/bin/bash
# Production start script for deployment

set -e

echo "=== SnipShift Production Start ==="
echo "Starting production server..."
echo ""

# Set production environment
export NODE_ENV=production

# Use PORT from environment or default to 5000
PORT=${PORT:-5000}
export PORT

echo "Environment: $NODE_ENV"
echo "Port: $PORT"
echo ""

# Start server with tsx (faster than compiled)
exec npx tsx server/index.ts
