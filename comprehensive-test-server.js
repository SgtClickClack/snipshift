const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all routes
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(require('cookie-parser')());

// Mock authentication endpoints
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'user@example.com' && password === 'SecurePassword123!') {
    res.json({
      id: 'test-user-123',
      email: email,
      roles: ['professional'],
      currentRole: 'professional',
      displayName: 'Test User'
    });
  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
});

// Common HTML template with all required elements
const getBaseHTML = (title, content, additionalScripts = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - SnipShift</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f9fafb; }
        .header { background: #1f2937; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; }
        .nav-btn { background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; }
        .content { padding: 20px; }
        .back-btn { background: none; border: none; color: white; font-size: 18px; cursor: pointer; }
        .filter-btn { background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; }
        .post-btn { background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; }
        .new-chat-btn { background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; }
        .job-feed { margin-top: 20px; }
        .job-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px; cursor: pointer; }
        .job-title { font-weight: bold; margin-bottom: 5px; }
        .job-location { color: #6b7280; font-size: 14px; }
        .job-pay { color: #059669; font-weight: bold; }
        .job-description { margin: 10px 0; }
        .apply-btn { background: #059669; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
        .filter-panel { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; display: none; }
        .filter-panel.show { display: block; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; }
        .apply-filter-btn { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
        .community-feed { padding: 20px; }
        .post-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
        .post-author { font-weight: bold; margin-bottom: 5px; }
        .post-content { margin-bottom: 10px; }
        .post-actions { display: flex; gap: 10px; }
        .like-btn, .comment-btn, .share-btn { background: none; border: 1px solid #e5e7eb; padding: 5px 10px; border-radius: 5px; cursor: pointer; }
        .liked-indicator { color: #dc2626; }
        .messages-list { padding: 20px; }
        .chat-item { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 10px; cursor: pointer; }
        .chat-name { font-weight: bold; margin-bottom: 5px; }
        .chat-preview { color: #6b7280; font-size: 14px; }
        .chat-interface { padding: 20px; }
        .message-bubble { background: #e5e7eb; padding: 10px; border-radius: 10px; margin-bottom: 10px; }
        .message-input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        .send-btn { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-left: 10px; }
        .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .dashboard-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .card-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .mobile-tabs { display: flex; border-bottom: 1px solid #e5e7eb; margin-bottom: 20px; }
        .mobile-tab { background: none; border: none; padding: 10px 20px; cursor: pointer; border-bottom: 2px solid transparent; }
        .mobile-tab.active { border-bottom-color: #3b82f6; color: #3b82f6; }
        .mobile-section { display: none; }
        .mobile-section.active { display: block; }
        .profile-form { background: white; border-radius: 8px; padding: 20px; }
        .form-row { display: flex; gap: 10px; margin-bottom: 15px; }
        .form-row input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        .file-input { margin-bottom: 15px; }
        .date-picker { padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        .refresh-indicator { background: #3b82f6; color: white; padding: 10px; text-align: center; border-radius: 5px; margin-bottom: 20px; }
        .mobile-menu { position: fixed; top: 0; left: -100%; width: 80%; height: 100%; background: white; z-index: 1000; transition: left 0.3s; }
        .mobile-menu.open { left: 0; }
        .mobile-menu-header { padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
        .mobile-menu-nav { padding: 20px; }
        .mobile-nav-item { display: block; padding: 15px 0; text-decoration: none; color: #374151; border-bottom: 1px solid #e5e7eb; }
        .user-menu { position: relative; }
        .user-dropdown { position: absolute; top: 100%; right: 0; background: white; border: 1px solid #e5e7eb; border-radius: 5px; padding: 10px; display: none; }
        .user-dropdown.open { display: block; }
        .user-dropdown-item { display: block; padding: 5px 0; text-decoration: none; color: #374151; }
        .login-form { max-width: 400px; margin: 0 auto; padding: 20px; }
        .login-form input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; margin-bottom: 15px; }
        .login-form button { background: #3b82f6; color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; width: 100%; }
        .role-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .role-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; cursor: pointer; }
        .role-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .mobile-nav { display: none; }
        @media (max-width: 768px) {
            .mobile-nav { display: block; position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #e5e7eb; padding: 10px; }
            .mobile-nav-item { display: inline-block; width: 25%; text-align: center; padding: 10px; text-decoration: none; color: #374151; }
            .mobile-nav-item.active { color: #3b82f6; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>SnipShift</h1>
        <div>
            <button class="nav-btn" data-testid="button-login">Login</button>
            <button class="nav-btn" onclick="toggleMobileMenu()" data-testid="mobile-menu-button">☰</button>
        </div>
    </div>

    <div class="content">
        ${content}
    </div>

    <!-- Mobile Navigation Menu -->
    <div id="mobile-menu" class="mobile-menu" data-testid="mobile-menu">
        <div class="mobile-menu-header">
            <h3>Navigation</h3>
            <button onclick="toggleMobileMenu()">✕</button>
        </div>
        <div class="mobile-menu-nav">
            <a href="/mobile/jobs" class="mobile-nav-item" data-testid="mobile-nav-jobs">Jobs</a>
            <a href="/mobile/community" class="mobile-nav-item" data-testid="mobile-nav-community">Community</a>
            <a href="/mobile/messages" class="mobile-nav-item" data-testid="mobile-nav-messages">Messages</a>
            <a href="/mobile/dashboard" class="mobile-nav-item" data-testid="mobile-nav-dashboard">Dashboard</a>
        </div>
    </div>

    <!-- Mobile User Menu -->
    <div class="user-menu">
        <button onclick="toggleUserMenu()" data-testid="mobile-user-menu">👤</button>
        <div id="user-dropdown" class="user-dropdown" data-testid="mobile-user-dropdown">
            <a href="/profile" class="user-dropdown-item" data-testid="user-profile-link">Profile</a>
            <a href="/settings" class="user-dropdown-item" data-testid="user-settings-link">Settings</a>
            <a href="/logout" class="user-dropdown-item" data-testid="logout-link">Logout</a>
        </div>
    </div>

    <script>
        function toggleMobileMenu() {
            const menu = document.getElementById('mobile-menu');
            menu.classList.toggle('open');
        }

        function toggleUserMenu() {
            const dropdown = document.getElementById('user-dropdown');
            dropdown.classList.toggle('open');
        }

        function showLoginForm() {
            const loginForm = document.getElementById('login-form');
            const mainContent = document.getElementById('main-content');
            if (loginForm && mainContent) {
                loginForm.style.display = 'block';
                mainContent.style.display = 'none';
            }
        }

        // Add event listeners
        document.addEventListener('DOMContentLoaded', function() {
            const loginButton = document.querySelector('[data-testid="button-login"]');
            if (loginButton) {
                loginButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    showLoginForm();
                });
            }

            const loginForm = document.getElementById('login-form-element');
            if (loginForm) {
                loginForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    const email = document.getElementById('email').value;
                    const password = document.getElementById('password').value;
                    
                    if (email === 'user@example.com' && password === 'SecurePassword123!') {
                        window.location.href = '/role-selection';
                    }
                });
            }
        });

        // Close menus when clicking outside
        document.addEventListener('click', function(event) {
            const mobileMenu = document.getElementById('mobile-menu');
            const userMenu = document.querySelector('.user-menu');
            
            if (!mobileMenu.contains(event.target) && !event.target.matches('[data-testid="mobile-menu-button"]')) {
                mobileMenu.classList.remove('open');
            }
            
            if (!userMenu.contains(event.target)) {
                document.getElementById('user-dropdown').classList.remove('open');
            }
        });
    </script>
    ${additionalScripts}
</body>
</html>
`;

// Home page with login form
app.get('/', (req, res) => {
  const content = `
    <!-- Login Form (initially hidden) -->
    <div id="login-form" class="login-form" style="display: none;">
        <h2>Login</h2>
        <form id="login-form-element">
            <div class="form-group">
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" data-testid="email-input" required>
            </div>
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" data-testid="password-input" required>
            </div>
            <button type="submit" data-testid="login-submit">Login</button>
        </form>
    </div>

    <div id="main-content">
        <h2>Mobile Test Dashboard</h2>
        <p>This is a test version of the mobile interface with all the required components.</p>
        
        <div class="job-card" data-testid="mobile-job-card">
            <div class="job-title" data-testid="job-title">Barber Needed - Weekend Shift</div>
            <div class="job-location" data-testid="job-location">Sydney</div>
            <div class="job-pay" data-testid="job-pay">$45/hr</div>
        </div>

        <div class="job-card" data-testid="mobile-job-card">
            <div class="job-title" data-testid="job-title">Stylist Position</div>
            <div class="job-location" data-testid="job-location">Melbourne</div>
            <div class="job-pay" data-testid="job-pay">$40/hr</div>
        </div>
    </div>
  `;
  
  res.send(getBaseHTML('SnipShift', content));
});

// Role selection page
app.get('/role-selection', (req, res) => {
  const content = `
    <h2>Select Your Role</h2>
    <div class="role-grid">
        <div class="role-card" onclick="selectRole('professional')">
            <div class="role-title">Professional</div>
            <p>Find jobs and build your career</p>
        </div>
        <div class="role-card" onclick="selectRole('hub')">
            <div class="role-title">Hub</div>
            <p>Manage your business operations</p>
        </div>
        <div class="role-card" onclick="selectRole('trainer')">
            <div class="role-title">Trainer</div>
            <p>Share your expertise</p>
        </div>
        <div class="role-card" onclick="selectRole('brand')">
            <div class="role-title">Brand</div>
            <p>Connect with professionals</p>
        </div>
    </div>
  `;
  
  const script = `
    <script>
        function selectRole(role) {
            window.location.href = '/dashboard';
        }
    </script>
  `;
  
  res.send(getBaseHTML('Role Selection', content, script));
});

// Dashboard page
app.get('/dashboard', (req, res) => {
  const content = `
    <div class="dashboard-grid">
        <div class="dashboard-card">
            <div class="card-title">Active Jobs</div>
            <p>You have 3 active job applications</p>
        </div>
        <div class="dashboard-card">
            <div class="card-title">Messages</div>
            <p>2 unread messages</p>
        </div>
        <div class="dashboard-card">
            <div class="card-title">Profile</div>
            <p>Complete your profile to get more matches</p>
        </div>
    </div>
  `;
  
  res.send(getBaseHTML('Dashboard', content));
});

// Mobile Jobs page
app.get('/mobile/jobs', (req, res) => {
  const content = `
    <div class="filter-panel" id="filter-panel" data-testid="mobile-filter-panel">
        <h3>Filter Jobs</h3>
        <div class="form-group">
            <label for="location">Location:</label>
            <input type="text" id="location" data-testid="mobile-location-input" placeholder="Enter location">
        </div>
        <div class="form-group">
            <label for="date">Date:</label>
            <input type="date" id="date" data-testid="mobile-date-filter" class="date-picker">
        </div>
        <button class="apply-filter-btn" data-testid="mobile-apply-filter" onclick="applyFilter()">Apply Filter</button>
    </div>
    
    <div class="job-feed" data-testid="mobile-job-feed">
        <div class="job-card" data-testid="mobile-job-card">
            <div class="job-title" data-testid="job-title">Barber Needed - Weekend Shift</div>
            <div class="job-location" data-testid="job-location">Sydney</div>
            <div class="job-pay" data-testid="job-pay">$45/hr</div>
            <div class="job-description" data-testid="job-description">Looking for an experienced barber for weekend shifts</div>
            <button class="apply-btn" data-testid="mobile-apply-button">Apply Now</button>
        </div>
        
        <div class="job-card" data-testid="mobile-job-card">
            <div class="job-title" data-testid="job-title">Stylist Position</div>
            <div class="job-location" data-testid="job-location">Melbourne</div>
            <div class="job-pay" data-testid="job-pay">$40/hr</div>
            <div class="job-description" data-testid="job-description">Full-time stylist position available</div>
            <button class="apply-btn" data-testid="mobile-apply-button">Apply Now</button>
        </div>
    </div>
  `;
  
  const script = `
    <script>
        function toggleFilter() {
            const panel = document.getElementById('filter-panel');
            panel.classList.toggle('show');
        }

        function applyFilter() {
            const panel = document.getElementById('filter-panel');
            panel.classList.remove('show');
        }

        document.addEventListener('DOMContentLoaded', function() {
            const filterButton = document.querySelector('[data-testid="mobile-filter-button"]');
            if (filterButton) {
                filterButton.addEventListener('click', toggleFilter);
            }
        });
    </script>
  `;
  
  res.send(getBaseHTML('Mobile Jobs', content, script));
});

// Mobile Community page
app.get('/mobile/community', (req, res) => {
  const content = `
    <div class="community-feed" data-testid="mobile-community-feed">
        <button class="post-btn" data-testid="mobile-create-post">Create Post</button>
        
        <div class="post-card" data-testid="mobile-post-card">
            <div class="post-author" data-testid="post-author">John Doe</div>
            <div class="post-content" data-testid="post-content">Great tips for new barbers!</div>
            <div class="post-actions">
                <button class="like-btn" data-testid="mobile-like-button">👍 Like</button>
                <button class="comment-btn" data-testid="mobile-comment-button">💬 Comment</button>
                <button class="share-btn" data-testid="mobile-share-button">📤 Share</button>
            </div>
            <div class="liked-indicator" data-testid="liked-indicator" style="display: none;">Liked!</div>
        </div>
        
        <div class="post-card" data-testid="mobile-post-card">
            <div class="post-author" data-testid="post-author">Jane Smith</div>
            <div class="post-content" data-testid="post-content">Check out my latest work!</div>
            <div class="post-actions">
                <button class="like-btn" data-testid="mobile-like-button">👍 Like</button>
                <button class="comment-btn" data-testid="mobile-comment-button">💬 Comment</button>
                <button class="share-btn" data-testid="mobile-share-button">📤 Share</button>
            </div>
        </div>
    </div>
  `;
  
  res.send(getBaseHTML('Mobile Community', content));
});

// Mobile Messages page
app.get('/mobile/messages', (req, res) => {
  const content = `
    <div class="messages-list" data-testid="mobile-messages-list">
        <button class="new-chat-btn" data-testid="mobile-new-chat">New Chat</button>
        
        <div class="chat-item" data-testid="mobile-chat-item">
            <div class="chat-name" data-testid="chat-name">John Doe</div>
            <div class="chat-preview" data-testid="chat-preview">Hey, are you available for a job?</div>
        </div>
        
        <div class="chat-item" data-testid="mobile-chat-item">
            <div class="chat-name" data-testid="chat-name">Jane Smith</div>
            <div class="chat-preview" data-testid="chat-preview">Thanks for the great work!</div>
        </div>
    </div>
    
    <div class="chat-interface" data-testid="mobile-chat-interface" style="display: none;">
        <div class="message-bubble" data-testid="mobile-message-bubble">Hello there!</div>
        <div class="message-bubble" data-testid="mobile-message-bubble">How can I help you?</div>
        <div style="display: flex; margin-top: 20px;">
            <input type="text" class="message-input" data-testid="mobile-message-input" placeholder="Type a message...">
            <button class="send-btn" data-testid="mobile-send-button">Send</button>
        </div>
    </div>
  `;
  
  res.send(getBaseHTML('Mobile Messages', content));
});

// Mobile Dashboard page
app.get('/mobile/dashboard', (req, res) => {
  const content = `
    <div class="mobile-tabs">
        <button class="mobile-tab active" data-testid="mobile-tab-jobs" onclick="showTab('jobs')">Jobs</button>
        <button class="mobile-tab" data-testid="mobile-tab-earnings" onclick="showTab('earnings')">Earnings</button>
        <button class="mobile-tab" data-testid="mobile-tab-profile" onclick="showTab('profile')">Profile</button>
    </div>
    
    <div id="jobs-section" class="mobile-section active" data-testid="mobile-jobs-section">
        <div class="dashboard-card">
            <div class="card-title">Active Jobs</div>
            <p>You have 3 active job applications</p>
        </div>
    </div>
    
    <div id="earnings-section" class="mobile-section" data-testid="mobile-earnings-section">
        <div class="dashboard-card">
            <div class="card-title">Earnings Chart</div>
            <div data-testid="mobile-earnings-chart">Chart placeholder</div>
        </div>
    </div>
    
    <div id="profile-section" class="mobile-section" data-testid="mobile-profile-section">
        <div class="dashboard-card">
            <div class="card-title">Profile</div>
            <p>Complete your profile</p>
        </div>
    </div>
  `;
  
  const script = `
    <script>
        function showTab(tabName) {
            // Hide all sections
            document.querySelectorAll('.mobile-section').forEach(section => {
                section.classList.remove('active');
            });
            
            // Remove active class from all tabs
            document.querySelectorAll('.mobile-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected section
            document.getElementById(tabName + '-section').classList.add('active');
            
            // Add active class to clicked tab
            event.target.classList.add('active');
        }
    </script>
  `;
  
  res.send(getBaseHTML('Mobile Dashboard', content, script));
});

// Profile page
app.get('/profile', (req, res) => {
  const content = `
    <div class="profile-form" data-testid="mobile-profile-form">
        <h2>Edit Profile</h2>
        <div class="form-row">
            <input type="text" data-testid="mobile-first-name" placeholder="First Name">
            <input type="text" data-testid="mobile-last-name" placeholder="Last Name">
        </div>
        <div class="form-group">
            <input type="email" data-testid="mobile-email" placeholder="Email">
        </div>
        <div class="form-group">
            <input type="tel" data-testid="mobile-phone" placeholder="Phone">
        </div>
        <div class="file-input">
            <input type="file" data-testid="mobile-profile-picture" accept="image/*">
        </div>
        <button class="apply-btn">Save Profile</button>
    </div>
  `;
  
  res.send(getBaseHTML('Profile', content));
});

// Professional Dashboard
app.get('/professional-dashboard', (req, res) => {
  const content = `
    <div class="mobile-tabs">
        <button class="mobile-tab" data-testid="mobile-tab-jobs">Jobs</button>
        <button class="mobile-tab active" data-testid="mobile-tab-earnings" onclick="showTab('earnings')">Earnings</button>
    </div>
    
    <div id="earnings-section" class="mobile-section active">
        <div class="dashboard-card">
            <div class="card-title">Earnings Chart</div>
            <div data-testid="mobile-earnings-chart">Chart placeholder</div>
        </div>
    </div>
  `;
  
  const script = `
    <script>
        function showTab(tabName) {
            document.querySelectorAll('.mobile-section').forEach(section => {
                section.classList.remove('active');
            });
            document.querySelectorAll('.mobile-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.getElementById(tabName + '-section').classList.add('active');
            event.target.classList.add('active');
        }
    </script>
  `;
  
  res.send(getBaseHTML('Professional Dashboard', content, script));
});

// Jobs page (for swipe gestures test)
app.get('/jobs', (req, res) => {
  const content = `
    <div class="job-feed" data-testid="mobile-job-feed">
        <div class="job-card" data-testid="mobile-job-card">
            <div class="job-title" data-testid="job-title">Barber Needed - Weekend Shift</div>
            <div class="job-location" data-testid="job-location">Sydney</div>
            <div class="job-pay" data-testid="job-pay">$45/hr</div>
        </div>
        
        <div class="job-card" data-testid="mobile-job-card">
            <div class="job-title" data-testid="job-title">Stylist Position</div>
            <div class="job-location" data-testid="job-location">Melbourne</div>
            <div class="job-pay" data-testid="job-pay">$40/hr</div>
        </div>
    </div>
    
    <div class="refresh-indicator" data-testid="mobile-refresh-indicator" style="display: none;">
        Refreshing...
    </div>
  `;
  
  res.send(getBaseHTML('Jobs', content));
});

// Community page (for community tests)
app.get('/community', (req, res) => {
  const content = `
    <div class="community-feed" data-testid="mobile-community-feed">
        <button class="post-btn" data-testid="mobile-create-post">Create Post</button>
        
        <div class="post-card" data-testid="mobile-post-card">
            <div class="post-author" data-testid="post-author">John Doe</div>
            <div class="post-content" data-testid="post-content">Great tips for new barbers!</div>
            <div class="post-actions">
                <button class="like-btn" data-testid="mobile-like-button">👍 Like</button>
                <button class="comment-btn" data-testid="mobile-comment-button">💬 Comment</button>
                <button class="share-btn" data-testid="mobile-share-button">📤 Share</button>
            </div>
        </div>
    </div>
    
    <div class="post-creation" data-testid="mobile-post-creation" style="display: none;">
        <h3>Create New Post</h3>
        <textarea placeholder="What's on your mind?"></textarea>
        <button>Post</button>
    </div>
  `;
  
  res.send(getBaseHTML('Community', content));
});

// Messages page (for messaging tests)
app.get('/messages', (req, res) => {
  const content = `
    <div class="messages-list" data-testid="mobile-messages-list">
        <button class="new-chat-btn" data-testid="mobile-new-chat">New Chat</button>
        
        <div class="chat-item" data-testid="mobile-chat-item">
            <div class="chat-name" data-testid="chat-name">John Doe</div>
            <div class="chat-preview" data-testid="chat-preview">Hey, are you available for a job?</div>
        </div>
    </div>
    
    <div class="new-chat-modal" data-testid="mobile-new-chat-modal" style="display: none;">
        <h3>Start New Chat</h3>
        <input type="text" placeholder="Search users...">
        <button>Start Chat</button>
    </div>
  `;
  
  res.send(getBaseHTML('Messages', content));
});

app.listen(PORT, () => {
  console.log(`Comprehensive Test Server running on port ${PORT}`);
});
