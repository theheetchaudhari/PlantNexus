import { useState, useEffect, useRef } from 'react';
import { fetchAnalytics } from '../api/client';
import type { AnalyticsResponse } from '../api/types';

interface UseAnalyticsResult {
  data: AnalyticsResponse | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useAnalytics(machineId?: string, limit: number = 1000): UseAnalyticsResult {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  const isFetchingRef = useRef(false);

  const loadData = async (signal?: AbortSignal) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    try {
      if (!data) {
        setLoading(true);
      }
      const result = await fetchAnalytics(machineId, limit, signal);
      setData(result);
      setError(null);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    loadData(abortController.signal);

    const intervalId = setInterval(() => {
      loadData(abortController.signal);
    }, 30000);

    return () => {
      abortController.abort();
      clearInterval(intervalId);
    };
  }, [machineId, limit]);

  return {
    data,
    loading,
    error,
    refresh: () => loadData()
  };
}
