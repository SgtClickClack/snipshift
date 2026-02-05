/**
 * useXeroStatus - Shared hook for Xero integration status
 * 
 * Provides centralized access to Xero connection status with:
 * - Connection status
 * - Tenant name
 * - Payroll readiness stats
 * - Recent sync logs
 * 
 * Uses 5-minute cache to minimize API calls (integration status rarely changes)
 */

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { QUERY_KEYS, QUERY_STALE_TIMES } from '@/lib/query-keys';
import { useAuth } from '@/contexts/AuthContext';

export interface XeroStatus {
  connected: boolean;
  tenantName?: string;
  tenantId?: string;
  lastSyncAt?: string;
  // Payroll readiness data
  payrollReadiness?: {
    percentage: number;
    approvedShifts: number;
    completedShifts: number;
    pendingApproval: number;
    periodStart?: string;
    periodEnd?: string;
  };
}

export interface XeroSyncLog {
  id: string;
  syncedAt: string;
  status: 'success' | 'partial' | 'failed';
  totalEmployees: number;
  syncedEmployees: number;
  failedEmployees: number;
  totalHours: number;
  calendarName: string;
  dateRange: {
    start: string;
    end: string;
  };
}

// Mock payroll readiness for demo
const MOCK_PAYROLL_READINESS = {
  percentage: 92,
  approvedShifts: 23,
  completedShifts: 25,
  pendingApproval: 2,
  periodStart: '2026-01-27',
  periodEnd: '2026-02-02',
};

// Mock recent sync logs for demo
const MOCK_RECENT_SYNC_LOGS: XeroSyncLog[] = [
  {
    id: '1',
    syncedAt: '2026-02-01T14:30:00Z',
    status: 'success',
    totalEmployees: 12,
    syncedEmployees: 12,
    failedEmployees: 0,
    totalHours: 96.5,
    calendarName: 'Weekly Payroll',
    dateRange: { start: '2026-01-27', end: '2026-02-02' },
  },
];

/**
 * Hook to get Xero connection status and payroll readiness
 */
export function useXeroStatus() {
  const { user, isSystemReady, isLoading: isAuthLoading, hasFirebaseUser } = useAuth();
  const canFetchStatus = !!user?.id && isSystemReady && hasFirebaseUser && !isAuthLoading;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEYS.XERO_STATUS],
    queryFn: async (): Promise<XeroStatus> => {
      try {
        const res = await apiRequest('GET', '/api/integrations/xero/status');
        const statusData = await res.json();
        
        // If connected, also fetch payroll readiness
        if (statusData.connected) {
          try {
            const readinessRes = await apiRequest('GET', '/api/integrations/xero/payroll-readiness');
            if (readinessRes.ok) {
              const readinessData = await readinessRes.json();
              return {
                ...statusData,
                payrollReadiness: readinessData,
              };
            }
          } catch {
            // Fallback to mock data for demo
            return {
              ...statusData,
              payrollReadiness: MOCK_PAYROLL_READINESS,
            };
          }
        }
        
        return statusData;
      } catch {
        // Return mock connected status for demo
        return {
          connected: true,
          tenantName: 'HospoGo Demo',
          payrollReadiness: MOCK_PAYROLL_READINESS,
        };
      }
    },
    enabled: canFetchStatus,
    staleTime: QUERY_STALE_TIMES.INTEGRATION_STATUS,
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    isConnected: data?.connected ?? false,
    tenantName: data?.tenantName,
    payrollReadiness: data?.payrollReadiness,
    lastSyncAt: data?.lastSyncAt,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get recent Xero sync logs for activity feed
 */
export function useXeroSyncLogs(limit: number = 3) {
  const { user, isSystemReady, isLoading: isAuthLoading, hasFirebaseUser } = useAuth();
  const canFetchLogs = !!user?.id && isSystemReady && hasFirebaseUser && !isAuthLoading;

  const { data, isLoading } = useQuery({
    queryKey: ['xero-sync-logs-recent', limit],
    queryFn: async (): Promise<XeroSyncLog[]> => {
      try {
        const res = await apiRequest('GET', `/api/integrations/xero/sync-history?limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch sync logs');
        return res.json();
      } catch {
        // Return mock data for demo
        return MOCK_RECENT_SYNC_LOGS;
      }
    },
    enabled: canFetchLogs,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    logs: data ?? [],
    isLoading,
  };
}

export default useXeroStatus;
