// Production server configuration for VentraIP cPanel
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
app.use(express.static(join(__dirname, 'public')));

// Import your existing routes
import './index.js';

// Catch-all handler for React Router
app.get('*', (req, res) => {
  try {
    const html = readFileSync(join(__dirname, 'public', 'index.html'), 'utf8');
    res.send(html);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`Snipshift server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

export default app;