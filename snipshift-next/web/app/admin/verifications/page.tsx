'use client';

import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Button, 
  Chip, 
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { CheckCircle, Cancel, Visibility } from '@mui/icons-material';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client';
import { GET_PENDING_VERIFICATIONS, APPROVE_USER, REJECT_USER } from '../../../src/graphql/admin';
import Image from 'next/image';

interface PendingUser {
  id: string;
  email: string;
  displayName: string;
  role: 'brand' | 'trainer';
  profile: {
    companyName?: string;
    contactName?: string;
    phone?: string;
    website?: string;
    description?: string;
    businessType?: string;
    location?: {
      city: string;
      state: string;
      country: string;
    };
    socialMediaLinks?: {
      instagram?: string;
      facebook?: string;
      youtube?: string;
    };
    verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  };
  createdAt: string;
}

export default function AdminVerificationsPage() {
  const { state } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = state.user?.roles?.includes('admin');

  // GraphQL queries and mutations
  const { data, loading, refetch } = useQuery(GET_PENDING_VERIFICATIONS, {
    skip: !isAdmin,
    errorPolicy: 'all'
  });

  const [approveUser] = useMutation(APPROVE_USER, {
    onCompleted: () => {
      refetch();
    },
    onError: (error) => {
      setError('Failed to approve user: ' + error.message);
    }
  });

  const [rejectUser] = useMutation(REJECT_USER, {
    onCompleted: () => {
      refetch();
    },
    onError: (error) => {
      setError('Failed to reject user: ' + error.message);
    }
  });

  useEffect(() => {
    if (!state.isAuthenticated) {
      router.push('/auth/register');
      return;
    }

    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
  }, [state.isAuthenticated, isAdmin, router]);

  const handleApprove = async (userId: string) => {
    try {
      await approveUser({ variables: { userId } });
    } catch (err) {
      setError('Failed to approve user');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await rejectUser({ variables: { userId } });
    } catch (err) {
      setError('Failed to reject user');
    }
  };

  if (!state.isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Image
          src="/logo-new.svg"
          alt="SnipShift V2 Logo"
          width={200}
          height={60}
          style={{ marginBottom: '2rem' }}
        />
      </Box>

      <Typography variant="h4" component="h1" gutterBottom>
        Admin Verification Dashboard
      </Typography>

      <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
        Review and approve Brand/Trainer applications
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : data?.pendingVerifications?.length === 0 ? (
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            No Pending Applications
          </Typography>
          <Typography variant="body1" color="text.secondary">
            All applications have been reviewed.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Company Details</TableCell>
                <TableCell>Contact Info</TableCell>
                <TableCell>Applied</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.pendingVerifications?.map((user: any) => {
                const profile = user.brandProfile || user.trainerProfile;
                const role = user.brandProfile ? 'brand' : 'trainer';
                
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">{user.displayName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={role.toUpperCase()} 
                        color={role === 'brand' ? 'primary' : 'secondary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {profile?.companyName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {profile?.businessType}
                        </Typography>
                        {profile?.website && (
                          <Typography variant="body2" color="primary">
                            {profile.website}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {profile?.contactName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {profile?.phone}
                        </Typography>
                        {profile?.location && (
                          <Typography variant="body2" color="text.secondary">
                            {profile.location.city}, {profile.location.state}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CheckCircle />}
                          onClick={() => handleApprove(user.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          startIcon={<Cancel />}
                          onClick={() => handleReject(user.id)}
                        >
                          Reject
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}
