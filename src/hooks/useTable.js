import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Client-side table state machine: search, sorting and pagination.
 * `data` is the full (already server-filtered) row set.
 */
export default function useTable(data = [], { initialSort = null, pageSize: initialPageSize = 10 } = {}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const filtered = useMemo(() => {
    const rows = [...(data || [])];
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((cell) => String(cell ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  const sorted = useMemo(() => {
    if (!sort?.key) return filtered;
    const rows = [...filtered];
    rows.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
      return sort.dir === 'desc' ? -cmp : cmp;
    });
    return rows;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  const rows = useMemo(() => sorted.slice(start, start + pageSize), [sorted, start, pageSize]);

  const toggleSort = useCallback((key) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  }, []);

  const goTo = useCallback((next) => setPage(Math.min(Math.max(1, next), totalPages)), [totalPages]);

  return {
    rows,
    search,
    setSearch,
    sort,
    toggleSort,
    page: safePage,
    pageSize,
    setPageSize,
    totalPages,
    total: sorted.length,
    goTo,
    setPage,
  };
}

export { useTable };
