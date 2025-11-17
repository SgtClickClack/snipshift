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
    <div>
      <nav style={{ padding: '10px', background: '#f0f0f0', borderBottom: '1px solid #ccc' }}>
        <Link to="/" style={{ marginRight: '15px' }}>
          Public Job Board
        </Link>
        {isAuthenticated ? (
          <>
            <Link to="/business-dashboard" style={{ marginRight: '15px' }}>
              Business Dashboard
            </Link>
            <button onClick={handleLogout} style={{ marginLeft: '10px' }}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </nav>
      <main style={{ padding: '20px' }}>
        <Outlet /> {/* Child routes will render here */}
      </main>
    </div>
  );
}

