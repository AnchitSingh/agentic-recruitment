import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  Fragment,
} from 'react';
import { cn } from '../../utils/designTokens';

// ────────────────────────────────────────────────────────────
//  Internal sub-components
// ────────────────────────────────────────────────────────────

const Checkbox = ({
  checked,
  indeterminate,
  onChange,
  disabled,
  'aria-label': ariaLabel,
}) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate ?? false;
  }, [indeterminate]);

  return (
    <label className="inline-flex items-center cursor-pointer select-none">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
        aria-label={ariaLabel}
        className="sr-only peer"
      />
      <div
        className={cn(
          'w-[18px] h-[18px] rounded border-2 flex items-center justify-center',
          'transition-all duration-150',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500/25 peer-focus-visible:ring-offset-1',
          checked || indeterminate
            ? 'bg-amber-600 border-amber-600'
            : 'bg-white border-slate-300 hover:border-slate-400',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {checked && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
        {indeterminate && !checked && (
          <div className="w-2.5 h-0.5 bg-white rounded-full" />
        )}
      </div>
    </label>
  );
};

const SortIcon = ({ direction, active }) => {
  if (!active) {
    return (
      <svg
        className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-60 transition-opacity duration-150"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
        />
      </svg>
    );
  }

  return (
    <svg
      className="w-3.5 h-3.5 text-amber-600"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
    >
      {direction === 'asc' ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 15l7-7 7 7"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 9l-7 7-7-7"
        />
      )}
    </svg>
  );
};

const ExpandChevron = ({ expanded }) => (
  <svg
    className={cn(
      'w-4 h-4 text-slate-400 transition-transform duration-200',
      expanded && 'rotate-90 text-slate-600',
    )}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

// ────────────────────────────────────────────────────────────
//  Size presets
// ────────────────────────────────────────────────────────────

const SIZE_MAP = {
  sm: {
    headerCell: 'px-4 py-2',
    bodyCell: 'px-4 py-2.5',
    fontSize: 'text-xs',
    checkboxCell: 'w-10 px-3',
    expandCell: 'w-8 px-2',
  },
  md: {
    headerCell: 'px-6 py-3',
    bodyCell: 'px-6 py-3.5',
    fontSize: 'text-sm',
    checkboxCell: 'w-12 px-4',
    expandCell: 'w-10 px-3',
  },
  lg: {
    headerCell: 'px-6 py-4',
    bodyCell: 'px-6 py-5',
    fontSize: 'text-sm',
    checkboxCell: 'w-14 px-5',
    expandCell: 'w-12 px-4',
  },
};

// ────────────────────────────────────────────────────────────
//  Pagination
// ────────────────────────────────────────────────────────────

export const TablePagination = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const items = [1];
    if (page > 3) items.push('…');
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      items.push(i);
    }
    if (page < totalPages - 2) items.push('…');
    if (totalPages > 1) items.push(totalPages);
    return items;
  }, [page, totalPages]);

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-slate-200 bg-slate-50/50">
      {/* Left: rows-per-page + summary */}
      <div className="flex items-center gap-3 text-sm text-slate-500">
        {onPageSizeChange && (
          <>
            <span className="hidden sm:inline">Show</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className={cn(
                'border border-slate-300 rounded-md px-2 py-1 text-sm bg-white text-slate-700',
                'focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500',
                'transition-shadow duration-150',
              )}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </>
        )}
        <span className="tabular-nums whitespace-nowrap">
          {from}–{to} of {total.toLocaleString()}
        </span>
      </div>

      {/* Right: page buttons */}
      <nav className="flex items-center gap-1" aria-label="Table pagination">
        {/* Previous */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={cn(
            'p-1.5 rounded-md transition-colors duration-150',
            page <= 1
              ? 'text-slate-300 cursor-not-allowed'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
          )}
          aria-label="Previous page"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Page numbers */}
        {pageNumbers.map((p, i) =>
          typeof p === 'string' ? (
            <span
              key={`ellipsis-${i}`}
              className="px-1 text-slate-400 select-none"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-all duration-150',
                p === page
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100',
              )}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ),
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={cn(
            'p-1.5 rounded-md transition-colors duration-150',
            page >= totalPages
              ? 'text-slate-300 cursor-not-allowed'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
          )}
          aria-label="Next page"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </nav>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
//  Selection bar (shown when rows are selected)
// ────────────────────────────────────────────────────────────

const SelectionBar = ({ count, onClear, children }) => (
  <div className="flex items-center gap-4 px-6 py-2.5 bg-amber-50 border-b border-amber-100">
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber-600 text-white text-xs font-semibold tabular-nums">
        {count}
      </span>
      <span className="text-sm font-medium text-amber-900">selected</span>
    </div>

    {children && (
      <div className="flex items-center gap-2 ml-2">{children}</div>
    )}

    <button
      onClick={onClear}
      className="ml-auto text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors duration-150"
    >
      Clear
    </button>
  </div>
);

// ────────────────────────────────────────────────────────────
//  Default empty state
// ────────────────────────────────────────────────────────────

const DefaultEmptyState = ({ icon, title, description }) => (
  <div className="flex flex-col items-center gap-3 py-8">
    {icon || (
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
        <svg
          className="w-7 h-7 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
    )}
    <div className="text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {description && (
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      )}
    </div>
  </div>
);

// ────────────────────────────────────────────────────────────
//  DataTable
// ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Column
 * @property {string}                key             – Unique column identifier.
 * @property {React.ReactNode}       header          – Header label.
 * @property {(item, index) => Node} render          – Cell renderer.
 * @property {boolean}               [sortable]      – Enable sorting on this column.
 * @property {string}                [sortKey]        – Sort key override (defaults to `key`).
 * @property {(item) => any}         [getValue]      – Value accessor for client-side sorting.
 * @property {'left'|'center'|'right'} [align]       – Text alignment.
 * @property {string}                [width]          – Tailwind width class.
 * @property {string}                [headerClassName]
 * @property {string}                [cellClassName]
 */

/**
 * @typedef {Object} Pagination
 * @property {number}   page
 * @property {number}   pageSize
 * @property {number}   total
 * @property {Function} onPageChange
 * @property {Function} [onPageSizeChange]
 * @property {number[]} [pageSizeOptions]
 */

/**
 * @typedef {Object} Expandable
 * @property {(item, index) => React.ReactNode} render
 * @property {Set}      [expandedKeys]    – Controlled expanded state.
 * @property {Function} [onExpandChange]  – Called with the next expanded-key Set.
 * @property {boolean}  [accordion]       – Only one row expanded at a time.
 */

export const DataTable = ({
  // ── Data ──
  data = [],
  columns = [],
  keyExtractor,

  // ── Loading ──
  loading = false,
  skeletonCount = 5,

  // ── Sorting (controlled) ──
  sortKey = null,
  sortDirection = null,
  onSortChange,

  // ── Selection ──
  selectable = false,
  selectedKeys: controlledSelectedKeys,
  onSelectionChange,

  // ── Expandable rows ──
  expandable = null,

  // ── Row interaction ──
  onRowClick,
  rowClassName,

  // ── Pagination ──
  pagination = null,

  // ── Appearance ──
  size = 'md',
  striped = false,
  bordered = false,
  hoverable = true,
  stickyHeader = false,
  maxHeight,

  // ── Empty state ──
  emptyState,
  emptyTitle = 'No data available',
  emptyDescription,
  emptyIcon,

  // ── Slots ──
  toolbar,
  bulkActions,
  footer,

  // ── Accessibility ──
  caption,
  'aria-label': ariaLabel,

  // ── Container ──
  className,
}) => {
  // ── Selection state ────────────────────────────────────
  const [internalSelected, setInternalSelected] = useState(new Set());
  const selected = controlledSelectedKeys ?? internalSelected;

  const setSelected = useCallback(
    (next) => {
      const value =
        typeof next === 'function'
          ? next(controlledSelectedKeys ?? internalSelected)
          : next;
      onSelectionChange?.(value);
      if (controlledSelectedKeys === undefined) setInternalSelected(value);
    },
    [onSelectionChange, controlledSelectedKeys, internalSelected],
  );

  // ── Expansion state ───────────────────────────────────
  const [internalExpanded, setInternalExpanded] = useState(new Set());
  const expanded = expandable?.expandedKeys ?? internalExpanded;

  const setExpanded = useCallback(
    (keys) => {
      expandable?.onExpandChange
        ? expandable.onExpandChange(keys)
        : setInternalExpanded(keys);
    },
    [expandable],
  );

  // ── Sort state (uncontrolled fallback) ─────────────────
  const [internalSortKey, setInternalSortKey] = useState(null);
  const [internalSortDir, setInternalSortDir] = useState(null);

  const isControlledSort = onSortChange !== undefined;
  const activeSortKey = isControlledSort ? sortKey : internalSortKey;
  const activeSortDir = isControlledSort ? sortDirection : internalSortDir;

  // ── Client-side sorted data ────────────────────────────
  const displayData = useMemo(() => {
    if (isControlledSort || !activeSortKey || !activeSortDir) return data;

    const col = columns.find(
      (c) => (c.sortKey || c.key) === activeSortKey,
    );
    if (!col?.getValue) return data;

    return [...data].sort((a, b) => {
      const va = col.getValue(a);
      const vb = col.getValue(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp =
        typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return activeSortDir === 'desc' ? -cmp : cmp;
    });
  }, [data, activeSortKey, activeSortDir, columns, isControlledSort]);

  // ── Sizes ──────────────────────────────────────────────
  const s = SIZE_MAP[size] || SIZE_MAP.md;

  // ── Selection helpers ──────────────────────────────────
  const allSelected =
    displayData.length > 0 &&
    displayData.every((d) => selected.has(keyExtractor(d)));

  const someSelected = displayData.some((d) =>
    selected.has(keyExtractor(d)),
  );

  const selectedCount = useMemo(
    () => displayData.filter((d) => selected.has(keyExtractor(d))).length,
    [displayData, selected, keyExtractor],
  );

  const handleSelectAll = useCallback(
    (checked) => {
      const next = new Set(selected);
      displayData.forEach((d) => {
        const k = keyExtractor(d);
        checked ? next.add(k) : next.delete(k);
      });
      setSelected(next);
    },
    [displayData, keyExtractor, selected, setSelected],
  );

  const handleSelectRow = useCallback(
    (item, checked) => {
      const k = keyExtractor(item);
      const next = new Set(selected);
      checked ? next.add(k) : next.delete(k);
      setSelected(next);
    },
    [keyExtractor, selected, setSelected],
  );

  const handleClearSelection = useCallback(
    () => setSelected(new Set()),
    [setSelected],
  );

  // ── Sort handler ───────────────────────────────────────
  const handleSort = useCallback(
    (colKey) => {
      const next = (() => {
        if (activeSortKey !== colKey)
          return { key: colKey, direction: 'asc' };
        if (activeSortDir === 'asc')
          return { key: colKey, direction: 'desc' };
        return { key: null, direction: null };
      })();

      if (isControlledSort) {
        onSortChange(next);
      } else {
        setInternalSortKey(next.key);
        setInternalSortDir(next.direction);
      }
    },
    [activeSortKey, activeSortDir, isControlledSort, onSortChange],
  );

  // ── Expand handler ────────────────────────────────────
  const handleToggleExpand = useCallback(
    (key) => {
      const next = new Set(expanded);
      if (next.has(key)) {
        next.delete(key);
      } else {
        if (expandable?.accordion) next.clear();
        next.add(key);
      }
      setExpanded(next);
    },
    [expanded, expandable, setExpanded],
  );

  // ── Total column count (for colSpan) ───────────────────
  const colCount =
    columns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0);

  // ── Render ─────────────────────────────────────────────
  return (
    <div
      className={cn(
        'overflow-hidden bg-white',
        bordered
          ? 'border border-slate-200 rounded-xl shadow-sm'
          : 'rounded-xl',
        className,
      )}
    >
      {/* ── Toolbar slot ── */}
      {toolbar && (
        <div className="px-6 py-4 border-b border-slate-200">
          {toolbar}
        </div>
      )}

      {/* ── Selection bar ── */}
      {selectable && selectedCount > 0 && bulkActions && (
        <SelectionBar
          count={selectedCount}
          onClear={handleClearSelection}
        >
          {typeof bulkActions === 'function'
            ? bulkActions(selected)
            : bulkActions}
        </SelectionBar>
      )}

      {/* ── Scrollable wrapper ── */}
      <div
        className={cn(
          'overflow-x-auto',
          stickyHeader && maxHeight && 'overflow-y-auto',
        )}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table
          className="w-full border-collapse"
          role="grid"
          aria-label={ariaLabel}
          aria-rowcount={displayData.length}
        >
          {caption && <caption className="sr-only">{caption}</caption>}

          {/* ═══════════ THEAD ═══════════ */}
          <thead
            className={cn(
              'border-b border-slate-200',
              stickyHeader &&
                'sticky top-0 z-10 shadow-[0_1px_0_0_theme(colors.slate.200)]',
            )}
          >
            <tr className="bg-slate-50/80">
              {/* Expand spacer */}
              {expandable && (
                <th className={cn(s.expandCell, s.headerCell)} aria-hidden />
              )}

              {/* Select-all checkbox */}
              {selectable && (
                <th className={cn(s.checkboxCell, s.headerCell, 'text-left')}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={handleSelectAll}
                    aria-label={
                      allSelected ? 'Deselect all rows' : 'Select all rows'
                    }
                  />
                </th>
              )}

              {/* Column headers */}
              {columns.map((col) => {
                const colSortKey = col.sortKey || col.key;
                const isSortable = !!col.sortable;
                const isActiveSort = activeSortKey === colSortKey;

                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      s.headerCell,
                      'text-left text-xs font-semibold uppercase tracking-wider text-slate-500',
                      isSortable &&
                        'cursor-pointer select-none group hover:text-slate-700',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right',
                      col.width,
                      col.headerClassName,
                    )}
                    onClick={
                      isSortable
                        ? () => handleSort(colSortKey)
                        : undefined
                    }
                    aria-sort={
                      isActiveSort
                        ? activeSortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5',
                        col.align === 'center' && 'justify-center w-full',
                        col.align === 'right' && 'justify-end w-full',
                      )}
                    >
                      <span>{col.header}</span>
                      {isSortable && (
                        <SortIcon
                          direction={activeSortDir}
                          active={isActiveSort}
                        />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ═══════════ TBODY ═══════════ */}
          <tbody className="divide-y divide-slate-100">
            {/* ── Skeleton rows ── */}
            {loading &&
              Array.from({ length: skeletonCount }, (_, ri) => (
                <tr key={`skel-${ri}`} className="animate-pulse">
                  {expandable && (
                    <td className={cn(s.expandCell, s.bodyCell)}>
                      <div className="w-4 h-4 rounded bg-slate-100" />
                    </td>
                  )}
                  {selectable && (
                    <td className={cn(s.checkboxCell, s.bodyCell)}>
                      <div className="w-[18px] h-[18px] rounded bg-slate-100" />
                    </td>
                  )}
                  {columns.map((col, ci) => (
                    <td key={col.key} className={s.bodyCell}>
                      <div
                        className="h-4 rounded bg-slate-100"
                        style={{
                          width: `${45 + (((ri + ci) * 17) % 40)}%`,
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}

            {/* ── Data rows ── */}
            {!loading &&
              displayData.map((item, idx) => {
                const key = keyExtractor(item);
                const isSelected = selected.has(key);
                const isExpanded = expanded.has(key);
                const customRowCn =
                  typeof rowClassName === 'function'
                    ? rowClassName(item, idx)
                    : rowClassName;

                return (
                  <Fragment key={key}>
                    <tr
                      className={cn(
                        'transition-colors duration-100',
                        hoverable && 'hover:bg-slate-50/80',
                        striped && idx % 2 !== 0 && 'bg-slate-50/40',
                        isSelected && 'bg-amber-50/60 hover:bg-amber-50/80',
                        isExpanded &&
                          !isSelected &&
                          'bg-slate-50/60',
                        onRowClick && 'cursor-pointer',
                        customRowCn,
                      )}
                      onClick={() => onRowClick?.(item, idx)}
                      aria-selected={
                        selectable ? isSelected : undefined
                      }
                      aria-rowindex={idx + 2}
                    >
                      {/* Expand toggle */}
                      {expandable && (
                        <td className={cn(s.expandCell, s.bodyCell)}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleExpand(key);
                            }}
                            className="p-0.5 rounded hover:bg-slate-200/60 transition-colors duration-150"
                            aria-expanded={isExpanded}
                            aria-label={
                              isExpanded
                                ? 'Collapse row'
                                : 'Expand row'
                            }
                          >
                            <ExpandChevron expanded={isExpanded} />
                          </button>
                        </td>
                      )}

                      {/* Row checkbox */}
                      {selectable && (
                        <td
                          className={cn(s.checkboxCell, s.bodyCell)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={(checked) =>
                              handleSelectRow(item, checked)
                            }
                            aria-label={`Select row ${key}`}
                          />
                        </td>
                      )}

                      {/* Data cells */}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn(
                            s.bodyCell,
                            s.fontSize,
                            'text-slate-700',
                            col.align === 'center' && 'text-center',
                            col.align === 'right' && 'text-right',
                            col.cellClassName,
                          )}
                        >
                          {col.render(item, idx)}
                        </td>
                      ))}
                    </tr>

                    {/* Expanded content */}
                    {expandable && isExpanded && (
                      <tr className="bg-slate-50/50">
                        <td
                          colSpan={colCount}
                          className="px-6 py-4 border-b border-slate-100"
                        >
                          <div className="pl-8">
                            {expandable.render(item, idx)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

            {/* ── Empty state ── */}
            {!loading && displayData.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-6 py-12">
                  {emptyState || (
                    <DefaultEmptyState
                      icon={emptyIcon}
                      title={emptyTitle}
                      description={emptyDescription}
                    />
                  )}
                </td>
              </tr>
            )}
          </tbody>

          {/* ═══════════ TFOOT ═══════════ */}
          {footer && !loading && displayData.length > 0 && (
            <tfoot className="border-t border-slate-200 bg-slate-50/50">
              {footer}
            </tfoot>
          )}
        </table>
      </div>

      {/* ── Pagination ── */}
      {pagination && !loading && <TablePagination {...pagination} />}
    </div>
  );
};

export default DataTable;