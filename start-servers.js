/* eslint-env node */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting development servers...\n');

// Start API server
console.log('Starting API server on port 5000...');
const apiServer = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'api'),
  shell: true,
  stdio: 'inherit'
});

apiServer.on('error', (error) => {
  console.error('Failed to start API server:', error);
});

// Start frontend server
setTimeout(() => {
  console.log('\nStarting frontend server on port 3002...');
  const frontendServer = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    shell: true,
    stdio: 'inherit'
  });

  frontendServer.on('error', (error) => {
    console.error('Failed to start frontend server:', error);
  });
}, 2000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down servers...');
  apiServer.kill();
  process.exit(0);
});

