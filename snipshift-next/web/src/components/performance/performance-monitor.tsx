import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
  });

  useEffect(() => {
    // Only run in development or when explicitly enabled
    if (process.env.NODE_ENV !== 'development' && !window.location.search.includes('perf=true')) {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
            }
            break;
          case 'largest-contentful-paint':
            setMetrics(prev => ({ ...prev, lcp: entry.startTime }));
            break;
          case 'first-input':
            setMetrics(prev => ({ ...prev, fid: (entry as any).processingStart - entry.startTime }));
            break;
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              setMetrics(prev => ({ ...prev, cls: (prev.cls || 0) + (entry as any).value }));
            }
            break;
          case 'navigation':
            const navEntry = entry as PerformanceNavigationTiming;
            setMetrics(prev => ({ ...prev, ttfb: navEntry.responseStart - navEntry.requestStart }));
            break;
        }
      });
    });

    // Observe different types of performance entries
    try {
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift', 'navigation'] });
    } catch (e) {
      // Fallback for browsers that don't support all entry types
      observer.observe({ entryTypes: ['paint', 'navigation'] });
    }

    return () => observer.disconnect();
  }, []);

  // Only show in development or when perf=true is in URL
  if (process.env.NODE_ENV !== 'development' && !window.location.search.includes('perf=true')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono z-50">
      <div className="font-bold mb-2">Performance Metrics</div>
      <div>FCP: {metrics.fcp ? `${metrics.fcp.toFixed(0)}ms` : 'Loading...'}</div>
      <div>LCP: {metrics.lcp ? `${metrics.lcp.toFixed(0)}ms` : 'Loading...'}</div>
      <div>FID: {metrics.fid ? `${metrics.fid.toFixed(0)}ms` : 'Loading...'}</div>
      <div>CLS: {metrics.cls ? metrics.cls.toFixed(3) : 'Loading...'}</div>
      <div>TTFB: {metrics.ttfb ? `${metrics.ttfb.toFixed(0)}ms` : 'Loading...'}</div>
    </div>
  );
}
