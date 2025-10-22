import React, { Suspense, lazy, memo } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';

// Lazy loading components for better performance
const Dashboard = lazy(() => import('../app/dashboard/page'));
const AdminVerifications = lazy(() => import('../app/admin/verifications/page'));
const ApplicationPending = lazy(() => import('../app/application-pending/page'));

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Alert severity="error" sx={{ mb: 2 }}>
        Something went wrong: {error.message}
      </Alert>
      <button onClick={resetErrorBoundary} className="btn btn-primary">
        Try again
      </button>
    </Box>
  );
}

// Loading component
function LoadingSpinner() {
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '200px' 
    }}>
      <CircularProgress />
    </Box>
  );
}

// Performance-optimized wrapper component
export const PerformanceWrapper = memo(({ children }: { children: React.ReactNode }) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<LoadingSpinner />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
});

PerformanceWrapper.displayName = 'PerformanceWrapper';

// Optimized image component
export const OptimizedImage = memo(({ 
  src, 
  alt, 
  width, 
  height, 
  className = '',
  priority = false,
  ...props 
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  [key: string]: any;
}) => {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`optimized-image ${className}`}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      style={{
        width: '100%',
        height: 'auto',
        objectFit: 'cover',
      }}
      {...props}
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Virtual scrolling component for large lists
export const VirtualList = memo(({ 
  items, 
  itemHeight, 
  containerHeight, 
  renderItem 
}: {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: any, index: number) => React.ReactNode;
}) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + Math.ceil(containerHeight / itemHeight) + 1, items.length);
  
  const visibleItems = items.slice(startIndex, endIndex);
  
  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${startIndex * itemHeight}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

VirtualList.displayName = 'VirtualList';

// Debounced search component
export const DebouncedSearch = memo(({ 
  onSearch, 
  placeholder = 'Search...',
  delay = 300 
}: {
  onSearch: (query: string) => void;
  placeholder?: string;
  delay?: number;
}) => {
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [query, delay]);
  
  React.useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);
  
  return (
    <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder={placeholder}
      className="search-input"
      style={{
        width: '100%',
        padding: '0.75rem',
        border: '1px solid var(--neutral-300)',
        borderRadius: 'var(--radius-lg)',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color var(--transition-base)',
      }}
    />
  );
});

DebouncedSearch.displayName = 'DebouncedSearch';

// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (duration > 100) { // Log components that take more than 100ms to render
        console.warn(`Slow component render: ${componentName} took ${duration.toFixed(2)}ms`);
      }
    };
  }, [componentName]);
};

// Memory usage monitoring
export const useMemoryMonitor = () => {
  const [memoryUsage, setMemoryUsage] = React.useState<any>(null);
  
  React.useEffect(() => {
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        setMemoryUsage({
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit,
        });
      }
    };
    
    updateMemoryUsage();
    const interval = setInterval(updateMemoryUsage, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  return memoryUsage;
};

// Bundle size optimization utilities
export const bundleOptimizations = {
  // Code splitting helper
  createLazyComponent: (importFn: () => Promise<any>) => {
    return lazy(() => importFn().catch(() => ({
      default: () => (
        <Alert severity="error">
          Failed to load component. Please refresh the page.
        </Alert>
      )
    })));
  },
  
  // Preload critical components
  preloadComponent: (importFn: () => Promise<any>) => {
    importFn();
  },
  
  // Dynamic import with error handling
  dynamicImport: async (importFn: () => Promise<any>) => {
    try {
      return await importFn();
    } catch (error) {
      console.error('Dynamic import failed:', error);
      return null;
    }
  },
};

// Service worker registration for caching
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

// Image optimization utilities
export const imageOptimizations = {
  // Generate responsive image srcset
  generateSrcSet: (baseUrl: string, sizes: number[]) => {
    return sizes
      .map(size => `${baseUrl}?w=${size} ${size}w`)
      .join(', ');
  },
  
  // WebP support detection
  supportsWebP: () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  },
  
  // Lazy loading intersection observer
  createLazyLoadObserver: (callback: (entries: IntersectionObserverEntry[]) => void) => {
    return new IntersectionObserver(callback, {
      rootMargin: '50px 0px',
      threshold: 0.1,
    });
  },
};

// Performance metrics collection
export const performanceMetrics = {
  // Measure component render time
  measureRender: (componentName: string, renderFn: () => React.ReactNode) => {
    const start = performance.now();
    const result = renderFn();
    const end = performance.now();
    
    console.log(`${componentName} render time: ${(end - start).toFixed(2)}ms`);
    return result;
  },
  
  // Measure API call performance
  measureApiCall: async (apiCall: () => Promise<any>, endpoint: string) => {
    const start = performance.now();
    try {
      const result = await apiCall();
      const end = performance.now();
      console.log(`API call to ${endpoint}: ${(end - start).toFixed(2)}ms`);
      return result;
    } catch (error) {
      const end = performance.now();
      console.error(`API call to ${endpoint} failed after ${(end - start).toFixed(2)}ms:`, error);
      throw error;
    }
  },
  
  // Collect Core Web Vitals
  collectWebVitals: () => {
    if ('web-vital' in window) {
      // This would integrate with web-vitals library
      console.log('Web Vitals collection enabled');
    }
  },
};

export default {
  PerformanceWrapper,
  OptimizedImage,
  VirtualList,
  DebouncedSearch,
  usePerformanceMonitor,
  useMemoryMonitor,
  bundleOptimizations,
  imageOptimizations,
  performanceMetrics,
  registerServiceWorker,
};
