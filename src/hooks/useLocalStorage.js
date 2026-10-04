import { useCallback, useEffect, useState } from 'react';

/** State mirrored into localStorage, tolerant of SSR / private mode. */
export default function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const set = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* quota / private mode */
        }
        return resolved;
      });
    },
    [key]
  );

  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    setValue(undefined);
  }, [key]);

  return [value, set, remove];
}

export { useLocalStorage };
