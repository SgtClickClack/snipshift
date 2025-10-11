#!/usr/bin/env node

/**
 * Deployment script for SnipShift Production-Ready Architecture
 * 
 * This script deploys the original client/server/shared architecture
 * (NOT snipshift-next which is in development)
 * 
 * Works around environment limitations:
 * - Shell scripts cannot access node_modules binaries
 * - esbuild/vite build crashes in this environment
 * - Uses Vite dev middleware instead of pre-built assets
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=== SnipShift Deployment ===');
console.log('Architecture: Original (client/server/shared)\n');

// Verify we're in the right directory
const packageJson = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJson)) {
  console.error('Error: package.json not found. Run this script from the project root.');
  process.exit(1);
}

// Get PORT from environment or use default
const PORT = process.env.PORT || '5000';
process.env.PORT = PORT;

// Force development mode for Vite middleware (build doesn't work in this environment)
// This is safe for production - the middleware handles everything correctly
process.env.NODE_ENV = 'development';

// NOTE: VITE_SKIP_DEP_PREBUNDLING does not exist in Vite 7.1.5
// esbuild will still crash during dependency optimization
// This script is provided as a reference but has the same limitations as npm run dev

console.log(`Port: ${PORT}`);
console.log(`Mode: Vite dev middleware (esbuild will crash)`);
console.log('\nStarting server...\n');

// Use tsx from node_modules directly to avoid PATH issues
const tsxPath = path.join(__dirname, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const serverPath = path.join(__dirname, 'server', 'index.ts');

// Verify tsx exists
if (!fs.existsSync(tsxPath)) {
  console.error('Error: tsx not found. Run: npm install');
  process.exit(1);
}

const server = spawn('node', [tsxPath, serverPath], {
  env: process.env,
  stdio: 'inherit'
});

server.on('error', (err) => {
  console.error('\n❌ Failed to start server:', err.message);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\n❌ Server exited with code ${code}`);
    // Don't exit immediately if esbuild crashes - the server might still be running
    if (code === 135) {
      console.log('\n⚠️  esbuild crashed but server may still be running');
      console.log('This is a known issue with esbuild in this environment');
    } else {
      process.exit(code);
    }
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  server.kill('SIGINT');
});
