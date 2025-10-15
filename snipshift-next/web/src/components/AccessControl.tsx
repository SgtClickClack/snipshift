'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface AccessControlProps {
  children: React.ReactNode;
  allowedRoles?: Array<'client' | 'hub' | 'professional' | 'brand' | 'admin'>;
  requireVerification?: boolean;
}

export default function AccessControl({ 
  children, 
  allowedRoles = [], 
  requireVerification = false 
}: AccessControlProps) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/register');
      return;
    }

    // Check if user has required roles
    if (allowedRoles.length > 0) {
      const hasRequiredRole = allowedRoles.some(role => 
        user?.roles?.includes(role)
      );
      
      if (!hasRequiredRole) {
        router.push('/dashboard');
        return;
      }
    }

    // Check verification status for Brand/Professional users
    if (requireVerification) {
      const isBrandOrProfessional = user?.roles?.includes('brand') || 
                                    user?.roles?.includes('professional');
      
      if (isBrandOrProfessional) {
        // For now, skip verification check as User interface doesn't include verification properties
        // TODO: Add verification properties to User interface when needed
      }
    }
  }, [isAuthenticated, user, allowedRoles, requireVerification, router]);

  if (!isAuthenticated) {
    return null;
  }

  // Check role requirements
  if (allowedRoles.length > 0) {
    const hasRequiredRole = allowedRoles.some(role => 
      user?.roles?.includes(role)
    );
    
    if (!hasRequiredRole) {
      return null;
    }
  }

  // Check verification requirements
  if (requireVerification) {
    const isBrandOrProfessional = user?.roles?.includes('brand') || 
                                  user?.roles?.includes('professional');
    
    if (isBrandOrProfessional) {
      // For now, skip verification check as User interface doesn't include verification properties
      // TODO: Add verification properties to User interface when needed
    }
  }

  return <>{children}</>;
}
