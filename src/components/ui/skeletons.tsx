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
