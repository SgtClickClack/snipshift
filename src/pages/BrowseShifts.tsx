import JobFeedPage from './job-feed';
import { useVerificationStatus } from '@/hooks/useVerificationStatus';

/**
 * BrowseShifts is an alias for the shift feed (/jobs).
 * Kept for clarity in HospoGo compliance feature work.
 */
export default function BrowseShifts() {
  useVerificationStatus();
  return <JobFeedPage />;
}

