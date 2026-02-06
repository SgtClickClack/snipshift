import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { getWaitlistedShifts } from '@/lib/api/professional';
import { Clock, MapPin, DollarSign, Users, ArrowRight, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  };

  if (isLoading) {
    return (
      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <Card className="bg-[#1e293b] border-white/10">
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
      </motion.div>
    );
  }

  if (count === 0) {
    return (
      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <Card className="bg-[#1e293b] border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 transition-transform duration-200 group-hover:scale-105" />
              My Standby Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Calendar}
              title="No standby shifts"
              description="Join waitlists for filled shifts to be notified when they become available."
            />
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants} initial="hidden" animate="visible">
      <Card className="bg-[#1e293b] border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 transition-transform duration-200 group-hover:scale-105" />
            My Standby Shifts
            <Badge variant="secondary" className="ml-2">
              {count}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div className="space-y-3" variants={containerVariants} initial="hidden" animate="visible">
            {waitlistedShifts.map((entry) => {
              const shift = entry.shift;
              const startTime = new Date(shift.startTime);
              const endTime = new Date(shift.endTime);

              return (
                <motion.div
                  key={entry.id}
                  variants={itemVariants}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border border-white/10 hover:shadow-md transition-shadow group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <Badge 
                        variant={entry.rank === 1 ? "default" : "secondary"}
                        className={entry.rank === 1 ? "bg-[#10b981]" : ""}
                      >
                        {getRankSuffix(entry.rank)} in line
                      </Badge>
                      <h4 className="font-semibold text-lg truncate">{shift.title}</h4>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 transition-transform duration-200 group-hover:scale-105" />
                          <span>
                            {format(startTime, "MMM d, yyyy")} • {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
                          </span>
                        </div>
                        {shift.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 transition-transform duration-200 group-hover:scale-105" />
                            <span className="truncate max-w-[200px]">{shift.location}</span>
                          </div>
                        )}
                        {shift.hourlyRate && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 transition-transform duration-200 group-hover:scale-105 text-[#10b981]" />
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
                      <ArrowRight className="h-4 w-4 ml-2 transition-transform duration-200 group-hover:scale-105" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
