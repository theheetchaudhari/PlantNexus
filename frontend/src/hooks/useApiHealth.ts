import { useState, useEffect } from 'react';
import { fetchHealth } from '../api/client';

export type HealthState = 'checking' | 'online' | 'offline' | 'error';

export function useApiHealth() {
  const [health, setHealth] = useState<HealthState>('checking');

  useEffect(() => {
    const abortController = new AbortController();

    const checkHealth = async () => {
      try {
        const data = await fetchHealth(abortController.signal);
        if (!abortController.signal.aborted) {
          if (data.status === 'ok') {
            setHealth('online');
          } else {
            setHealth('error');
          }
        }
      } catch (err: any) {
        if (!abortController.signal.aborted) {
          // Ignore DOMException for aborted requests
          if (err.name !== 'AbortError') {
            setHealth('offline');
          }
        }
      }
    };

    checkHealth();
    const intervalId = setInterval(checkHealth, 30000);

    return () => {
      abortController.abort();
      clearInterval(intervalId);
    };
  }, []);

  return health;
}
