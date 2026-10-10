import { useState, useEffect, useRef } from 'react';
import { fetchTelemetry } from '../api/client';
import type { TelemetryRecord } from '../api/types';

interface UseTelemetryResult {
  data: TelemetryRecord[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useTelemetry(machineId?: string, limit: number = 100): UseTelemetryResult {
  const [data, setData] = useState<TelemetryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use a ref to track if fetch is currently inflight to prevent overlap
  const isFetchingRef = useRef(false);

  const loadData = async (signal?: AbortSignal) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    try {
      // Don't set loading to true on refresh to avoid UI flickering
      if (data.length === 0) {
        setLoading(true);
      }
      
      const result = await fetchTelemetry(machineId, limit, signal);
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
    }, 10000);

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
