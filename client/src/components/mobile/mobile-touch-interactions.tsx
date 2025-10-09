import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Share2, Bookmark, MoreHorizontal } from "lucide-react";

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onLongPress?: () => void;
  className?: string;
}

export function SwipeableCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  onLongPress,
  className = "" 
}: SwipeableCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [showActions, setShowActions] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setStartX(touch.clientX);
    setCurrentX(touch.clientX);
    setIsDragging(true);

    // Start long press timer
    const timer = setTimeout(() => {
      onLongPress?.();
    }, 1000);
    setLongPressTimer(timer);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    setCurrentX(touch.clientX);

    // Cancel long press if user moves
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    const deltaX = currentX - startX;
    const threshold = 100;

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
        setShowActions(true);
      }
    }

    setIsDragging(false);
    setStartX(0);
    setCurrentX(0);

    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setStartX(e.clientX);
    setCurrentX(e.clientX);
    setIsDragging(true);

    const timer = setTimeout(() => {
      onLongPress?.();
    }, 1000);
    setLongPressTimer(timer);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCurrentX(e.clientX);

    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;

    const deltaX = currentX - startX;
    const threshold = 100;

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
        setShowActions(true);
      }
    }

    setIsDragging(false);
    setStartX(0);
    setCurrentX(0);

    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setCurrentX(e.clientX);
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('mousemove', handleGlobalMouseMove);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isDragging]);

  const translateX = isDragging ? currentX - startX : 0;

  return (
    <div className="relative overflow-hidden">
      <div
        ref={cardRef}
        className={`transition-transform duration-200 ${className}`}
        style={{
          transform: `translateX(${translateX}px)`,
          touchAction: 'pan-y'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {children}
      </div>

      {/* Swipe Actions */}
      {showActions && (
        <div 
          className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-steel-600 to-transparent flex items-center justify-end pr-4"
          data-testid="mobile-swipe-actions"
        >
          <div className="flex flex-col space-y-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0"
              data-testid="mobile-save-job"
            >
              <Bookmark className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0"
              data-testid="mobile-share-job"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  threshold = 100 
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
    
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;

    if (pullDistance > threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setIsPulling(false);
    setPullDistance(0);
  };

  const pullProgress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      <div
        className={`absolute top-0 left-0 right-0 flex items-center justify-center transition-transform duration-200 ${
          isPulling || isRefreshing ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{ height: `${Math.min(pullDistance, threshold)}px` }}
        data-testid="mobile-refresh-indicator"
      >
        <div className="flex items-center space-x-2 text-steel-600">
          {isRefreshing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-steel-600"></div>
              <span className="text-sm">Refreshing...</span>
            </>
          ) : (
            <>
              <div 
                className="rounded-full h-4 w-4 border-2 border-steel-600"
                style={{
                  borderTopColor: 'transparent',
                  transform: `rotate(${pullProgress * 180}deg)`
                }}
              />
              <span className="text-sm">
                {pullProgress > 0.8 ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ paddingTop: isPulling || isRefreshing ? Math.min(pullDistance, threshold) : 0 }}>
        {children}
      </div>
    </div>
  );
}

interface LongPressHandlerProps {
  onLongPress: () => void;
  children: React.ReactNode;
  duration?: number;
}

export function LongPressHandler({ 
  onLongPress, 
  children, 
  duration = 1000 
}: LongPressHandlerProps) {
  const [isPressed, setIsPressed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleStart = () => {
    setIsPressed(true);
    timerRef.current = setTimeout(() => {
      onLongPress();
      setIsPressed(false);
    }, duration);
  };

  const handleEnd = () => {
    setIsPressed(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      className={isPressed ? 'opacity-75' : ''}
    >
      {children}
    </div>
  );
}

// Example usage component for testing
export function MobileTouchInteractionsDemo() {
  const [swipeCount, setSwipeCount] = useState(0);
  const [longPressCount, setLongPressCount] = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);

  const handleSwipeLeft = () => {
    setSwipeCount(prev => prev + 1);
  };

  const handleLongPress = () => {
    setLongPressCount(prev => prev + 1);
  };

  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshCount(prev => prev + 1);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-4">Touch Interactions Demo</h2>
        <div className="space-y-2 text-sm">
          <p>Swipe left: {swipeCount}</p>
          <p>Long press: {longPressCount}</p>
          <p>Refresh: {refreshCount}</p>
        </div>
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-4">
          <SwipeableCard onSwipeLeft={handleSwipeLeft} onLongPress={handleLongPress}>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold">Swipeable Card</h3>
                <p className="text-sm text-steel-600 mt-2">
                  Swipe left to reveal actions, long press for context menu
                </p>
              </CardContent>
            </Card>
          </SwipeableCard>

          <LongPressHandler onLongPress={handleLongPress}>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold">Long Press Handler</h3>
                <p className="text-sm text-steel-600 mt-2">
                  Hold for 1 second to trigger long press
                </p>
              </CardContent>
            </Card>
          </LongPressHandler>
        </div>
      </PullToRefresh>
    </div>
  );
}
