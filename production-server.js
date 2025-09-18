const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for accurate IP detection
app.set('trust proxy', 1);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    version: '2.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'SnipShift API is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// API routes placeholder
app.get('/api/status', (req, res) => {
  res.json({ status: 'API is running' });
});

// Serve static files if they exist
const staticPath = path.join(__dirname, 'dist', 'public');
if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));
  console.log('Serving static files from:', staticPath);
  
  // Handle client-side routing - catch all non-API routes
  app.use((req, res, next) => {
    if (req.url.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(staticPath, 'index.html'));
  });
} else {
  console.log('Static files not found at:', staticPath);
  
  // Fallback for missing static files
  app.use((req, res, next) => {
    if (req.url.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.json({
      message: 'SnipShift API is running (static files not built)',
      timestamp: new Date().toISOString(),
      note: 'Run npm run build to build the client application'
    });
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SnipShift server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 API endpoint: http://localhost:${PORT}/api/status`);
});