import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  forwardRef,
} from 'react';

// ─── Default colour palette (used when items omit `color`) ─────────
const PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

const STAGGER_MS  = 80;   // delay between successive bar animations
const LABEL_DELAY = 500;  // extra delay before data-labels appear

// ─── Inject tooltip keyframes once into <head> ─────────────────────
let _injected = false;
function ensureKeyframes() {
  if (_injected || typeof document === 'undefined') return;
  const s = document.createElement('style');
  s.textContent =
    '@keyframes _bcTip{from{opacity:0;transform:translateX(-50%) translateY(4px)}' +
    'to{opacity:1;transform:translateX(-50%) translateY(0)}}';
  document.head.appendChild(s);
  _injected = true;
}

// ─── Compute a "nice" rounded axis ceiling ─────────────────────────
function niceCeil(v) {
  if (v === 0) return 100;
  if (v <= 10) return Math.ceil(v);
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p || v;
}

// ────────────────────────────────────────────────────────────────────
const BarChart = forwardRef(function BarChart(
  {
    data           = [],    // [{ label, value, color? }]
    height         = 240,
    showDataLabels = true,
    formatValue,            // (value, index) => string
    formatTooltip,          // (value, index) => string
    yAxisMax,
    yAxisFormatter,         // (value) => string
    barRadius      = 6,
    animated       = true,
    gridLineCount  = 4,
    className      = '',
    onClick,                // (item, index) => void
    emptyMessage   = 'No data available',
    ariaLabel      = 'Bar chart',
    maxBarWidth    = 56,
  },
  fwdRef,
) {
  /* ── state ───────────────────────────────────────────────────── */
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [visible, setVisible]       = useState(!animated);

  /* ── refs ─────────────────────────────────────────────────────── */
  const rootRef = useRef(null);
  const barEls  = useRef([]);

  const mergeRef = useCallback(
    (node) => {
      rootRef.current = node;
      if (typeof fwdRef === 'function') fwdRef(node);
      else if (fwdRef) fwdRef.current = node;
    },
    [fwdRef],
  );

  /* ── side-effects ────────────────────────────────────────────── */
  useEffect(ensureKeyframes, []);

  useEffect(() => {
    if (!animated) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [animated]);

  /* ── derived data ────────────────────────────────────────────── */
  const maxVal = useMemo(() => {
    if (yAxisMax != null && yAxisMax > 0) return yAxisMax;
    const m = Math.max(...data.map((d) => Math.abs(d.value || 0)), 0);
    return niceCeil(m);
  }, [data, yAxisMax]);

  const yLabels = useMemo(() => {
    const out = [];
    for (let i = gridLineCount; i >= 0; i--) {
      const v = Math.round((maxVal / gridLineCount) * i);
      out.push(yAxisFormatter ? yAxisFormatter(v) : v);
    }
    return out;
  }, [maxVal, gridLineCount, yAxisFormatter]);

  // pre-compute colour + percentage for every bar
  const bars = useMemo(
    () =>
      data.map((d, i) => ({
        ...d,
        color: d.color || PALETTE[i % PALETTE.length],
        pct:   maxVal > 0 ? (Math.abs(d.value || 0) / maxVal) * 100 : 0,
      })),
    [data, maxVal],
  );

  /* ── formatters ──────────────────────────────────────────────── */
  const fmt = useCallback(
    (v, i) => (formatValue ? formatValue(v, i) : v),
    [formatValue],
  );
  const fmtTip = useCallback(
    (v, i) => (formatTooltip ? formatTooltip(v, i) : fmt(v, i)),
    [formatTooltip, fmt],
  );

  /* ── active index (hover wins over keyboard focus) ───────────── */
  const activeIdx = hoveredIdx ?? (focusedIdx >= 0 ? focusedIdx : null);

  /* ── keyboard navigation (roving tab-index) ──────────────────── */
  const handleBarKey = useCallback(
    (e, idx) => {
      const len = bars.length;
      if (!len) return;
      let next;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          next = (idx + 1) % len;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          next = (idx - 1 + len) % len;
          break;
        case 'Home':
          e.preventDefault();
          next = 0;
          break;
        case 'End':
          e.preventDefault();
          next = len - 1;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onClick?.(bars[idx], idx);
          return;
        default:
          return;
      }

      setFocusedIdx(next);
      barEls.current[next]?.focus({ preventScroll: true });
    },
    [bars, onClick],
  );

  // clear focus state when focus leaves the chart entirely
  const handleRootBlur = useCallback((e) => {
    if (!rootRef.current?.contains(e.relatedTarget)) setFocusedIdx(-1);
  }, []);

  /* ── empty state ─────────────────────────────────────────────── */
  if (!data.length) {
    return (
      <div
        ref={mergeRef}
        className={`select-none flex items-center justify-center text-slate-400 ${className}`}
        style={{ height }}
        role="img"
        aria-label={ariaLabel}
      >
        <div className="flex flex-col items-center gap-2">
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
            className="opacity-30"
          >
            <rect x="6"    y="24" width="9" height="18" rx="2.5" fill="currentColor" />
            <rect x="19.5" y="14" width="9" height="28" rx="2.5" fill="currentColor" />
            <rect x="33"   y="8"  width="9" height="34" rx="2.5" fill="currentColor" />
          </svg>
          <span className="text-sm">{emptyMessage}</span>
        </div>
      </div>
    );
  }

  /* ── chart ───────────────────────────────────────────────────── */
  return (
    <div
      ref={mergeRef}
      className={`select-none ${className}`}
      style={{ height }}
      role="group"
      aria-label={ariaLabel}
      onBlur={handleRootBlur}
    >
      <div className="flex h-full">
        {/* ── Y axis ── */}
        <div
          className="flex flex-col justify-between pr-2 shrink-0"
          style={{ width: 40, paddingBottom: 28 }}
          aria-hidden="true"
        >
          {yLabels.map((l, i) => (
            <span
              key={i}
              className="text-[10px] text-slate-400 text-right leading-none tabular-nums"
            >
              {l}
            </span>
          ))}
        </div>

        {/* ── Chart body ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* plot area */}
          <div className="flex-1 relative min-h-0">
            {/* grid lines */}
            {Array.from({ length: gridLineCount + 1 }, (_, i) => (
              <div
                key={i}
                aria-hidden="true"
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  bottom: `${(i / gridLineCount) * 100}%`,
                  height: 1,
                  background:
                    i === 0
                      ? '#e2e8f0'
                      : 'repeating-linear-gradient(90deg,#e2e8f0 0 4px,transparent 4px 8px)',
                }}
              />
            ))}

            {/* bars */}
            <div
              className="absolute inset-0 flex items-end justify-evenly px-2"
              role="list"
            >
              {bars.map((bar, idx) => {
                const isActive = activeIdx === idx;
                const dimmed   = activeIdx !== null && !isActive;

                return (
                  <div
                    key={idx}
                    ref={(el) => (barEls.current[idx] = el)}
                    role="listitem"
                    tabIndex={
                      focusedIdx < 0
                        ? idx === 0 ? 0 : -1
                        : focusedIdx === idx ? 0 : -1
                    }
                    aria-label={`${bar.label}: ${fmtTip(bar.value, idx)}`}
                    className={[
                      'flex-1 flex flex-col items-center justify-end h-full',
                      'mx-0.5 relative outline-none rounded',
                      'focus-visible:ring-2 focus-visible:ring-blue-400/40',
                      'focus-visible:ring-inset',
                    ].join(' ')}
                    style={{ cursor: onClick ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onFocus={() => setFocusedIdx(idx)}
                    onKeyDown={(e) => handleBarKey(e, idx)}
                    onClick={() => onClick?.(bar, idx)}
                  >
                    {/* data label */}
                    {showDataLabels && (
                      <div
                        aria-hidden="true"
                        className="mb-1 z-10 pointer-events-none"
                        style={{
                          opacity:   visible && bar.pct > 0 ? 1 : 0,
                          transform: visible && bar.pct > 0 ? 'none' : 'translateY(6px)',
                          transition: `all .4s ease ${idx * STAGGER_MS + LABEL_DELAY}ms`,
                        }}
                      >
                        <span
                          className="inline-block px-1.5 py-0.5 rounded text-[10px]
                                     font-bold text-white shadow-sm whitespace-nowrap"
                          style={{ backgroundColor: bar.color }}
                        >
                          {fmt(bar.value, idx)}
                        </span>
                      </div>
                    )}

                    {/* bar */}
                    <div
                      className="w-full relative"
                      style={{
                        maxWidth: maxBarWidth,
                        height: visible
                          ? `${Math.max(bar.pct, bar.pct > 0 ? 2 : 0)}%`
                          : '0%',
                        transition: `height .7s cubic-bezier(.34,1.56,.64,1) ${
                          idx * STAGGER_MS
                        }ms`,
                      }}
                    >
                      {/* fill */}
                      <div
                        className="absolute inset-0 transition-all duration-200"
                        style={{
                          backgroundColor: bar.color,
                          borderRadius: `${barRadius}px ${barRadius}px 2px 2px`,
                          opacity: dimmed ? 0.35 : isActive ? 1 : 0.82,
                          transform: isActive ? 'scaleX(1.08)' : 'scaleX(1)',
                          transformOrigin: 'bottom center',
                          boxShadow: isActive
                            ? `0 -4px 16px -2px ${bar.color}50`
                            : 'none',
                        }}
                      />
                      {/* subtle top-down shine */}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          borderRadius: `${barRadius}px ${barRadius}px 2px 2px`,
                          background:
                            'linear-gradient(180deg,rgba(255,255,255,.18) 0%,transparent 50%)',
                        }}
                      />
                    </div>

                    {/* tooltip */}
                    {isActive && (
                      <div
                        className="absolute left-1/2 z-50 pointer-events-none"
                        style={{
                          bottom: `calc(${Math.min(bar.pct, 85)}% + ${
                            showDataLabels ? 36 : 14
                          }px)`,
                          transform: 'translateX(-50%)',
                          animation: '_bcTip .15s ease-out both',
                        }}
                      >
                        <div className="bg-slate-800/95 backdrop-blur text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: bar.color }}
                              aria-hidden="true"
                            />
                            <span className="font-semibold">{bar.label}</span>
                          </span>
                          <span className="block text-slate-300 mt-0.5 pl-3.5 tabular-nums">
                            {fmtTip(bar.value, idx)}
                          </span>
                        </div>
                        <div className="flex justify-center" aria-hidden="true">
                          <div
                            className="w-0 h-0"
                            style={{
                              borderLeft:  '5px solid transparent',
                              borderRight: '5px solid transparent',
                              borderTop:   '5px solid rgba(30,41,59,.95)',
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* x-axis labels */}
          <div
            className="flex justify-evenly px-2 pt-1.5"
            style={{ height: 28 }}
            aria-hidden="true"
          >
            {bars.map((bar, idx) => (
              <span
                key={idx}
                className={`flex-1 mx-0.5 text-center text-[11px] truncate
                  transition-colors duration-200 ${
                    activeIdx === idx
                      ? 'text-slate-800 font-semibold'
                      : activeIdx !== null
                        ? 'text-slate-300'
                        : 'text-slate-500'
                  }`}
              >
                {bar.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default BarChart;