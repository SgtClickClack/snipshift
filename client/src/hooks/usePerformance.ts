import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Hook for managing virtual scrolling to improve performance with large lists
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange,
  };
}

/**
 * Hook for managing infinite scrolling with performance optimizations
 */
export function useInfiniteScroll<T>(
  fetchMore: () => Promise<T[]>,
  hasMore: boolean = true,
  threshold: number = 100
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(hasMore);

  const loadMore = useCallback(async () => {
    if (loading || !hasMoreData) return;

    setLoading(true);
    try {
      const newItems = await fetchMore();
      setItems(prev => [...prev, ...newItems]);
      setHasMoreData(newItems.length > 0);
    } catch (error) {
      console.error('Error loading more items:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchMore, loading, hasMoreData]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < threshold) {
      loadMore();
    }
  }, [loadMore, threshold]);

  return {
    items,
    loading,
    hasMoreData,
    loadMore,
    handleScroll,
    setItems,
  };
}

/**
 * Hook for managing search with debouncing and performance optimizations
 */
export function useSearch<T>(
  items: T[],
  searchFn: (item: T, searchTerm: string) => boolean,
  debounceMs: number = 300
) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  const filteredItems = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return items;
    return items.filter(item => searchFn(item, debouncedSearchTerm));
  }, [items, debouncedSearchTerm, searchFn]);

  return {
    searchTerm,
    setSearchTerm,
    filteredItems,
    isSearching: searchTerm !== debouncedSearchTerm,
  };
}
