// Simple SnipShift development server - Frontend only
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files from client directory
app.use(express.static(path.join(__dirname, 'client')));

// Mock API endpoints for development
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SnipShift Development Server' });
});

app.get('/api/users/me', (req, res) => {
  res.json({ 
    id: 'dev-user-1', 
    email: 'user@example.com', 
    name: 'Development User',
    role: 'user'
  });
});

// Serve the main HTML file for all other routes
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/index.html'));
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 SnipShift Development Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving frontend from: ${path.join(__dirname, 'client')}`);
  console.log('🔧 Mock API endpoints available');
});
