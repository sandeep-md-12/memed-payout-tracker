'use client';

import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { errorMessage } from '@/services/api';

interface ApiData<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** Fetches again (e.g. after an action changed the data). Keeps showing the old data meanwhile. */
  reload: () => Promise<void>;
}

/** Loads data from the API when the component mounts (and when `deps` change). */
export function useApiData<T>(load: () => Promise<T>, deps: DependencyList = []): ApiData<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  });

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loadRef.current());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload when the caller's deps change (e.g. a route id); `load` itself is read through the ref.
  useEffect(() => {
    void reload();
  }, deps);

  return { data, error, loading, reload };
}
