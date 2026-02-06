/**
 * Standby Hero Badge Component
 * 
 * Displays a badge on the worker dashboard when they have an active priority boost token
 */

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Clock } from 'lucide-react';
import { fetchPriorityBoostStatus } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

export function StandbyHeroBadge() {
  const { data: boostStatus, isLoading } = useQuery({
    queryKey: ['/api/worker/priority-boost'],
    queryFn: fetchPriorityBoostStatus,
    staleTime: 60 * 1000, // Cache for 1 minute
    refetchOnWindowFocus: true,
  });

  if (isLoading || !boostStatus?.hasActiveBoost) {
    return null;
  }

  const hoursRemaining = boostStatus.token?.hoursRemaining ?? 0;
  const expiresAt = boostStatus.token?.expiresAt 
    ? new Date(boostStatus.token.expiresAt)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' as const }}
    >
      <Card className="border-2 border-amber-500/50 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 shadow-lg group">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-500/20 p-2">
              <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400 transition-transform duration-200 group-hover:scale-105" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge 
                  variant="default" 
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                >
                  Standby Hero
                </Badge>
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  +10% Priority Boost Active
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 transition-transform duration-200 group-hover:scale-105" />
                <span>
                  {hoursRemaining > 0 
                    ? `${Math.round(hoursRemaining)}h remaining`
                    : expiresAt 
                      ? `Expires ${formatDistanceToNow(expiresAt, { addSuffix: true })}`
                      : 'Active'}
                </span>
              </div>
              {boostStatus.shift && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Earned for: {boostStatus.shift.title}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
