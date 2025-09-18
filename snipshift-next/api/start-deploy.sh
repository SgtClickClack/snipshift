#!/bin/bash

echo "=== SnipShift API Deployment Script ==="
echo "Current directory: $(pwd)"
echo "Environment PORT: $PORT"
echo "Environment NODE_ENV: $NODE_ENV"

echo "=== Installing dependencies ==="
npm ci

echo "=== Building application ==="
npm run build

echo "=== Starting server ==="
echo "Server will start on port: ${PORT:-5000}"
npm start
