import React, { useState, useEffect, useMemo, useCallback } from 'react';

const DonutChart = ({
  data = [],            // [{ label, value, color }]
  height = 240,
  donutSize = 65,       // inner-radius as % of outer
  centerLabel = null,   // { label: 'Total', value: 123 }
  showLegend = true,
  legendPosition = 'bottom', // 'bottom' | 'right'
  animated = true,
  className = '',
  onClick,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isVisible, setIsVisible] = useState(!animated);

  useEffect(() => {
    if (!animated) return;
    const id = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(id);
  }, [animated]);

  const total = useMemo(
    () => data.reduce((s, d) => s + (d.value || 0), 0),
    [data],
  );

  const activeData = useMemo(
    () => data.filter(d => (d.value || 0) > 0),
    [data],
  );

  // ── segment geometry ──
  const segments = useMemo(() => {
    if (!activeData.length || total === 0) return [];

    const outerR = 80;
    const innerR = (outerR * donutSize) / 100;
    const strokeW = outerR - innerR;
    const r = innerR + strokeW / 2;
    const C = 2 * Math.PI * r;
    const gap = activeData.length > 1 ? 4 : 0;

    let cumulative = 0;

    return activeData.map(item => {
      const fraction = item.value / total;
      const segLen = Math.max(fraction * C - gap, 0);
      const offset = cumulative * C + gap / 2;

      // label position (middle of arc)
      const mid = (cumulative + fraction / 2) * 2 * Math.PI - Math.PI / 2;
      const lx = 100 + Math.cos(mid) * r;
      const ly = 100 + Math.sin(mid) * r;

      cumulative += fraction;

      return {
        ...item,
        fraction,
        percentage: fraction * 100,
        segLen,
        offset,
        C,
        strokeW,
        r,
        lx,
        ly,
      };
    });
  }, [activeData, total, donutSize]);

  const findSegIndex = useCallback(
    label => segments.findIndex(s => s.label === label),
    [segments],
  );

  // ── empty state ──
  if (total === 0) {
    return (
      <div
        className={`flex items-center justify-center text-slate-400 text-sm ${className}`}
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const hoveredSeg =
    hoveredIndex !== null && hoveredIndex < segments.length
      ? segments[hoveredIndex]
      : null;

  const horizontal = legendPosition === 'right';
  const legendH = showLegend && !horizontal ? 40 : 0;
  const chartDim = horizontal ? height : height - legendH;

  return (
    <div
      className={`flex ${horizontal ? 'flex-row' : 'flex-col'} items-center justify-center select-none ${className}`}
      style={{ minHeight: height }}
    >
      {/* ── SVG ── */}
      <div className="relative shrink-0" style={{ width: chartDim, height: chartDim }}>
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          {/* background ring */}
          {segments[0] && (
            <circle
              cx="100"
              cy="100"
              r={segments[0].r}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={segments[0].strokeW}
            />
          )}

          {/* arcs */}
          {segments.map((seg, i) => {
            const isHov = hoveredIndex === i;
            const dimmed = hoveredIndex !== null && !isHov;

            return (
              <circle
                key={i}
                cx="100"
                cy="100"
                r={seg.r}
                fill="none"
                stroke={seg.color}
                strokeLinecap="butt"
                className="cursor-pointer"
                style={{
                  strokeWidth: isHov ? seg.strokeW + 6 : seg.strokeW,
                  strokeDasharray: isVisible
                    ? `${seg.segLen} ${seg.C}`
                    : `0 ${seg.C}`,
                  strokeDashoffset: -seg.offset,
                  transform: 'rotate(-90deg)',
                  transformOrigin: '100px 100px',
                  opacity: dimmed ? 0.35 : isHov ? 1 : 0.85,
                  filter: isHov
                    ? `drop-shadow(0 2px 8px ${seg.color}50)`
                    : 'none',
                  transition: [
                    `stroke-dasharray .8s cubic-bezier(.4,0,.2,1) ${i * 120}ms`,
                    'stroke-width .25s ease',
                    'opacity .25s ease',
                    'filter .25s ease',
                  ].join(','),
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onClick?.(seg, i)}
              />
            );
          })}

          {/* percentage labels on large segments */}
          {segments.map((seg, i) =>
            seg.percentage >= 10 ? (
              <text
                key={`pct-${i}`}
                x={seg.lx}
                y={seg.ly}
                textAnchor="middle"
                dominantBaseline="central"
                className="pointer-events-none"
                style={{
                  fill: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  textShadow: '0 1px 2px rgba(0,0,0,.3)',
                  opacity: isVisible && hoveredIndex === null ? 1 : 0,
                  transition: `opacity .3s ease ${i * 120 + 600}ms`,
                }}
              >
                {Math.round(seg.percentage)}%
              </text>
            ) : null,
          )}

          {/* ── center content ── */}
          {hoveredSeg ? (
            <g
              key={`hov-${hoveredIndex}`}
              style={{ animation: 'donutCenterIn .2s ease-out' }}
            >
              <text
                x="100"
                y="86"
                textAnchor="middle"
                style={{ fill: '#64748b', fontSize: 11 }}
              >
                {hoveredSeg.label}
              </text>
              <text
                x="100"
                y="108"
                textAnchor="middle"
                style={{ fill: '#0f172a', fontSize: 24, fontWeight: 700 }}
              >
                {hoveredSeg.value}
              </text>
              <text
                x="100"
                y="124"
                textAnchor="middle"
                style={{
                  fill: hoveredSeg.color,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {Math.round(hoveredSeg.percentage)}%
              </text>
            </g>
          ) : centerLabel ? (
            <g
              style={{
                opacity: isVisible ? 1 : 0,
                transition: 'opacity .4s ease .5s',
              }}
            >
              <text
                x="100"
                y="93"
                textAnchor="middle"
                style={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
              >
                {centerLabel.label || 'Total'}
              </text>
              <text
                x="100"
                y="115"
                textAnchor="middle"
                style={{ fill: '#1e293b', fontSize: 22, fontWeight: 700 }}
              >
                {centerLabel.value !== undefined ? centerLabel.value : total}
              </text>
            </g>
          ) : null}
        </svg>
      </div>

      {/* ── Legend ── */}
      {showLegend && (
        <div
          className={`flex flex-wrap justify-center ${
            horizontal ? 'flex-col ml-5 gap-2' : 'mt-2 gap-x-4 gap-y-1.5'
          }`}
        >
          {data.map((item, di) => {
            const si = findSegIndex(item.label);
            const active = si !== -1;
            const isHov = hoveredIndex === si;
            const dimmed = hoveredIndex !== null && !isHov;

            return (
              <div
                key={di}
                className="flex items-center gap-1.5 cursor-pointer"
                style={{
                  opacity: !active ? 0.3 : dimmed ? 0.35 : 1,
                  transition: 'opacity .2s',
                }}
                onMouseEnter={() => active && setHoveredIndex(si)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{
                    backgroundColor: item.color,
                    transform: isHov ? 'scale(1.3)' : 'scale(1)',
                    transition: 'transform .2s',
                  }}
                />
                <span className="text-[11px] text-slate-600">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes donutCenterIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
};

export default DonutChart;