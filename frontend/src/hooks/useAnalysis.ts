import { useState, useRef, useEffect, useCallback } from 'react';
import { runAnalysis } from '../api/client';
import type { AnalysisResult } from '../api/types';

interface UseAnalysisResult {
  data: AnalysisResult | null;
  loading: boolean;
  error: Error | null;
  execute: (limit?: number) => Promise<void>;
  reset: () => void;
}

export function useAnalysis(machineId: string, defaultLimit: number = 100): UseAnalysisResult {
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const isRequestInFlight = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (limit?: number) => {
      if (isRequestInFlight.current) {
        return; // Prevent duplicate concurrent submissions
      }

      isRequestInFlight.current = true;
      setLoading(true);
      setError(null);

      // Abort previous inflight request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const result = await runAnalysis(machineId, limit ?? defaultLimit, controller.signal);
        setData(result);
        setError(null);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
        isRequestInFlight.current = false;
      }
    },
    [machineId, defaultLimit]
  );

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setData(null);
    setError(null);
    setLoading(false);
    isRequestInFlight.current = false;
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}
