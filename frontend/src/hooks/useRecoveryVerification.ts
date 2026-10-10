import { useState, useRef, useEffect, useCallback } from 'react';
import { verifyRecovery } from '../api/client';
import type { RecoveryVerificationResult } from '../api/types';

interface UseRecoveryVerificationResult {
  data: RecoveryVerificationResult | null;
  loading: boolean;
  error: Error | null;
  execute: (limit?: number, minConsecutive?: number) => Promise<void>;
  reset: () => void;
}

export function useRecoveryVerification(
  machineId: string,
  defaultLimit: number = 50,
  defaultMinConsecutive: number = 3
): UseRecoveryVerificationResult {
  const [data, setData] = useState<RecoveryVerificationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const isRequestInFlight = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (limit?: number, minConsecutive?: number) => {
      if (isRequestInFlight.current) {
        return; // Prevent duplicate concurrent submissions
      }

      isRequestInFlight.current = true;
      setLoading(true);
      setError(null);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const result = await verifyRecovery(
          machineId,
          limit ?? defaultLimit,
          minConsecutive ?? defaultMinConsecutive,
          controller.signal
        );
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
    [machineId, defaultLimit, defaultMinConsecutive]
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
