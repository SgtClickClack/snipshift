import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number; // 0-5, can be decimal for display
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function StarRating({ rating, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const displayRating = hoveredRating !== null ? hoveredRating : rating;
  const sizeClass = sizeClasses[size];

  const handleClick = (value: number) => {
    if (!readonly && onChange) {
      onChange(value);
    }
  };

  const handleMouseEnter = (value: number) => {
    if (!readonly) {
      setHoveredRating(value);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoveredRating(null);
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((value) => {
        const isFilled = value <= Math.floor(displayRating);
        const isHalfFilled = value - 0.5 <= displayRating && displayRating < value;
        const isHovered = hoveredRating !== null && value <= hoveredRating;

        return (
          <button
            key={value}
            type="button"
            onClick={() => handleClick(value)}
            onMouseEnter={() => handleMouseEnter(value)}
            onMouseLeave={handleMouseLeave}
            disabled={readonly || !onChange}
            className={cn(
              'transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded',
              readonly || !onChange ? 'cursor-default' : 'cursor-pointer',
              isHovered && !readonly ? 'scale-110' : ''
            )}
            aria-label={`Rate ${value} out of 5`}
          >
            <Star
              className={cn(
                sizeClass,
                isFilled || isHalfFilled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-steel-200 text-steel-200',
                !readonly && onChange && 'hover:fill-amber-300 hover:text-amber-300'
              )}
            />
          </button>
        );
      })}
      {!readonly && displayRating > 0 && (
        <span className="ml-2 text-sm text-steel-600">
          {displayRating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

