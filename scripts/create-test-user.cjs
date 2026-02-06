/**
 * Wrapper to create test user - delegates to api/scripts (firebase-admin lives in api deps).
 * Usage: node scripts/create-test-user.cjs
 */
const { spawnSync } = require('child_process');
const path = require('path');

const apiScript = path.resolve(__dirname, '../api/scripts/create-test-user.cjs');
const result = spawnSync('node', [apiScript], {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '../api'),
  env: { ...process.env },
});

process.exit(result.status ?? 1);

