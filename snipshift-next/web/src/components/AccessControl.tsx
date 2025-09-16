'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface AccessControlProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireVerification?: boolean;
}

export default function AccessControl({ 
  children, 
  allowedRoles = [], 
  requireVerification = false 
}: AccessControlProps) {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!state.isAuthenticated) {
      router.push('/auth/register');
      return;
    }

    // Check if user has required roles
    if (allowedRoles.length > 0) {
      const hasRequiredRole = allowedRoles.some(role => 
        state.user?.roles?.includes(role)
      );
      
      if (!hasRequiredRole) {
        router.push('/dashboard');
        return;
      }
    }

    // Check verification status for Brand/Trainer users
    if (requireVerification) {
      const isBrandOrTrainer = state.user?.roles?.includes('brand') || 
                              state.user?.roles?.includes('trainer');
      
      if (isBrandOrTrainer) {
        // Check verification status from user profile
        const verificationStatus = state.user?.brandProfile?.verificationStatus || 
                                  state.user?.trainerProfile?.verificationStatus;
        
        if (verificationStatus === 'PENDING') {
          router.push('/application-pending');
          return;
        }
        
        if (verificationStatus === 'REJECTED') {
          router.push('/application-pending'); // Show same page with rejection message
          return;
        }
      }
    }
  }, [state.isAuthenticated, state.user, allowedRoles, requireVerification, router]);

  if (!state.isAuthenticated) {
    return null;
  }

  // Check role requirements
  if (allowedRoles.length > 0) {
    const hasRequiredRole = allowedRoles.some(role => 
      state.user?.roles?.includes(role)
    );
    
    if (!hasRequiredRole) {
      return null;
    }
  }

  // Check verification requirements
  if (requireVerification) {
    const isBrandOrTrainer = state.user?.roles?.includes('brand') || 
                            state.user?.roles?.includes('trainer');
    
    if (isBrandOrTrainer) {
      const verificationStatus = state.user?.brandProfile?.verificationStatus || 
                                state.user?.trainerProfile?.verificationStatus;
      
      if (verificationStatus !== 'APPROVED') {
        return null;
      }
    }
  }

  return <>{children}</>;
}
