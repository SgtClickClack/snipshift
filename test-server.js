const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Store user sessions
const userSessions = new Map();

// Enable CORS for all routes
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add cookie parser for session management
app.use(require('cookie-parser')());

// Mock authentication endpoints
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  
  // Mock duplicate email check
  if (email === 'existing@example.com') {
    return res.status(400).json({ message: "User already exists with this email" });
  }
  
  // Mock successful registration
  res.json({
    id: `user_${Date.now()}`,
    email: email,
    roles: ['client'],
    currentRole: 'client',
    displayName: email.split('@')[0],
    profileImage: ''
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock invalid credentials
  if (email === 'invalid@example.com' || password === 'wrongpassword') {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  
  // Store user session
  const sessionId = `session_${Date.now()}`;
  const user = {
    id: 'test-user-123',
    email: email,
    roles: ['professional'],
    currentRole: 'professional',
    displayName: email === 'existing@example.com' ? 'Existing User' : 
                 email === 'multirole@example.com' ? 'Multi Role User' :
                 email === 'professional@example.com' ? 'Professional User' :
                 email === 'hub@example.com' ? 'Hub User' :
                 email === 'brand@example.com' ? 'Brand User' :
                 email === 'trainer@example.com' ? 'Trainer User' : 'Test User',
    profileImage: ''
  };
  
  userSessions.set(sessionId, user);
  res.cookie('sessionId', sessionId);
  res.json(user);
});

app.post('/api/logout', (req, res) => {
  res.json({ ok: true });
});

// Mock user management endpoints
app.get('/api/users/:id', (req, res) => {
  res.json({
    id: req.params.id,
    email: 'test@example.com',
    roles: ['professional'],
    currentRole: 'professional',
    displayName: 'Test User'
  });
});

app.patch('/api/users/:id/roles', (req, res) => {
  const { action, role } = req.body;
  res.json({
    id: req.params.id,
    email: 'test@example.com',
    roles: action === 'add' ? ['professional', role] : ['professional'],
    currentRole: 'professional',
    displayName: 'Test User'
  });
});

app.patch('/api/users/:id/current-role', (req, res) => {
  const { role } = req.body;
  res.json({
    id: req.params.id,
    email: 'test@example.com',
    roles: ['professional', role],
    currentRole: role,
    displayName: 'Test User'
  });
});

app.patch('/api/users/:id/profile', (req, res) => {
  res.json({
    id: req.params.id,
    email: 'test@example.com',
    roles: ['professional'],
    currentRole: 'professional',
    displayName: 'Updated User'
  });
});

// Mock OAuth endpoints
app.post('/api/oauth/google/exchange', (req, res) => {
  res.json({
    id: 'google-user-123',
    email: 'google@example.com',
    roles: [],
    currentRole: null,
    displayName: 'Google User'
  });
});

// Serve test pages for specific routes
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-signup.html'));
});

app.get('/role-selection', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-role-selection.html'));
});

app.get('/profile', (req, res) => {
  const sessionId = req.cookies.sessionId;
  const user = userSessions.get(sessionId);
  
  if (!user) {
    return res.redirect('/login');
  }
  
  // Inject user data into the HTML
  let html = fs.readFileSync(path.join(__dirname, 'public', 'test-profile.html'), 'utf8');
  html = html.replace('test@example.com', user.email);
  html = html.replace('Test User', user.displayName);
  res.send(html);
});

app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-forgot-password.html'));
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all handler for React Router
app.use((req, res) => {
  try {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } catch (err) {
    console.error('Error serving index.html:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Server error:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});