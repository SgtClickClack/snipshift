/**
 * CapacityPlanner - Configure daily shift capacity requirements per venue
 * Weekly grid (Mon-Sun) with "Add Shift Slot" per day
 * Each slot: Label, Start time, End time, Required count
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Mon', dayOfWeek: 1 },
  { key: 'tuesday', label: 'Tue', dayOfWeek: 2 },
  { key: 'wednesday', label: 'Wed', dayOfWeek: 3 },
  { key: 'thursday', label: 'Thu', dayOfWeek: 4 },
  { key: 'friday', label: 'Fri', dayOfWeek: 5 },
  { key: 'saturday', label: 'Sat', dayOfWeek: 6 },
  { key: 'sunday', label: 'Sun', dayOfWeek: 0 },
];

export interface ShiftTemplateSlot {
  id?: string;
  clientId?: string; // For new slots before save
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  requiredStaffCount: number;
  label: string;
}

export interface ShiftTemplateApi {
  id: string;
  venueId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  requiredStaffCount: number;
  label: string;
  createdAt: string;
  updatedAt: string;
}

function parseTimeToHHmm(value: string): string {
  if (!value) return '09:00';
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (match) return value;
  const h = parseInt(value, 10);
  if (!isNaN(h) && h >= 0 && h <= 23) return `${h.toString().padStart(2, '0')}:00`;
  return '09:00';
}

export default function CapacityPlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [localSlots, setLocalSlots] = useState<ShiftTemplateSlot[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: templates = [], isLoading } = useQuery<ShiftTemplateApi[]>({
    queryKey: ['shift-templates'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/shift-templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!hasChanges) {
      setLocalSlots(
        templates.map((t) => ({
          id: t.id,
          dayOfWeek: t.dayOfWeek,
          startTime: parseTimeToHHmm(t.startTime),
          endTime: parseTimeToHHmm(t.endTime),
          requiredStaffCount: t.requiredStaffCount,
          label: t.label,
        }))
      );
    }
  }, [templates, hasChanges]);

  const addSlot = (dayOfWeek: number) => {
    setLocalSlots((prev) => [
      ...prev,
      {
        clientId: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        dayOfWeek,
        startTime: '09:00',
        endTime: '17:00',
        requiredStaffCount: 1,
        label: 'Shift',
      },
    ]);
    setHasChanges(true);
  };

  const updateSlot = (index: number, updates: Partial<ShiftTemplateSlot>) => {
    setLocalSlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
    setHasChanges(true);
  };

  const removeSlot = (index: number) => {
    setLocalSlots((prev) => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const toCreate = localSlots.filter((s) => !s.id);
      const toDelete = templates.filter((t) => !localSlots.some((s) => s.id === t.id));
      const toUpdate = localSlots.filter((s) => s.id);

      // PERFORMANCE: Execute all API operations in parallel instead of sequentially
      // All operations are independent: deletes don't affect creates or updates
      await Promise.all([
        // Delete templates in parallel
        ...toDelete.map((t) => 
          apiRequest('DELETE', `/api/shift-templates/${t.id}`)
        ),
        // Create new templates in parallel
        ...toCreate.map((s) =>
          apiRequest('POST', '/api/shift-templates', {
            dayOfWeek: s.dayOfWeek,
            startTime: parseTimeToHHmm(s.startTime),
            endTime: parseTimeToHHmm(s.endTime),
            requiredStaffCount: Math.max(1, s.requiredStaffCount),
            label: s.label.trim() || 'Shift',
          })
        ),
        // Update existing templates in parallel
        ...toUpdate
          .filter((s) => s.id) // Ensure we only update templates with IDs
          .map((s) =>
            apiRequest('PUT', `/api/shift-templates/${s.id}`, {
              dayOfWeek: s.dayOfWeek,
              startTime: parseTimeToHHmm(s.startTime),
              endTime: parseTimeToHHmm(s.endTime),
              requiredStaffCount: Math.max(1, s.requiredStaffCount),
              label: s.label.trim() || 'Shift',
            })
          ),
      ]);

      await queryClient.invalidateQueries({ queryKey: ['shift-templates'] });
      setHasChanges(false);
      toast({
        title: 'Capacity saved',
        description: 'Your shift capacity requirements have been updated.',
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to save';
      toast({
        title: 'Save failed',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalSlots(
      templates.map((t) => ({
        id: t.id,
        dayOfWeek: t.dayOfWeek,
        startTime: parseTimeToHHmm(t.startTime),
        endTime: parseTimeToHHmm(t.endTime),
        requiredStaffCount: t.requiredStaffCount,
        label: t.label,
      }))
    );
    setHasChanges(false);
  };

  const slotsByDay = DAYS_OF_WEEK.map((d) => ({
    ...d,
    slots: localSlots.filter((s) => s.dayOfWeek === d.dayOfWeek),
  }));

  if (!user?.id) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capacity Planner</CardTitle>
        <CardDescription>
          Define how many staff you need per shift slot each day. This drives the empty slots shown
          on your calendar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : localSlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 rounded-lg border border-dashed border-border bg-muted/20" data-testid="capacity-planner-empty">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-center font-medium text-foreground mb-1">No templates found</p>
            <p className="text-center text-sm text-muted-foreground mb-4 max-w-sm">
              Define your shift capacity to drive Auto-Fill and empty slots on the calendar.
            </p>
            <Button onClick={() => addSlot(1)} data-testid="capacity-planner-add-first">
              <Plus className="h-4 w-4 mr-2" />
              Add your first shift slot
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4" data-testid="capacity-planner-grid">
              {slotsByDay.map((day) => (
                <div
                  key={day.key}
                  className={cn(
                    'rounded-lg border p-4 space-y-3',
                    'bg-card'
                  )}
                >
                  <div className="font-medium text-sm">{day.label}</div>
                  <div className="space-y-3">
                    {day.slots.map((slot, idx) => {
                      const safeIndex = localSlots.findIndex(
                        (s) =>
                          (s.id && slot.id && s.id === slot.id) ||
                          (s.clientId && slot.clientId && s.clientId === slot.clientId)
                      );
                      if (safeIndex < 0) return null;
                      return (
                        <div
                          key={slot.id || slot.clientId || `slot-${day.dayOfWeek}-${idx}`}
                          className="rounded border p-3 space-y-2 bg-muted/30"
                          data-testid={`shift-slot-${day.key}-${idx}`}
                        >
                          <div className="flex justify-between items-center">
                            <Input
                              data-testid="slot-label-input"
                              placeholder="Label (e.g. Morning Bar)"
                              value={slot.label}
                              onChange={(e) => updateSlot(safeIndex, { label: e.target.value })}
                              className="text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeSlot(safeIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Start</Label>
                              <Input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => updateSlot(safeIndex, { startTime: e.target.value })}
                                className="text-sm h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">End</Label>
                              <Input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => updateSlot(safeIndex, { endTime: e.target.value })}
                                className="text-sm h-8"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Required</Label>
                            <Input
                              data-testid="slot-required-input"
                              type="number"
                              min={1}
                              value={slot.requiredStaffCount}
                              onChange={(e) =>
                                updateSlot(safeIndex, {
                                  requiredStaffCount: parseInt(e.target.value, 10) || 1,
                                })
                              }
                              className="text-sm h-8"
                            />
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => addSlot(day.dayOfWeek)}
                      data-testid={`add-template-button-${day.key}`}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Shift Slot
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {hasChanges && (
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving} data-testid="capacity-planner-save">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
