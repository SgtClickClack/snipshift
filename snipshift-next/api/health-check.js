#!/usr/bin/env node

// Simple health check script for deployment verification
const http = require('http');

const port = process.env.PORT || 4000;
const host = '0.0.0.0';

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'snipshift-api-health-check',
      port: port
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'SnipShift API Health Check Server',
      timestamp: new Date().toISOString(),
      port: port
    }));
  }
});

server.listen(port, host, () => {
  console.log(`✅ Health check server running on http://${host}:${port}`);
  console.log(`✅ Ready for deployment verification`);
});

server.on('error', (err) => {
  console.error('❌ Health check server error:', err);
  process.exit(1);
});
