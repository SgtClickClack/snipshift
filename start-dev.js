#!/usr/bin/env node

/**
 * Development Server Startup Script
 * Ensures both frontend and backend are running properly
 */

const { spawn } = require('child_process');

console.log('🚀 Starting Snipshift Development Server...\n');

// Start the development server
const devProcess = spawn('npm', ['run', 'dev'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true
});

devProcess.on('error', (error) => {
  console.error('❌ Failed to start development server:', error);
  process.exit(1);
});

devProcess.on('close', (code) => {
  console.log(`\n🛑 Development server stopped with code ${code}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  devProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down development server...');
  devProcess.kill('SIGTERM');
  process.exit(0);
});

console.log('📋 Server Information:');
console.log('   Frontend: http://localhost:3000');
console.log('   Backend:  http://localhost:5000');
console.log('   Signup:   http://localhost:3000/signup');
console.log('   Login:    http://localhost:3000/login');
console.log('\n⏳ Starting servers...');
