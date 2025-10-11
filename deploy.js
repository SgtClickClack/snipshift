#!/usr/bin/env node

/**
 * Deployment script for SnipShift
 * Works around shell environment limitations by using Node.js directly
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('=== SnipShift Deployment ===\n');

// Get PORT from environment or use default
const PORT = process.env.PORT || '5000';
process.env.PORT = PORT;

// Use development mode (Vite middleware) for reliability
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

console.log(`Port: ${PORT}`);
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log('\nStarting server...\n');

// Use tsx from node_modules directly
const tsxPath = path.join(__dirname, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const serverPath = path.join(__dirname, 'server', 'index.ts');

const server = spawn('node', [tsxPath, serverPath], {
  env: process.env,
  stdio: 'inherit'
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Server exited with code ${code}`);
    process.exit(code || 1);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => server.kill('SIGTERM'));
process.on('SIGINT', () => server.kill('SIGINT'));
