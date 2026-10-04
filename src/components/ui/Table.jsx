import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, X,
} from 'lucide-react';
import Button from './Button';
import EmptyState from './EmptyState';
import { Skeleton } from './Skeleton';
import useTable from '../../hooks/useTable';
import useDebounce from '../../hooks/useDebounce';
import cn from '../../utils/cn';

const PAGE_SIZES = [10, 25, 50, 100];

/**
 * DataTable with built-in search, sorting, pagination and empty/loading states.
 *
 * Client side:
 *   <Table columns={cols} rows={rows} pageSize={10} />
 *
 * Server side:
 *   <Table columns={cols} rows={data.items} serverSide total={data.total}
 *           page={page} onPageChange={setPage} onSearch={setSearch} />
 */
export default function Table({
  columns,
  rows = [],
  loading = false,
  skeletonRows = 8,
  searchable = true,
  searchPlaceholder = 'Search…',
  searchKeys,
  onSearch,
  pageSize: initialPageSize = 10,
  serverSide = false,
  total,
  page,
  onPageChange,
  initialSort = null,
  onRowClick,
  rowKey = (row, index) => row.id ?? index,
  emptyTitle = 'Nothing here yet',
  emptyDescription = 'Adjust your filters or add a new record to get started.',
  emptyIcon,
  emptyAction,
  toolbar,
  dense = false,
  stickyHeader = true,
  className,
  footer,
}) {
  const [localSearch, setLocalSearch] = useState('');
  const debouncedSearch = useDebounce(localSearch, 300);

  const clientTable = useTable(rows, { initialSort, pageSize: initialPageSize });

  const effectiveRows = serverSide ? rows : clientTable.rows;
  const effectiveTotal = serverSide ? total ?? rows.length : clientTable.total;
  const effectivePage = serverSide ? page ?? 1 : clientTable.page;
  const effectivePages = Math.max(1, Math.ceil(effectiveTotal / (serverSide ? initialPageSize : clientTable.pageSize)));
  const sort = serverSide ? null : clientTable.sort;
  const activePageSize = serverSide ? initialPageSize : clientTable.pageSize;

  const activeSearch = serverSide ? (onSearch ? '' : '') : debouncedSearch;

  const columnsMeta = useMemo(
    () =>
      columns.map((col) => ({
        ...col,
        _sortValue:
          typeof col.sortAccessor === 'function'
            ? col.sortAccessor
            : col.key
              ? (row) => row[col.key]
              : () => '',
      })),
    [columns]
  );

  const goTo = (next) => {
    const clamped = Math.min(Math.max(1, next), effectivePages);
    if (serverSide) onPageChange?.(clamped);
    else clientTable.setPage(clamped);
  };

  const toggleSort = (key) => {
    if (!serverSide) clientTable.toggleSort(key);
    else onPageChange?.(1);
  };

  const handleSearch = (value) => {
    if (serverSide) {
      onSearch?.(value);
      onPageChange?.(1);
    } else {
      setLocalSearch(value);
    }
  };

  const currentSearch = serverSide ? '' : localSearch;
  const SortIcon = ({ columnKey, active }) => {
    if (!columnKey) return null;
    if (!active) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sort.dir === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-primary-600 dark:text-primary-300" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-primary-600 dark:text-primary-300" />
    );
  };

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900/60', className)}>
      {/* ---------------- Toolbar ---------------- */}
      {(searchable || toolbar) && (
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          {searchable ? (
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={currentSearch}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-9 text-sm text-ink placeholder:text-slate-400 transition focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-primary-500"
              />
              {currentSearch ? (
                <button
                  type="button"
                  onClick={() => handleSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ) : (
            <div />
          )}
          <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
        </div>
      )}

      {/* ---------------- Table ---------------- */}
      <div className="w-full overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead
            className={cn(
              'bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50 dark:text-slate-400',
              stickyHeader && 'sticky top-0 z-10'
            )}
          >
            <tr>
              {columnsMeta.map((col) => (
                <th
                  key={col.key ?? col.header}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'whitespace-nowrap px-4 py-3',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.sortable && 'cursor-pointer select-none hover:text-primary-600 dark:hover:text-primary-300'
                  )}
                  onClick={col.sortable ? () => toggleSort(col.sortKey ?? col.key) : undefined}
                  aria-sort={sort && (sort.key === (col.sortKey ?? col.key)) ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <span className={cn('inline-flex items-center gap-1.5', col.align === 'right' && 'flex-row-reverse')}>
                    {col.header}
                    {col.sortable ? <SortIcon columnKey={col.sortKey ?? col.key} active={sort?.key === (col.sortKey ?? col.key)} /> : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {loading
              ? Array.from({ length: skeletonRows }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    {columnsMeta.map((col) => (
                      <td key={col.key ?? col.header} className="px-4 py-3.5">
                        <Skeleton className={cn('h-4', col.skeletonWidth ?? 'w-full')} />
                      </td>
                    ))}
                  </tr>
                ))
              : effectiveRows.map((row, rowIndex) => (
                  <motion.tr
                    key={rowKey(row, rowIndex)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(rowIndex * 0.02, 0.2) }}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'table-row-hover',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {columnsMeta.map((col) => (
                      <td
                        key={col.key ?? col.header}
                        className={cn(
                          'px-4 py-3 align-middle text-slate-600 dark:text-slate-300',
                          dense ? 'py-2' : 'py-3.5',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          col.nowrap && 'whitespace-nowrap'
                        )}
                      >
                        {col.render ? col.render(row, rowIndex) : row[col.key] ?? '—'}
                      </td>
                    ))}
                  </motion.tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* ---------------- Footer / pagination ---------------- */}
      {!loading && effectiveRows.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
          compact
        />
      ) : null}

      {!loading && effectiveRows.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-slate-100 p-4 text-sm dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-muted">
            <span>
              Showing{' '}
              <span className="font-semibold text-ink dark:text-slate-200">
                {(effectivePage - 1) * activePageSize + 1}
              </span>
              –{' '}
              <span className="font-semibold text-ink dark:text-slate-200">
                {Math.min(effectivePage * activePageSize, effectiveTotal)}
              </span>{' '}
              of <span className="font-semibold text-ink dark:text-slate-200">{effectiveTotal}</span>
            </span>
            {!serverSide ? (
              <select
                value={activePageSize}
                onChange={(e) => clientTable.setPageSize(Number(e.target.value))}
                aria-label="Rows per page"
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 focus:border-primary-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="iconSm"
              aria-label="First page"
              disabled={effectivePage === 1}
              onClick={() => goTo(1)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="iconSm"
              aria-label="Previous page"
              disabled={effectivePage === 1}
              onClick={() => goTo(effectivePage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="mx-1 flex items-center gap-1">
              {Array.from({ length: Math.min(5, effectivePages) }, (_, i) => {
                let pageNumber = i + 1;
                if (effectivePages > 5) {
                  if (effectivePage <= 3) pageNumber = i + 1;
                  else if (effectivePage >= effectivePages - 2) pageNumber = effectivePages - 4 + i;
                  else pageNumber = effectivePage - 2 + i;
                }
                const isActive = pageNumber === effectivePage;
                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => goTo(pageNumber)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'h-8 min-w-8 rounded-lg px-2 text-xs font-bold transition',
                      isActive
                        ? 'bg-primary-600 text-white shadow-glow'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    )}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>

            <Button
              variant="secondary"
              size="iconSm"
              aria-label="Next page"
              disabled={effectivePage === effectivePages}
              onClick={() => goTo(effectivePage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="iconSm"
              aria-label="Last page"
              disabled={effectivePage === effectivePages}
              onClick={() => goTo(effectivePages)}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {footer ? <div className="border-t border-slate-100 p-4 dark:border-slate-800">{footer}</div> : null}
      <span className="sr-only" aria-live="polite">
        {activeSearch ? `${effectiveTotal} results` : ''}
      </span>
    </div>
  );
}

export { AnimatePresence };

export { Table };
