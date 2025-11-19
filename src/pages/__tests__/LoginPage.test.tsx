/**
 * LoginPage Component Tests
 * 
 * Tests successful login flow, error handling, form validation, and navigation
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../LoginPage';
import { apiRequest } from '../../lib/apiRequest';
import { AuthProvider } from '../../context/AuthContext';

// Mock the apiRequest module
jest.mock('../../lib/apiRequest');
const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('LoginPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  const renderLoginPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <LoginPage />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  describe('Successful Login Flow', () => {
    it('should successfully login and navigate to dashboard', async () => {
      const user = userEvent.setup();
      const mockAuthResponse = {
        token: 'mock-auth-token-12345',
        id: 'user-1',
        email: 'business@example.com',
        name: 'Test Business',
        credits: 10,
      };

      mockApiRequest.mockResolvedValueOnce(mockAuthResponse);

      renderLoginPage();

      await user.type(screen.getByTestId('login-email-input'), 'business@example.com');
      await user.type(screen.getByTestId('login-password-input'), 'password123');

      const submitButton = screen.getByRole('button', { name: /login/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('/api/login', {
          method: 'POST',
          body: {
            email: 'business@example.com',
            password: 'password123',
          },
        });
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/business-dashboard');
      });
    });

    it('should call login function with token and user data', async () => {
      const user = userEvent.setup();
      const mockAuthResponse = {
        token: 'mock-auth-token-12345',
        id: 'user-1',
        email: 'business@example.com',
        name: 'Test Business',
        credits: 10,
      };

      mockApiRequest.mockResolvedValueOnce(mockAuthResponse);

      // Mock useAuthStorage to capture login call
      const mockLogin = jest.fn();
      jest.spyOn(require('../../hooks/useAuthStorage'), 'useAuthStorage').mockReturnValue({
        isAuthenticated: false,
        token: null,
        user: null,
        login: mockLogin,
        logout: jest.fn(),
      });

      renderLoginPage();

      await user.type(screen.getByTestId('login-email-input'), 'business@example.com');
      await user.type(screen.getByTestId('login-password-input'), 'password123');

      const submitButton = screen.getByRole('button', { name: /login/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('mock-auth-token-12345', {
          id: 'user-1',
          email: 'business@example.com',
          name: 'Test Business',
          credits: 10,
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message for invalid credentials', async () => {
      const user = userEvent.setup();
      const error = new Error('Invalid credentials');
      mockApiRequest.mockRejectedValueOnce(error);

      renderLoginPage();

      await user.type(screen.getByTestId('login-email-input'), 'wrong@example.com');
      await user.type(screen.getByTestId('login-password-input'), 'wrongpassword');

      const submitButton = screen.getByRole('button', { name: /login/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should display error message for network failures', async () => {
      const user = userEvent.setup();
      const error = new Error('Network request failed');
      mockApiRequest.mockRejectedValueOnce(error);

      renderLoginPage();

      await user.type(screen.getByTestId('login-email-input'), 'business@example.com');
      await user.type(screen.getByTestId('login-password-input'), 'password123');

      const submitButton = screen.getByRole('button', { name: /login/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Network request failed')).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should display generic error message when error has no message', async () => {
      const user = userEvent.setup();
      const error = new Error();
      mockApiRequest.mockRejectedValueOnce(error);

      renderLoginPage();

      await user.type(screen.getByTestId('login-email-input'), 'business@example.com');
      await user.type(screen.getByTestId('login-password-input'), 'password123');

      const submitButton = screen.getByRole('button', { name: /login/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should require email field', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByTestId('login-email-input');
      expect(emailInput).toBeRequired();
    });

    it('should require password field', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const passwordInput = screen.getByTestId('login-password-input');
      expect(passwordInput).toBeRequired();
    });

    it('should validate email format', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByTestId('login-email-input');
      expect(emailInput).toHaveAttribute('type', 'email');
    });
  });

  describe('Loading State', () => {
    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      const promise = new Promise<any>((resolve) => {
        resolvePromise = resolve;
      });

      mockApiRequest.mockReturnValueOnce(promise);

      renderLoginPage();

      await user.type(screen.getByTestId('login-email-input'), 'business@example.com');
      await user.type(screen.getByTestId('login-password-input'), 'password123');

      const submitButton = screen.getByRole('button', { name: /login/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Logging in...')).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });

      await act(async () => {
        resolvePromise!({
          token: 'mock-token',
          id: 'user-1',
          email: 'business@example.com',
          name: 'Test Business',
        });
      });
    });

    it('should disable submit button during submission', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      const promise = new Promise<any>((resolve) => {
        resolvePromise = resolve;
      });

      mockApiRequest.mockReturnValueOnce(promise);

      renderLoginPage();

      await user.type(screen.getByTestId('login-email-input'), 'business@example.com');
      await user.type(screen.getByTestId('login-password-input'), 'password123');

      const submitButton = screen.getByRole('button', { name: /login/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      await act(async () => {
        resolvePromise!({
          token: 'mock-token',
          id: 'user-1',
          email: 'business@example.com',
          name: 'Test Business',
        });
      });
    });
  });

  describe('Integration with useAuth Hook', () => {
    it('should use auth context login function', async () => {
      const user = userEvent.setup();
      const mockAuthResponse = {
        token: 'mock-auth-token-12345',
        id: 'user-1',
        email: 'business@example.com',
        name: 'Test Business',
      };

      mockApiRequest.mockResolvedValueOnce(mockAuthResponse);

      // Verify that AuthProvider is used
      renderLoginPage();

      await user.type(screen.getByTestId('login-email-input'), 'business@example.com');
      await user.type(screen.getByTestId('login-password-input'), 'password123');

      const submitButton = screen.getByRole('button', { name: /login/i });
      await user.click(submitButton);

      // The component should not throw an error about useAuth being used outside provider
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });
    });
  });
});

