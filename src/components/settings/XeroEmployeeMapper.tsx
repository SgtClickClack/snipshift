import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/useToast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IntegrationErrorBoundary } from '@/components/common/IntegrationErrorBoundary';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Loader2, Save, Search, Filter } from 'lucide-react';

interface XeroEmployee {
  EmployeeID: string;
  FirstName?: string;
  LastName?: string;
  Status?: string;
  Email?: string;
}

interface HospoGoStaff {
  id: string;
  name: string;
  email: string;
  xeroEmployeeId: string | null;
}

const ITEMS_PER_PAGE = 20;

export default function XeroEmployeeMapper() {
  const { toast } = useToast();
  const { user, isSystemReady, isLoading: isAuthLoading, hasFirebaseUser } = useAuth();
  const [xeroConnected, setXeroConnected] = useState(false);
  const [employees, setEmployees] = useState<XeroEmployee[]>([]);
  const [staff, setStaff] = useState<HospoGoStaff[]>([]);
  const [mappings, setMappings] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const canFetchStatus = !!user?.id && isSystemReady && hasFirebaseUser && !isAuthLoading;

  const fetchData = useCallback(async () => {
    if (!xeroConnected || !canFetchStatus) return;
    setIsLoading(true);
    try {
      const [empRes, staffRes] = await Promise.all([
        apiRequest('GET', '/api/integrations/xero/employees'),
        apiRequest('GET', '/api/integrations/xero/staff'),
      ]);
      const empData = await empRes.json();
      const staffData = await staffRes.json();
      setEmployees(empData.employees ?? []);
      setStaff(staffData.staff ?? []);
      const initial: Record<string, string | null> = {};
      for (const s of staffData.staff ?? []) {
        initial[s.id] = s.xeroEmployeeId ?? null;
      }
      setMappings(initial);
    } catch (err) {
      toast({
        title: 'Failed to load data',
        description: err instanceof Error ? err.message : 'Could not fetch Xero employees or staff.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [xeroConnected, canFetchStatus, toast]);

  useEffect(() => {
    if (!canFetchStatus) return;
    let cancelled = false;
    apiRequest('GET', '/api/integrations/xero/status')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setXeroConnected(d.connected === true); })
      .catch(() => { if (!cancelled) setXeroConnected(false); });
    return () => { cancelled = true; };
  }, [canFetchStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMappingChange = (staffId: string, xeroEmployeeId: string | null) => {
    setMappings((prev) => ({ ...prev, [staffId]: xeroEmployeeId }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const body = {
        mappings: staff.map((s) => ({
          userId: s.id,
          xeroEmployeeId: mappings[s.id] ?? null,
        })),
      };
      await apiRequest('POST', '/api/integrations/xero/map-employees', body);
      toast({
        title: 'Mappings saved',
        description: 'Xero employee mappings have been updated.',
      });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Could not save mappings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const employeeLabel = (e: XeroEmployee) => {
    const name = [e.FirstName, e.LastName].filter(Boolean).join(' ') || e.Email || e.EmployeeID;
    return `${name}${e.Status ? ` (${e.Status})` : ''}`;
  };

  // Filter staff based on search query and unmapped filter
  const filteredStaff = useMemo(() => {
    let result = staff;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query)
      );
    }
    
    // Apply unmapped filter
    if (showUnmappedOnly) {
      result = result.filter(s => !mappings[s.id]);
    }
    
    return result;
  }, [staff, searchQuery, showUnmappedOnly, mappings]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / ITEMS_PER_PAGE));
  const paginatedStaff = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStaff.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredStaff, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, showUnmappedOnly]);

  // Stats for display
  const mappedCount = staff.filter(s => mappings[s.id]).length;
  const unmappedCount = staff.length - mappedCount;

  if (!xeroConnected) return null;

  return (
    <IntegrationErrorBoundary>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Xero Employee Mapping
          </CardTitle>
          <CardDescription>
            Map your HospoGo staff to Xero Payroll employees for timesheet sync. Each Xero employee can only be linked to one staff member.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading employees and staff...</span>
            </div>
          ) : hasLoaded && staff.length === 0 ? (
            <p className="text-muted-foreground py-4">
              No staff have worked shifts for your venue yet. Staff will appear here once they have been assigned to completed shifts.
            </p>
          ) : hasLoaded && staff.length > 0 ? (
            <div className="space-y-4">
              {/* Stats bar */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{staff.length} total staff</span>
                <span className="text-green-600 dark:text-green-400">{mappedCount} mapped</span>
                <span className="text-amber-600 dark:text-amber-400">{unmappedCount} unmapped</span>
              </div>

              {/* Search and filter controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search staff by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="xero-mapper-search"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-unmapped"
                    checked={showUnmappedOnly}
                    onCheckedChange={(checked) => setShowUnmappedOnly(checked === true)}
                  />
                  <Label htmlFor="show-unmapped" className="text-sm cursor-pointer flex items-center gap-1">
                    <Filter className="h-3.5 w-3.5" />
                    Unmapped only
                  </Label>
                </div>
              </div>

              {/* Results info */}
              {(searchQuery || showUnmappedOnly) && (
                <p className="text-sm text-muted-foreground">
                  Showing {filteredStaff.length} of {staff.length} staff
                  {searchQuery && ` matching "${searchQuery}"`}
                  {showUnmappedOnly && ' (unmapped only)'}
                </p>
              )}

              <div className="rounded-md border overflow-x-auto" data-testid="xero-employee-mapper-table">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">HospoGo Staff</th>
                      <th className="text-left p-3 font-medium">Xero Employee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStaff.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="p-4 text-center text-muted-foreground">
                          No staff match the current filters
                        </td>
                      </tr>
                    ) : (
                      paginatedStaff.map((s) => (
                        <tr key={s.id} className="border-b last:border-0" data-testid={`xero-staff-row-${s.id}`}>
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{s.name}</p>
                              <p className="text-muted-foreground text-xs">{s.email}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <Select
                              value={mappings[s.id] ?? 'none'}
                              onValueChange={(v) =>
                                handleMappingChange(s.id, v === 'none' ? null : v)
                              }
                            >
                              <SelectTrigger className="w-full max-w-[280px]">
                                <SelectValue placeholder="Select Xero employee" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">— Not mapped —</SelectItem>
                                {employees.map((e) => (
                                  <SelectItem key={e.EmployeeID} value={e.EmployeeID}>
                                    {employeeLabel(e)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              <Button onClick={handleSave} disabled={isSaving} className="gap-2" data-testid="xero-save-mappings">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Mappings
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </IntegrationErrorBoundary>
  );
}
