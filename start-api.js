#!/usr/bin/env node

// Container-compatible startup script for SnipShift API
// This script changes to the correct directory and starts the API server

const path = require('path');
const { spawn } = require('child_process');

// Change to the API directory
const apiDir = path.join(__dirname, 'snipshift-next', 'api');
process.chdir(apiDir);

// Start the API server
const child = spawn('node', ['dist/index.js'], {
  stdio: 'inherit',
  env: process.env
});

child.on('error', (error) => {
  console.error('Failed to start API:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code);
});