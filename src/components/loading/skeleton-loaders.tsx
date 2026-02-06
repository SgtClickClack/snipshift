import { SkeletonLoader } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

/**
 * DashboardLayoutSkeleton – mimics the main dashboard layout (navbar + stats + content).
 * Use in AuthGuard and role-selection during auth handshake to avoid jerkiness.
 */
export function DashboardLayoutSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      {/* Navbar placeholder */}
      <div className="h-14 md:h-16 border-b border-border bg-background">
        <div className="max-w-7xl mx-auto h-full px-4 flex items-center gap-4">
          <SkeletonLoader className="h-8 w-24 rounded" />
          <SkeletonLoader className="h-8 w-16 rounded ml-auto" />
          <SkeletonLoader className="h-8 w-8 rounded-full" />
        </div>
      </div>
      {/* Main content area */}
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
          {/* Content blocks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-64 rounded-lg bg-muted animate-pulse" />
              <div className="h-48 rounded-lg bg-muted animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="h-48 rounded-lg bg-muted animate-pulse" />
              <div className="h-32 rounded-lg bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * DashboardStatsSkeleton - Matches dashboard-stats component dimensions
 * Shows 4 stat cards in a grid layout
 */
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="border border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <SkeletonLoader className="h-4 w-24" />
                <SkeletonLoader className="h-8 w-20" />
                <SkeletonLoader className="h-3 w-32" />
              </div>
              <SkeletonLoader className="h-11 w-11 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * ShiftListSkeleton - For professional dashboard shift list
 * Shows multiple shift card skeletons
 */
export function ShiftListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border border-border">
          <CardContent className="p-6">
            <div className="flex gap-4">
              {/* Avatar skeleton */}
              <SkeletonLoader className="h-12 w-12 rounded-full flex-shrink-0" />
              
              {/* Content skeleton */}
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <SkeletonLoader className="h-5 w-3/4" />
                    <SkeletonLoader className="h-4 w-1/2" />
                  </div>
                  <SkeletonLoader className="h-6 w-20 rounded-full" />
                </div>
                
                <div className="space-y-2">
                  <SkeletonLoader className="h-4 w-full" />
                  <SkeletonLoader className="h-4 w-2/3" />
                </div>
                
                <div className="flex gap-2 pt-2">
                  <SkeletonLoader className="h-9 w-24 rounded-md" />
                  <SkeletonLoader className="h-9 w-24 rounded-md" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * ApplicantCardSkeleton - For venue dashboard applicant management
 * Matches ApplicationCard component dimensions
 */
export function ApplicantCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border border-border">
          <CardContent className="p-6">
            <div className="flex gap-4">
              {/* Avatar skeleton */}
              <SkeletonLoader className="h-16 w-16 rounded-full flex-shrink-0" />
              
              {/* Main content skeleton */}
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <SkeletonLoader className="h-6 w-32" />
                      <SkeletonLoader className="h-4 w-4 rounded-full" />
                    </div>
                    <SkeletonLoader className="h-4 w-24" />
                    <div className="space-y-1">
                      <SkeletonLoader className="h-4 w-40" />
                      <SkeletonLoader className="h-4 w-36" />
                      <SkeletonLoader className="h-4 w-32" />
                    </div>
                  </div>
                  <SkeletonLoader className="h-6 w-24 rounded-full flex-shrink-0" />
                </div>
                
                {/* Cover letter skeleton */}
                <SkeletonLoader className="h-16 w-full rounded-md" />
                
                {/* Action buttons skeleton */}
                <div className="flex gap-2 pt-4 border-t">
                  <SkeletonLoader className="h-10 flex-1 rounded-md" />
                  <SkeletonLoader className="h-10 flex-1 rounded-md" />
                </div>
                
                {/* Applied date skeleton */}
                <SkeletonLoader className="h-3 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * JobCardSkeleton - For shift marketplace feed (Near Me)
 * Matches EnhancedJobCard component dimensions
 */
export function JobCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border border-border">
          <CardContent className="p-5">
            {/* Header with Venue Info */}
            <div className="flex items-start gap-3 mb-4">
              <SkeletonLoader className="h-12 w-12 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonLoader className="h-6 w-3/4" />
                <SkeletonLoader className="h-4 w-1/2" />
              </div>
            </div>
            
            {/* Date & Time */}
            <div className="flex items-center gap-2 mb-3">
              <SkeletonLoader className="h-4 w-4 shrink-0" />
              <SkeletonLoader className="h-4 w-32" />
              <SkeletonLoader className="h-5 w-10 rounded-full ml-auto" />
            </div>
            
            {/* Location & Distance */}
            <div className="flex items-center gap-2 mb-3">
              <SkeletonLoader className="h-4 w-4 shrink-0" />
              <SkeletonLoader className="h-4 w-40 flex-1" />
              <SkeletonLoader className="h-5 w-16 rounded-full" />
            </div>
            
            {/* Pay Information */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <SkeletonLoader className="h-5 w-5" />
                <div className="space-y-1">
                  <SkeletonLoader className="h-5 w-24" />
                  <SkeletonLoader className="h-4 w-20" />
                </div>
              </div>
              <SkeletonLoader className="h-6 w-16 rounded-full" />
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <SkeletonLoader className="h-9 flex-1 rounded-md" />
              <SkeletonLoader className="h-9 flex-1 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
