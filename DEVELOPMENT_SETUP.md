# Snipshift Development Setup

## Quick Start

The signup page issue has been fixed! Here's how to get the development server running:

### 1. Start the Development Server

```bash
# Option 1: Use the new startup script
npm run dev:start

# Option 2: Use the original command
npm run dev
```

### 2. Access the Application

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Signup Page**: http://localhost:3000/signup
- **Login Page**: http://localhost:3000/login

## What Was Fixed

### 🔧 **Routing Issues Resolved**
- Fixed missing component references in `App.tsx`
- Updated Vite configuration to run on port 3000 (was 3001)
- Fixed onboarding route references

### 🔧 **Missing Components**
- `BarberOnboarding`, `ShopOnboarding`, `BrandOnboarding` were referenced but didn't exist
- Updated routes to use the existing `ProfessionalOnboarding` component

### 🔧 **Port Configuration**
- Frontend now runs on port 3000 (matches your URL)
- Backend runs on port 5000
- Added startup script for easier development

## Development Commands

```bash
# Start both frontend and backend
npm run dev

# Start only frontend (port 3000)
npm run dev:client

# Start only backend (port 5000)
npm run dev:server

# Run database migrations
npm run db:migrate

# Clean up duplicate codebases
npm run cleanup
```

## Security Features Implemented

✅ **Password Hashing** - bcrypt implementation  
✅ **Database Connection** - PostgreSQL with hybrid storage  
✅ **RBAC** - Role-based access control  
✅ **Structured Logging** - Winston configuration  
✅ **Input Sanitization** - XSS protection  

## Next Steps

1. **Start the server**: `npm run dev:start`
2. **Visit signup**: http://localhost:3000/signup
3. **Test registration** with the secure authentication
4. **Check logs** for security events

The signup page should now work properly! 🎉
