'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { REGISTER_USER, GET_USER_ROLES } from '@/graphql/queries';
import { useNotification } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { testApiConnectivity } from '@/config/apollo';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role: 'HUB' | 'PROFESSIONAL' | 'BRAND' | 'TRAINER';
}

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showNotification } = useNotification();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: (searchParams?.get('role')?.toUpperCase() as RegisterFormData['role']) || 'PROFESSIONAL',
  });
  
  const [errors, setErrors] = useState<Partial<RegisterFormData>>({});
  const [apiConnectivityTest, setApiConnectivityTest] = useState<{
    status: 'testing' | 'success' | 'failed';
    message: string;
  }>({ status: 'testing', message: 'Testing API connectivity...' });

  // Test API connectivity on component mount
  useEffect(() => {
    const testConnection = async () => {
      console.log('🚀 Starting API connectivity test...');
      
      try {
        const result = await testApiConnectivity();
        
        if (result.success) {
          setApiConnectivityTest({
            status: 'success',
            message: 'API connection successful! Ready for registration.',
          });
          console.log('✅ API connectivity test completed successfully');
        } else {
          setApiConnectivityTest({
            status: 'failed',
            message: `API connection failed: ${result.error?.message || 'Unknown error'}`,
          });
          console.error('❌ API connectivity test failed:', result.error);
        }
      } catch (error) {
        setApiConnectivityTest({
          status: 'failed',
          message: `API connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
        console.error('💥 API connectivity test crashed:', error);
      }
    };

    testConnection();
  }, []);

  // Query to get available user roles (for testing purposes)
  const { data: rolesData, loading: rolesLoading, error: rolesError } = useQuery(GET_USER_ROLES);

  // Handle query results with useEffect
  useEffect(() => {
    if (rolesData) {
      console.log('📋 User roles fetched successfully:', rolesData);
    }
    if (rolesError) {
      console.error('❌ Failed to fetch user roles:', rolesError);
    }
  }, [rolesData, rolesError]);

  // Register user mutation
  const [registerUser, { loading: registerLoading, error: registerError }] = useMutation(REGISTER_USER);

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterFormData> = {};
    
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Valid email is required';
    }
    
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Form submitted with data:', { ...formData, password: '***', confirmPassword: '***' });
    
    if (!validateForm()) {
      console.warn('⚠️ Form validation failed');
      return;
    }

    if (apiConnectivityTest.status !== 'success') {
      showNotification('API connection not available. Please try again.', 'error');
      return;
    }

    console.log('🚀 Sending registration mutation to API...');
    
    try {
      const result = await registerUser({
        variables: {
          input: {
            email: formData.email,
            password: formData.password,
            displayName: `${formData.firstName} ${formData.lastName}`,
            roles: [formData.role],
            currentRole: formData.role,
          }
        }
      });

      console.log('🎉 Registration mutation completed:', result.data);
      
      if (result.data?.register?.success) {
        const { user, token } = result.data.register;
        
        // Store auth data
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(user));
        
        // Update auth context
        login(user);
        
        console.log('✅ Registration successful! User data:', user);
        console.log('🔑 JWT Token received:', token.substring(0, 20) + '...');
        
        showNotification('Registration successful! Welcome to SnipShift!', 'success');
        
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        console.error('❌ Registration failed:', result.data?.register?.message);
        showNotification(result.data?.register?.message || 'Registration failed', 'error');
      }
    } catch (error) {
      console.error('💥 Registration submission failed:', error);
      showNotification(`Registration error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleInputChange = (field: keyof RegisterFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Join SnipShift 2.0
        </Typography>
        
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Create your account and connect with the creative industry
        </Typography>

        {/* API Connectivity Status */}
        <Box sx={{ mb: 3 }}>
          <Alert 
            severity={
              apiConnectivityTest.status === 'success' ? 'success' : 
              apiConnectivityTest.status === 'failed' ? 'error' : 'info'
            }
            icon={apiConnectivityTest.status === 'testing' ? <CircularProgress size={20} /> : undefined}
          >
            {apiConnectivityTest.message}
          </Alert>
        </Box>

        {/* Roles Query Test */}
        {rolesLoading && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Loading user roles from API...
          </Alert>
        )}
        
        {rolesError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Failed to load roles: {rolesError.message}
          </Alert>
        )}
        
        {rolesData && (
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ Roles loaded successfully from API!
          </Alert>
        )}

        {/* Registration Form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              label="First Name"
              value={formData.firstName}
              onChange={handleInputChange('firstName')}
              error={!!errors.firstName}
              helperText={errors.firstName}
              required
            />
            <TextField
              fullWidth
              label="Last Name"
              value={formData.lastName}
              onChange={handleInputChange('lastName')}
              error={!!errors.lastName}
              helperText={errors.lastName}
              required
            />
          </Box>

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            error={!!errors.email}
            helperText={errors.email}
            sx={{ mb: 2 }}
            required
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={formData.role}
              label="Role"
              onChange={handleInputChange('role')}
            >
              <MenuItem value="HUB">Hub Owner</MenuItem>
              <MenuItem value="PROFESSIONAL">Professional</MenuItem>
              <MenuItem value="BRAND">Brand</MenuItem>
              <MenuItem value="TRAINER">Trainer</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Password"
            type="password"
            value={formData.password}
            onChange={handleInputChange('password')}
            error={!!errors.password}
            helperText={errors.password}
            sx={{ mb: 2 }}
            required
          />

          <TextField
            fullWidth
            label="Confirm Password"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            sx={{ mb: 3 }}
            required
          />

          {/* Test Credentials Chip */}
          <Box sx={{ mb: 2 }}>
            <Chip 
              label="Test: testuser@dojopool.com" 
              variant="outlined" 
              color="info" 
              onClick={() => {
                setFormData(prev => ({ ...prev, email: 'testuser@dojopool.com' }));
              }}
              sx={{ mr: 1, mb: 1 }}
            />
            <Chip 
              label="Password: test123" 
              variant="outlined" 
              color="info" 
              onClick={() => {
                setFormData(prev => ({ ...prev, password: 'test123', confirmPassword: 'test123' }));
              }}
            />
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={registerLoading || apiConnectivityTest.status !== 'success'}
            sx={{ py: 1.5 }}
          >
            {registerLoading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </Box>

        <Typography variant="body2" align="center" sx={{ mt: 3 }}>
          Already have an account?{' '}
          <Button variant="text" onClick={() => router.push('/auth/login')}>
            Sign In
          </Button>
        </Typography>
      </Paper>
    </Container>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}