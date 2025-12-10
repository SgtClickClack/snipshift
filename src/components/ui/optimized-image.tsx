import { useState, useEffect, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Image as ImageIcon } from "lucide-react";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** If true, sets loading="eager" and fetchPriority="high" for LCP elements */
  priority?: boolean;
  /** Type of fallback icon: "user" for avatars, "banner" for banners, or "image" for generic */
  fallbackType?: "user" | "banner" | "image";
  /** Custom className for the container */
  containerClassName?: string;
  /** If true, renders without wrapper div (useful for components like Avatar) */
  noWrapper?: boolean;
}

/**
 * OptimizedImage component that provides:
 * - Lazy loading by default (unless priority is true)
 * - Async decoding for better performance
 * - Loading skeleton/blur state
 * - Automatic fallback on 404 errors
 */
export function OptimizedImage({
  src,
  alt,
  priority = false,
  fallbackType = "image",
  className,
  containerClassName,
  noWrapper = false,
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | undefined>(src);

  useEffect(() => {
    // Reset state when src changes
    setIsLoading(true);
    setHasError(false);
    setImageSrc(src);
  }, [src]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);
    onLoad?.(e);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);
    setHasError(true);
    onError?.(e);
  };

  // Determine fallback icon based on type
  const getFallbackIcon = () => {
    const iconClass = "w-full h-full text-muted-foreground/50";
    switch (fallbackType) {
      case "user":
        return <User className={iconClass} />;
      case "banner":
        return <ImageIcon className={iconClass} />;
      default:
        return <ImageIcon className={iconClass} />;
    }
  };

  // If error, show fallback
  if (hasError || !imageSrc) {
    const fallbackContent = (
      <div
        className={cn(
          "flex items-center justify-center bg-muted",
          className,
          noWrapper ? "" : containerClassName
        )}
        role="img"
        aria-label={alt || "Image placeholder"}
      >
        {getFallbackIcon()}
      </div>
    );

    if (noWrapper) {
      return fallbackContent;
    }

    return <div className={cn("relative overflow-hidden", containerClassName)}>{fallbackContent}</div>;
  }

  const imageElement = (
    <>
      {/* Loading skeleton */}
      {isLoading && !noWrapper && (
        <Skeleton
          className={cn("absolute inset-0", className)}
          aria-hidden="true"
        />
      )}

      {/* Actual image */}
      <img
        src={imageSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        className={cn(
          "transition-opacity duration-300",
          isLoading && !noWrapper ? "opacity-0" : "opacity-100",
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </>
  );

  if (noWrapper) {
    return imageElement;
  }

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      {imageElement}
    </div>
  );
}

