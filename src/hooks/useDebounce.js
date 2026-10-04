import { useEffect, useState } from 'react';

/**
 * Debounces a fast-changing value.
 *
 * Used for search inputs so typing "kavya" issues one request instead of five.
 * `SEARCH_DEBOUNCE_MS` (400ms) is the project default.
 */
export default function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

export { useDebounce };
