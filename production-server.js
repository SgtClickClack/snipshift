// Production server configuration for Snipshift
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration for production
app.use(cors({
  origin: ['https://www.snipshift.com.au', 'https://snipshift.com.au'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all handler for React Router - serve the main React app
app.use((req, res) => {
  try {
    const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
    res.send(html);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

app.listen(PORT, () => {
  const log = process.env.NODE_ENV === 'production' ? console.info : console.log;
  log(`Snipshift server running on port ${PORT}`);
  log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;