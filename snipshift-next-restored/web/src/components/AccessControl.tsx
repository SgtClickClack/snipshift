'use client';

import React from 'react';

interface AccessControlProps {
  children: React.ReactNode;
  requireVerification?: boolean;
}

export default function AccessControl({ children, requireVerification = false }: AccessControlProps) {
  // For now, just render children without any access control
  // This is a placeholder to prevent the server from crashing
  return <>{children}</>;
}
