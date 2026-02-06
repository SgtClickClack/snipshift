/**
 * Admin Leads Page
 * 
 * Displays waitlist signups with CSV export functionality.
 * Neon Valley dashboard interface for managing leads.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Users, Loader2, CheckCircle2, XCircle, TrendingUp, AlertTriangle, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { formatDateSafe } from '@/utils/date-formatter';
import type { WaitlistEntry } from '@/types/waitlist';

/**
 * Format location string to display ISO 3166-1 country code
 * Location is stored as "City, State, Country" or "City, Country"
 * We extract and display the country code if available
 */
function formatLocation(location: string): string {
  if (!location) return 'N/A';
  
  // Try to extract country code (ISO 3166-1 alpha-2)
  // Common patterns: "Brisbane, QLD, AU" or "Brisbane, AU" or "Brisbane, Australia"
  const parts = location.split(',').map(p => p.trim());
  
  // Check if last part is a 2-letter country code (ISO 3166-1 alpha-2)
  const lastPart = parts[parts.length - 1];
  if (lastPart && lastPart.length === 2 && /^[A-Z]{2}$/.test(lastPart)) {
    // Return formatted location with country code
    return location;
  }
  
  // If no country code found, return as-is (defaults to Brisbane, AU)
  return location;
}

export default function AdminLeadsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);

  // Fetch last 10 waitlist entries for preview
  const { data: previewData, isLoading, error, refetch } = useQuery({
    queryKey: ['waitlist', 'preview'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/waitlist?limit=10');
      if (!response.ok) {
        throw new Error('Failed to fetch waitlist entries');
      }
      const result = await response.json();
      return result.data as WaitlistEntry[];
    },
  });

  // Fetch launch readiness report
  const { data: launchReadiness } = useQuery({
    queryKey: ['admin', 'launch-readiness'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/reports/launch-readiness');
      if (!response.ok) {
        throw new Error('Failed to fetch launch readiness report');
      }
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Track loading state per entry ID to prevent double-submissions
  const [loadingEntries, setLoadingEntries] = useState<Set<string>>(new Set());

  // Mutation for updating waitlist status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      // Set loading state for this specific entry
      setLoadingEntries((prev) => new Set(prev).add(id));
      
      const response = await apiRequest('PATCH', `/api/admin/waitlist/${id}/status`, {
        status,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update status');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Optimistically update the cache
      queryClient.setQueryData<WaitlistEntry[]>(['waitlist', 'preview'], (old) => {
        if (!old) return old;
        return old.map((entry) =>
          entry.id === variables.id
            ? {
                ...entry,
                approvalStatus: variables.status,
                approvedAt: data.data.approvedAt ? new Date(data.data.approvedAt) : null,
              }
            : entry
        );
      });

      // Clear loading state for this entry
      setLoadingEntries((prev) => {
        const next = new Set(prev);
        next.delete(variables.id);
        return next;
      });

      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['waitlist', 'preview'] });

      // Show success toast
      toast({
        title: variables.status === 'approved' ? 'Venue Approved' : 'Application Rejected',
        description: `Status updated successfully.`,
        variant: 'default',
      });
    },
    onError: (error: any, variables) => {
      // Clear loading state on error
      setLoadingEntries((prev) => {
        const next = new Set(prev);
        next.delete(variables.id);
        return next;
      });

      toast({
        title: 'Update failed',
        description: error?.message || 'Failed to update status. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleApprove = (id: string) => {
    if (loadingEntries.has(id)) return; // Prevent double-submission
    updateStatusMutation.mutate({ id, status: 'approved' });
  };

  const handleReject = (id: string) => {
    if (loadingEntries.has(id)) return; // Prevent double-submission
    updateStatusMutation.mutate({ id, status: 'rejected' });
  };

  // Export waitlist entries as CSV using admin endpoint
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      // Use the admin export endpoint which returns CSV directly
      const response = await apiRequest('GET', '/api/admin/waitlist/export');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to export waitlist entries');
      }

      // Get the CSV blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch 
        ? filenameMatch[1] 
        : `hospogo_waitlist_export_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Export successful',
        description: 'Waitlist entries exported to CSV file.',
        variant: 'default',
      });
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      toast({
        title: 'Export failed',
        description: error?.message || 'Failed to export waitlist entries. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-8 w-8 text-brand-neon" />
              Waitlist Leads
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and export Brisbane waitlist signups
            </p>
          </div>
          <Button
            onClick={handleExportCSV}
            disabled={isExporting || isLoading}
            className="bg-gradient-to-r from-brand-neon to-brand-neon/80 hover:from-brand-neon/90 hover:to-brand-neon/70 text-brand-dark font-semibold shadow-neon-realistic"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export to CSV
              </>
            )}
          </Button>
        </div>

        {/* Launch Metrics Summary Bar */}
        {launchReadiness && (
          <Card className="bg-gradient-to-r from-brand-neon/10 to-brand-neon/5 border-2 border-brand-neon/30 shadow-lg">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center md:text-left">
                  <p className="text-sm text-muted-foreground mb-1">Conversion Rate</p>
                  <p className="text-3xl font-bold text-brand-neon">
                    {launchReadiness.summary.conversionRate}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {launchReadiness.summary.totalOnboarded} of {launchReadiness.summary.totalApproved} approved
                  </p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-sm text-muted-foreground mb-1">At Risk</p>
                  <p className={`text-3xl font-bold ${launchReadiness.summary.atRiskCount > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {launchReadiness.summary.atRiskCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Approved &gt; 24hrs without profile
                  </p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-sm text-muted-foreground mb-1">Pending Onboarding</p>
                  <p className="text-3xl font-bold text-foreground">
                    {launchReadiness.summary.pendingOnboarding}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Need manual follow-up
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Launch Health Summary */}
        {launchReadiness && (
          <Card className="bg-card/95 backdrop-blur-sm border-2 border-brand-neon/30 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-brand-neon" />
                Launch Health
              </CardTitle>
              <CardDescription>
                Brisbane launch conversion metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Conversion Rate */}
                <div className="text-center md:text-left">
                  <p className="text-sm text-muted-foreground mb-1">Conversion Rate</p>
                  <p className="text-4xl font-bold text-brand-neon">
                    {launchReadiness.summary.conversionRate}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {launchReadiness.summary.totalOnboarded} of {launchReadiness.summary.totalApproved} approved
                  </p>
                </div>

                {/* Pending Onboarding */}
                <div className="text-center md:text-left">
                  <p className="text-sm text-muted-foreground mb-1">Pending Onboarding</p>
                  <p className="text-4xl font-bold text-yellow-400">
                    {launchReadiness.summary.pendingOnboarding}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Approved but not onboarded
                  </p>
                </div>

                {/* Fortitude Valley Focus */}
                <div className="text-center md:text-left">
                  <p className="text-sm text-muted-foreground mb-1">Fortitude Valley (4006)</p>
                  <p className="text-4xl font-bold text-brand-neon">
                    {launchReadiness.fortitudeValley?.count || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    venues onboarded
                  </p>
                </div>
              </div>

              {/* Postcode Distribution */}
              {launchReadiness.venuesByPostcode && launchReadiness.venuesByPostcode.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border/50">
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-brand-neon" />
                    Venues by Postcode
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {launchReadiness.venuesByPostcode.slice(0, 12).map((group: any) => (
                      <div
                        key={group.postcode}
                        className={`p-3 rounded-lg border ${
                          group.postcode === '4006'
                            ? 'bg-brand-neon/10 border-brand-neon/50'
                            : 'bg-muted/30 border-border/50'
                        }`}
                      >
                        <p className={`text-xl font-bold mb-1 ${
                          group.postcode === '4006' ? 'text-brand-neon' : 'text-foreground'
                        }`}>
                          {group.postcode}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {group.count} {group.count === 1 ? 'venue' : 'venues'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stuck Leads List */}
              {launchReadiness.stuckLeads && launchReadiness.stuckLeads.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border/50">
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Stuck Leads ({launchReadiness.stuckLeads.length})
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {launchReadiness.stuckLeads.slice(0, 10).map((lead: any) => (
                      <div
                        key={lead.id}
                        className="p-2 rounded bg-muted/30 border border-border/30 text-sm"
                      >
                        <p className="font-medium text-foreground">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.contact}</p>
                      </div>
                    ))}
                    {launchReadiness.stuckLeads.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{launchReadiness.stuckLeads.length - 10} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Preview Table */}
        <Card className="bg-card/95 backdrop-blur-sm border-2 border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle>Recent Signups (Last 10)</CardTitle>
            <CardDescription>
              Preview of the most recent waitlist entries. Export full data using the CSV button above.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-neon" />
                <span className="ml-3 text-muted-foreground">Loading waitlist entries...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-destructive mb-4">Failed to load waitlist entries</p>
                <Button onClick={() => refetch()} variant="outline">
                  Retry
                </Button>
              </div>
            ) : !previewData || previewData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No waitlist entries found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-3 text-sm font-semibold text-foreground">Timestamp</th>
                      <th className="text-left p-3 text-sm font-semibold text-foreground">Role</th>
                      <th className="text-left p-3 text-sm font-semibold text-foreground">Name/Venue</th>
                      <th className="text-left p-3 text-sm font-semibold text-foreground">Contact</th>
                      <th className="text-left p-3 text-sm font-semibold text-foreground">Location</th>
                      <th className="text-left p-3 text-sm font-semibold text-foreground">Status</th>
                      <th className="text-left p-3 text-sm font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3 text-sm text-muted-foreground">
                          {formatDateSafe(entry.createdAt, 'MMM d, yyyy HH:mm', 'N/A')}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={entry.role === 'venue' ? 'default' : 'secondary'}
                            className={
                              entry.role === 'venue'
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                            }
                          >
                            {entry.role === 'venue' ? 'Venue' : 'Staff'}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-foreground font-medium">
                          {entry.name || 'N/A'}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {entry.contact || 'N/A'}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {formatLocation(entry.location)}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={
                              entry.approvalStatus === 'approved'
                                ? 'bg-[#00ff9f]/20 text-[#00ff9f] border-[#00ff9f]/50'
                                : entry.approvalStatus === 'rejected'
                                ? 'bg-[#ff0055]/20 text-[#ff0055] border-[#ff0055]/50'
                                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                            }
                          >
                            {entry.approvalStatus === 'approved'
                              ? 'Approved'
                              : entry.approvalStatus === 'rejected'
                              ? 'Rejected'
                              : 'Pending'}
                          </Badge>
                          {entry.approvedAt && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatDateSafe(entry.approvedAt, 'MMM d, yyyy HH:mm', '')}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          {entry.approvalStatus === 'pending' ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(entry.id)}
                                disabled={loadingEntries.has(entry.id)}
                                className="bg-[#00ff9f]/20 hover:bg-[#00ff9f]/30 text-[#00ff9f] border border-[#00ff9f]/50 disabled:opacity-50"
                              >
                                {loadingEntries.has(entry.id) ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(entry.id)}
                                disabled={loadingEntries.has(entry.id)}
                                className="bg-[#ff0055]/20 hover:bg-[#ff0055]/30 text-[#ff0055] border border-[#ff0055]/50 disabled:opacity-50"
                              >
                                {loadingEntries.has(entry.id) ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <XCircle className="h-3 w-3 mr-1" />
                                )}
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {entry.approvalStatus === 'approved' ? 'Approved' : 'Rejected'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
