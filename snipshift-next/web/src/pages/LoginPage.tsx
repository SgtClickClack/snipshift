// snipshift/snipshift-next/web/src/pages/LoginPage.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';
import { useAuth } from '../context/AuthContext';

interface AuthResponse {
  token: string;
  id: string;
  email: string;
  name: string;
  credits?: number;
}

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const mutation = useMutation<AuthResponse, Error, { email: string; password: string }>({
    mutationFn: (credentials) =>
      apiRequest('/api/login', {
        method: 'POST',
        body: credentials,
      }),
    onSuccess: (data) => {
      // Store both token and user data
      const userData = {
        id: data.id,
        email: data.email,
        name: data.name,
        credits: data.credits,
      };
      login(data.token, userData); // Set token and user in localStorage
      navigate('/business-dashboard'); // Redirect
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ email, password });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Business Login</h1>
      <form data-testid="login-form" onSubmit={handleSubmit}>
        {mutation.isError && (
          <div style={{ color: 'red' }}>
            {mutation.error.message || 'Login failed'}
          </div>
        )}
        <div style={{ margin: '10px 0' }}>
          <label>Email:</label><br />
          <input
            data-testid="login-email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div style={{ margin: '10px 0' }}>
          <label>Password:</label><br />
          <input
            data-testid="login-password-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;

