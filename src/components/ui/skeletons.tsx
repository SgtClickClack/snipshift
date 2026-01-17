import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for sidebar conversation list
 * Displays a list of conversation items with avatars, names, and message previews
 */
export function ConversationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for chat message bubble stream
 * Displays alternating left and right message bubbles
 */
export function MessageBubblesSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, i) => {
        const isRight = i % 2 === 0;
        return (
          <div
            key={i}
            className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[70%] min-w-0 space-y-2 ${isRight ? 'items-end' : 'items-start'} flex flex-col`}>
              {!isRight && <Skeleton className="h-3 w-16" />}
              <Skeleton
                className={`rounded-lg ${
                  isRight
                    ? 'bg-primary/20 h-12 w-32'
                    : 'bg-muted h-12 w-40'
                }`}
              />
              <Skeleton className="h-2 w-12" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Skeleton loader for chat header (avatar, name, job title)
 */
export function ChatHeaderSkeleton() {
  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for Earnings Dashboard
 * Displays header, summary cards, and transaction table
 */
export function EarningsDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-10 w-64" />
          </div>
          <Skeleton className="h-5 w-96" />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-6">
              <Skeleton className="h-4 w-32 mb-3" />
              <Skeleton className="h-10 w-40 mb-2" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>

        {/* Transaction History Table */}
        <div className="rounded-lg border bg-card">
          <div className="p-6 border-b border-border">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for Schedule Calendar
 * Displays header with navigation and 7-column weekly calendar grid
 */
export function ScheduleCalendarSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-lg border bg-card">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-6">
            <div className="rounded-md border bg-muted/50">
              {/* Calendar Header - Days of week */}
              <div className="grid grid-cols-7 gap-px border-b border-border bg-border">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="p-3 bg-card">
                    <Skeleton className="h-4 w-12 mx-auto" />
                  </div>
                ))}
              </div>
              {/* Calendar Body - Time slots */}
              <div className="grid grid-cols-7 gap-px bg-border">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="bg-card min-h-[600px] p-2 space-y-2">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <Skeleton key={j} className="h-16 w-full rounded" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}