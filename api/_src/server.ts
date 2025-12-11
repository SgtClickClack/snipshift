import app from './index.js';
import { startShiftCompletionCron } from './services/shift-completion-cron.js';
import { initializeSocketIO } from './socket/socket-server.js';
import { Server as HttpServer } from 'http';

const PORT = process.env.PORT || 5000;

// Start server for local development (not on Vercel)
// This file is the entry point for local execution
if (process.env.VERCEL !== '1') {
  console.log('[SERVER] Starting server...');
  console.log(`[SERVER] VERCEL env: ${process.env.VERCEL}`);
  console.log(`[SERVER] PORT: ${PORT}`);
  
  // Start shift completion cron job
  startShiftCompletionCron();

  const server = app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[SERVER] ✓ API server running on http://0.0.0.0:${PORT}`);
    console.log(`[SERVER] ✓ Health check: http://0.0.0.0:${PORT}/health`);
    
    // Initialize Socket.io server
    initializeSocketIO(server as HttpServer);
    console.log(`[SERVER] ✓ Socket.io server initialized`);
  });
  
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`[SERVER] ✗ Port ${PORT} is already in use`);
      console.error(`[SERVER] Try: taskkill /F /PID <PID> (find PID with: netstat -ano | findstr ":${PORT}")`);
      console.error(`[SERVER] Or set a different port: $env:PORT=5001 npm start`);
    } else {
      console.error('[SERVER] ✗ Server error:', error);
    }
    process.exit(1);
  });
}










