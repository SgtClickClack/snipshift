// Production server configuration for Snipshift
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration for production and Replit
const allowedOrigins = [
  'https://www.snipshift.com.au', 
  'https://snipshift.com.au',
  'https://snipshift-web.snipshift.repl.co',
  'https://snipshift-web--snipshift.repl.co'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint for Replit deployment
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0'
  });
});

// API routes (if needed for deployment)
app.get('/api/status', (req, res) => {
  res.json({ 
    message: 'SnipShift API is running',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all handler for React Router - serve the main React app
app.use((req, res) => {
  try {
    const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
    res.send(html);
  } catch (err) {
    console.error('Error serving index.html:', err);
    res.status(500).send('Server Error - Please check server logs');
  }
});

app.listen(PORT, () => {
  const log = process.env.NODE_ENV === 'production' ? console.info : console.log;
  log(`Snipshift server running on port ${PORT}`);
  log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;