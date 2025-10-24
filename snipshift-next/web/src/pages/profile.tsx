import React, { Suspense } from 'react';
import { ComponentLoadingFallback } from '@/components/loading/loading-spinner';

const IntegratedProfileSystem = React.lazy(() => import('@/components/profile/integrated-profile-system'));

interface ProfilePageProps {
  userId?: string;
}

export default function ProfilePage({ userId }: ProfilePageProps) {
  return (
    <Suspense fallback={<ComponentLoadingFallback />}>
      <IntegratedProfileSystem userId={userId} />
    </Suspense>
  );
}