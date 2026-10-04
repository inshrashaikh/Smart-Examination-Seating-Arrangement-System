import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Minimal data-fetching hook with loading / error / refetch.
 * `deps` behaves like a useEffect dependency list.
 */
export default function useAsync(fn, deps = [], { immediate = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const mounted = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current(...args);
      if (mounted.current) setData(result);
      return result;
    } catch (err) {
      if (mounted.current) setError(err);
      return null;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (immediate) execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, setData, loading, error, refetch: execute };
}

export { useAsync };
