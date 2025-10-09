const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock API endpoints for testing
app.get('/api/debug/users', (req, res) => {
  res.json({
    users: [
      {
        email: 'user@example.com',
        password: 'SecurePassword123!'
      }
    ]
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'user@example.com' && password === 'SecurePassword123!') {
    res.json({
      id: '43dc8e80-c9f2-48f4-bb8b-e6cba139d4fc',
      email: 'user@example.com',
      roles: ['professional'],
      currentRole: 'professional',
      displayName: 'Test User'
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all handler for React Router
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Simple test server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Server error:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});