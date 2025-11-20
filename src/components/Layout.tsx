import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-14 items-center justify-between max-w-7xl mx-auto px-4">
          <div className="flex items-center">
            <Link to="/" className="mr-6 flex items-center space-x-2 font-bold">
              Public Job Board
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link to="/business-dashboard" className="text-sm font-medium transition-colors hover:text-primary">
                  Business Dashboard
                </Link>
                <button onClick={handleLogout} className="text-sm font-medium text-red-500 hover:text-red-600">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="text-sm font-medium transition-colors hover:text-primary">Login</Link>
            )}
          </div>
        </div>
      </nav>
      <main className="container max-w-7xl mx-auto py-8 px-4">
        <Outlet /> {/* Child routes will render here */}
      </main>
    </div>
  );
}
