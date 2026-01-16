import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getWaitlistedShifts } from '@/lib/api';
import { Clock, MapPin, DollarSign, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

/**
 * StandbyShiftsSection Component
 * 
 * Displays all shifts the worker is currently waitlisted for.
 * Shows rank, shift details, and quick actions.
 */
export function StandbyShiftsSection() {
  const navigate = useNavigate();

  const { data: waitlistData, isLoading } = useQuery({
    queryKey: ['waitlisted-shifts'],
    queryFn: getWaitlistedShifts,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  const waitlistedShifts = waitlistData?.shifts || [];
  const count = waitlistData?.count || 0;

  // Get rank suffix (1st, 2nd, 3rd, 4th, 5th)
  const getRankSuffix = (num: number): string => {
    if (num === 1) return '1st';
    if (num === 2) return '2nd';
    if (num === 3) return '3rd';
    return `${num}th`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Standby Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (count === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Standby Shifts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium mb-2">No standby shifts</p>
            <p className="text-sm">
              Join waitlists for filled shifts to be notified when they become available.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          My Standby Shifts
          <Badge variant="secondary" className="ml-2">
            {count}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {waitlistedShifts.map((entry) => {
            const shift = entry.shift;
            const startTime = new Date(shift.startTime);
            const endTime = new Date(shift.endTime);

            return (
              <div
                key={entry.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border hover:shadow-md transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 mb-2">
                    <Badge 
                      variant={entry.rank === 1 ? "default" : "secondary"}
                      className={entry.rank === 1 ? "bg-green-600" : ""}
                    >
                      {getRankSuffix(entry.rank)} in line
                    </Badge>
                    <h4 className="font-semibold text-lg truncate">{shift.title}</h4>
                  </div>
                  
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          {format(startTime, "MMM d, yyyy")} • {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
                        </span>
                      </div>
                      {shift.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate max-w-[200px]">{shift.location}</span>
                        </div>
                      )}
                      {shift.hourlyRate && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>${parseFloat(shift.hourlyRate).toFixed(2)}/hr</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 sm:flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/shifts/${shift.id}`)}
                  >
                    View Details
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
