import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Data-fetching hook.
 *
 *   const { data, loading, error, refetch } = useFetch(
 *     () => studentService.getAll({ page, size: 10 }),
 *     [page, size],
 *     { initialData: null, immediate: true }
 *   );
 *
 * Behaviour
 *  - runs `fn` on mount and whenever `deps` change
 *  - `refetch()` re-runs it without changing `deps`
 *  - a response that arrives after the deps moved on is discarded, so rapid
 *    typing in a search box cannot leave a stale page rendered
 *  - `loading` is true only while the *latest* request is in flight
 *  - `error` is the normalised `{ message, status, errors }` from `api.js`
 *
 * `deps` behaves like a `useEffect` dependency list and is deliberately not
 * linted for exhaustiveness — callers pass a primitive list.
 */
export default function useFetch(fn, deps = [], options = {}) {
  const { immediate = true, initialData = null, onSuccess, onError } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const mounted = useRef(true);
  const requestId = useRef(0);
  // Kept in a ref so `execute` stays referentially stable across renders.
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const execute = useCallback(async (...args) => {
    const id = requestId.current + 1;
    requestId.current = id;

    setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current(...args);
      // A newer request superseded this one — drop it.
      if (!mounted.current || requestId.current !== id) return result;
      setData(result ?? initialData);
      onSuccessRef.current?.(result);
      return result;
    } catch (err) {
      if (!mounted.current || requestId.current !== id) return null;
      setError(err ?? { message: 'Unknown error', status: 0 });
      onErrorRef.current?.(err);
      return null;
    } finally {
      if (mounted.current && requestId.current === id) setLoading(false);
    }
    // `initialData` is read inside the closure on purpose: it is a seed value,
    // not a dependency, and including it would re-run every render for callers
    // who pass an inline literal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (immediate) execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  /** Replace the cached value without a round trip (optimistic UI). */
  const setDataAnd = useCallback((updater) => {
    setData((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  return useMemo(
    () => ({ data, loading, error, refetch: execute, setData: setDataAnd }),
    [data, loading, error, execute, setDataAnd]
  );
}

export { useFetch };
