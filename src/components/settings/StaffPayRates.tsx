/**
 * StaffPayRates - Business owners can set base hourly rate for staff members.
 * Used for roster costing. Staff must have been assigned to at least one shift.
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Save, Loader2 } from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  email?: string;
  baseHourlyRate?: number | null;
  currency?: string;
}

async function fetchStaffForEmployer(): Promise<StaffMember[]> {
  const res = await apiRequest('GET', '/api/venues/me/staff');
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export default function StaffPayRates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, string>>({});

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['venue-staff'],
    queryFn: fetchStaffForEmployer,
    enabled: !!user?.id,
  });

  const handleRateChange = (staffId: string, value: string) => {
    setRates((prev) => ({ ...prev, [staffId]: value }));
  };

  const handleSave = async (staffId: string) => {
    const value = rates[staffId] ?? String(staff.find((s) => s.id === staffId)?.baseHourlyRate ?? '');
    const num = value === '' ? null : parseFloat(value);
    if (value !== '' && (isNaN(num!) || num! < 0)) {
      toast({
        title: 'Invalid rate',
        description: 'Rate must be a non-negative number.',
        variant: 'destructive',
      });
      return;
    }

    setSavingId(staffId);
    try {
      await apiRequest('PATCH', `/api/users/${staffId}/pay-rate`, {
        baseHourlyRate: num,
      });
      queryClient.invalidateQueries({ queryKey: ['venue-staff'] });
      queryClient.invalidateQueries({ queryKey: ['roster-totals'] });
      toast({
        title: 'Rate saved',
        description: 'Staff pay rate has been updated.',
      });
      setRates((prev) => {
        const next = { ...prev };
        delete next[staffId];
        return next;
      });
    } catch (error: any) {
      toast({
        title: 'Failed to save',
        description: error?.message || 'Could not update rate.',
        variant: 'destructive',
      });
    } finally {
      setSavingId(null);
    }
  };

  if (!user?.id) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Staff Pay Rates
        </CardTitle>
        <CardDescription>
          Set base hourly rates for staff. Used for roster costing on the calendar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading staff...
          </div>
        ) : staff.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No staff yet. Assign staff to shifts to set their pay rates.
          </p>
        ) : (
          <div className="space-y-4">
            {staff.map((s) => {
              const displayValue = rates[s.id] ?? (s.baseHourlyRate != null ? String(s.baseHourlyRate) : '');
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-4 p-3 border rounded-lg"
                  data-testid={`staff-rate-row-${s.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{s.name}</p>
                    {s.email && (
                      <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`rate-${s.id}`} className="text-sm shrink-0">
                      $/hr
                    </Label>
                    <Input
                      id={`rate-${s.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={displayValue}
                      onChange={(e) => handleRateChange(s.id, e.target.value)}
                      className="w-24"
                      data-testid={`staff-rate-input-${s.id}`}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSave(s.id)}
                      disabled={savingId === s.id}
                      data-testid={`staff-rate-save-${s.id}`}
                    >
                      {savingId === s.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
