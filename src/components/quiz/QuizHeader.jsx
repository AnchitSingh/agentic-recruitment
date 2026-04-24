import React, { useState, useEffect, useRef, useCallback, memo } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   QuizHeader — Floating-island quiz toolbar
   ─────────────────────────────────────────────────────────────────
   Desktop (lg+) : [Title] [●3/20] Feedback⬤ ⏱MM:SS [⚑Bookmark] [⏸Pause] [⏹Stop]
   Compact (<lg) : [●3/20] ⬤Feedback ⏱MM:SS [⚑] [⏸] [⏹]
   ═══════════════════════════════════════════════════════════════════ */

// ── Constants ──────────────────────────────────────────────────────
const WARNING_THRESHOLD  = 60;   // seconds → amber/orange
const CRITICAL_THRESHOLD = 30;   // seconds → red + pulse
const COLLAPSE_DELAY     = 200;  // ms before pill collapses on mouse-leave
const TOUCH_COLLAPSE     = 1200; // ms before pill collapses on touch
const EASE = 'cubic-bezier(0.4,0,0.2,1)';

// ── One-time keyframe injection ────────────────────────────────────
let injected = false;
function injectKeyframes() {
  if (injected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.textContent = `@keyframes qh-pulse{0%,100%{box-shadow:0 4px 6px -1px rgba(239,68,68,.25)}50%{box-shadow:0 4px 14px -1px rgba(239,68,68,.5)}}`;
  document.head.appendChild(el);
  injected = true;
}

// ── Helpers ────────────────────────────────────────────────────────
const fmt = (sec) => {
  const clamped = Math.max(0, sec);
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
};

const timerState = (t) =>
  t <= CRITICAL_THRESHOLD ? 'critical' : t <= WARNING_THRESHOLD ? 'warning' : 'normal';

/* ═══════════════════════════════════════════════════════════════════
   useExpandable — Shared hover/touch expanding-pill logic
   ═══════════════════════════════════════════════════════════════════ */
function useExpandable(onAction) {
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const isTouch = useRef(false);

  useEffect(() => {
    isTouch.current = window.matchMedia('(pointer:coarse)').matches;
    return () => clearTimeout(timer.current);
  }, []);

  const clear = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const collapse = useCallback((delay = COLLAPSE_DELAY) => {
    clear();
    timer.current = setTimeout(() => setOpen(false), delay);
  }, [clear]);

  const bind = {
    onMouseEnter: useCallback(() => {
      if (!isTouch.current) { clear(); setOpen(true); }
    }, [clear]),

    onMouseLeave: useCallback(() => {
      if (!isTouch.current) collapse();
    }, [collapse]),

    onClick: useCallback(() => {
      if (isTouch.current && !open) {
        setOpen(true);
        collapse(TOUCH_COLLAPSE);
        return;
      }
      onAction?.();
      if (isTouch.current) collapse(TOUCH_COLLAPSE);
    }, [open, onAction, collapse]),

    onKeyDown: useCallback((e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onAction?.();
      }
    }, [onAction]),
  };

  return { open, bind };
}

/* ═══════════════════════════════════════════════════════════════════
   Icon — Data-driven SVG stroke icons
   ═══════════════════════════════════════════════════════════════════ */
const PATHS = {
  bookmark: (
    <path fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      d="M4 17.98V9.71c0-3.63 0-5.45 1.17-6.58C6.34 2 8.23 2 12 2s5.66 0 6.83 1.13C20 4.26 20 6.07 20 9.71v8.27c0 2.31 0 3.46-.77 3.87-1.5.8-4.3-1.87-5.64-2.67-.77-.47-1.16-.7-1.59-.7s-.82.23-1.59.7c-1.33.8-4.14 3.47-5.64 2.67C4 21.44 4 20.29 4 17.98Z" />
  ),
  'bookmark-filled': (
    <path fill="currentColor" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      d="M4 17.98V9.71c0-3.63 0-5.45 1.17-6.58C6.34 2 8.23 2 12 2s5.66 0 6.83 1.13C20 4.26 20 6.07 20 9.71v8.27c0 2.31 0 3.46-.77 3.87-1.5.8-4.3-1.87-5.64-2.67-.77-.47-1.16-.7-1.59-.7s-.82.23-1.59.7c-1.33.8-4.14 3.47-5.64 2.67C4 21.44 4 20.29 4 17.98Z" />
  ),
  pause: (
    <>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M9.5 9v6m5-6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  stop: (
    <>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="9" y="9" width="6" height="6" rx=".5" fill="currentColor" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M12 9.5V13l2.5 2.5M12 4V2m-2 0h4" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
};

const Icon = memo(({ name, light, danger, active, className = '' }) => {
  const color = light   ? 'text-white'
              : danger  ? 'text-red-500'
              : active  ? 'text-amber-600'
              :           'text-slate-700';
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
      width={20} height={20} aria-hidden="true"
      className={`shrink-0 transition-colors duration-200 ${color} ${className}`}>
      {PATHS[name]}
    </svg>
  );
});
Icon.displayName = 'Icon';

/* ═══════════════════════════════════════════════════════════════════
   ProgressCounter — Micro progress-ring + question fraction
   ═══════════════════════════════════════════════════════════════════ */
const ProgressCounter = memo(({ current, total, compact = false }) => {
  const R = 7;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - (total ? current / total : 0));

  return (
    <div className={`flex items-center rounded-full bg-slate-100/80
      ${compact ? 'px-2 py-1 gap-1.5 text-xs' : 'px-3 py-1.5 gap-2 text-sm'}`}>
      <svg width="18" height="18" className="shrink-0 -rotate-90" aria-hidden="true">
        <circle cx="9" cy="9" r={R} fill="none" stroke="#e2e8f0" strokeWidth="2" />
        <circle cx="9" cy="9" r={R} fill="none" stroke="#f59e0b" strokeWidth="2"
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset}
          className="transition-all duration-500 ease-out" />
      </svg>
      <span className="font-semibold text-slate-800 tabular-nums">{current}</span>
      <span className="text-slate-400">/</span>
      <span className="font-semibold text-slate-800 tabular-nums">{total}</span>
    </div>
  );
});
ProgressCounter.displayName = 'ProgressCounter';

/* ═══════════════════════════════════════════════════════════════════
   Toggle — Interactive accessible switch (used standalone)
   ToggleVisual — Inert visual twin (safe to nest inside buttons)
   ═══════════════════════════════════════════════════════════════════ */
const toggleDims = (size, checked) =>
  size === 'sm'
    ? { track: 'w-7 h-4',  dot: 'w-2.5 h-2.5', tx: checked ? 13 : 2 }
    : { track: 'w-9 h-5',  dot: 'w-3.5 h-3.5', tx: checked ? 17 : 3 };

const Toggle = memo(({ checked, onChange, label, size = 'md' }) => {
  const d = toggleDims(size, checked);
  return (
    <button role="switch" aria-checked={checked} aria-label={label}
      onClick={onChange}
      className={`${d.track} rounded-full transition-colors duration-200 shrink-0
        inline-flex items-center
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-amber-400 focus-visible:ring-offset-1`}
      style={{ backgroundColor: checked ? '#10b981' : '#d1d5db' }}>
      <span className={`${d.dot} bg-white rounded-full shadow-sm block
        transition-transform duration-200`}
        style={{ transform: `translateX(${d.tx}px)` }} />
    </button>
  );
});
Toggle.displayName = 'Toggle';

const ToggleVisual = memo(({ checked, size = 'sm' }) => {
  const d = toggleDims(size, checked);
  return (
    <span aria-hidden="true"
      className={`${d.track} rounded-full transition-colors duration-200
        shrink-0 inline-flex items-center`}
      style={{ backgroundColor: checked ? '#10b981' : '#d1d5db' }}>
      <span className={`${d.dot} bg-white rounded-full shadow-sm block
        transition-transform duration-200`}
        style={{ transform: `translateX(${d.tx}px)` }} />
    </span>
  );
});
ToggleVisual.displayName = 'ToggleVisual';

/* ═══════════════════════════════════════════════════════════════════
   TimerBadge — Centre-stage gradient countdown
   Three-tier colour: normal → warning → critical (pulsing)
   ═══════════════════════════════════════════════════════════════════ */
const TIMER_GRADIENT = {
  normal:   'bg-gradient-to-r from-amber-500 to-orange-600 shadow-md shadow-amber-500/25',
  warning:  'bg-gradient-to-r from-orange-500 to-red-500   shadow-md shadow-orange-500/25',
  critical: 'bg-gradient-to-r from-red-500 to-rose-600',
};

const TimerBadge = memo(({ timeLeft, compact = false }) => {
  const state = timerState(timeLeft);

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={`Time remaining: ${fmt(timeLeft)}`}
      className={`flex items-center justify-center rounded-full shrink-0
        text-white cursor-default transition-all duration-500 gap-2
        ${TIMER_GRADIENT[state]}
        ${compact ? 'mx-1.5 sm:mx-2.5 px-3 sm:px-4 h-10' : 'mx-3 px-5 h-10'}`}
      style={state === 'critical'
        ? { animation: 'qh-pulse 1.5s ease-in-out infinite' }
        : undefined}>
      <Icon name="timer" light />
      <span className={`font-mono font-semibold tabular-nums tracking-wide text-sm
        ${state === 'critical' ? 'animate-pulse' : ''}`}>
        {fmt(timeLeft)}
      </span>
    </div>
  );
});
TimerBadge.displayName = 'TimerBadge';

/* ═══════════════════════════════════════════════════════════════════
   ExpandingPill — Compact 40 px circle → reveals label on hover/touch
   ═══════════════════════════════════════════════════════════════════ */
const ExpandingPill = memo(({ icon, label, active = false, danger = false, onClick }) => {
  const { open, bind } = useExpandable(onClick);

  const stateClass = danger
    ? 'text-red-500 hover:bg-red-50/80 active:bg-red-100/80'
    : active
      ? 'bg-white text-amber-700 shadow-sm'
      : 'text-slate-600 hover:bg-slate-50/80 active:bg-slate-100/80';

  return (
    <button
      {...bind}
      aria-label={label}
      className={`relative flex items-center justify-center h-10 rounded-full
        overflow-hidden select-none
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-amber-400 focus-visible:ring-offset-1
        ${stateClass}`}
      style={{
        width:        open ? 'auto' : 40,
        minWidth:     open ? 110 : 40,
        paddingLeft:  open ? 10 : 0,
        paddingRight: open ? 14 : 0,
        transition:   `all .3s ${EASE}`,
      }}>
      <span
        className="flex items-center justify-center shrink-0"
        style={{ width: open ? 28 : 40, transition: `width .3s ${EASE}` }}>
        {icon}
      </span>

      <span
        className="text-sm font-medium whitespace-nowrap pointer-events-none"
        aria-hidden={!open}
        style={{
          opacity:    open ? 1 : 0,
          maxWidth:   open ? 160 : 0,
          marginLeft: open ? 6 : 0,
          transition: `opacity .25s ease-out, max-width .3s ${EASE}, margin-left .3s ${EASE}`,
        }}>
        {label}
      </span>
    </button>
  );
});
ExpandingPill.displayName = 'ExpandingPill';

/* ═══════════════════════════════════════════════════════════════════
   DesktopBtn — Full-label action button (lg+ viewports)
   ═══════════════════════════════════════════════════════════════════ */
const DesktopBtn = memo(({ icon, filled, label, onClick, active = false, danger = false }) => {
  const cls = danger
    ? 'text-red-500 hover:bg-red-50/80 hover:text-red-600 active:bg-red-100/80'
    : active
      ? 'bg-white text-amber-700 shadow-sm'
      : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-800 active:bg-slate-100/80';

  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex items-center gap-2 px-4 py-2 rounded-full
        text-sm font-medium transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-amber-400 focus-visible:ring-offset-1
        ${cls}`}>
      <Icon
        name={filled && active ? filled : icon}
        active={!danger && active}
        danger={danger}
      />
      <span>{label}</span>
    </button>
  );
});
DesktopBtn.displayName = 'DesktopBtn';

/* ═══════════════════════════════════════════════════════════════════
   QuizHeader — Orchestrator
   ═══════════════════════════════════════════════════════════════════ */
const QuizHeader = ({
  title             = 'Quiz',
  currentQuestion   = 1,
  totalQuestions     = 20,
  timeLeft          = 0,
  onPause,
  onStop,
  onBookmark,
  isBookmarked      = false,
  onToggleFeedback,
  immediateFeedback = false,
}) => {
  useEffect(injectKeyframes, []);

  return (
    <header
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-max"
      role="banner">
      <div
        className="bg-white/80 backdrop-blur-xl h-16 rounded-[1.25rem]
          shadow-[0_4px_24px_-4px_rgba(0,0,0,.08),0_0_0_1px_rgba(0,0,0,.03)]
          flex items-center px-2">

        {/* ────────────── Desktop (lg +) ────────────── */}
        <nav
          className="hidden lg:flex items-center w-full"
          aria-label="Quiz controls — desktop">

          {/* Left: title + progress */}
          <div className="flex items-center gap-2.5 pl-3">
            <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
              {title}
            </span>
            <ProgressCounter current={currentQuestion} total={totalQuestions} />
          </div>

          {/* Centre: feedback toggle */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2 px-3 py-2 rounded-full
              text-sm font-medium text-slate-600
              hover:bg-slate-50/80 transition-colors">
              <span>Feedback</span>
              <Toggle
                checked={immediateFeedback}
                onChange={onToggleFeedback}
                label="Toggle immediate feedback"
              />
            </div>
          </div>

          {/* Timer */}
          <TimerBadge timeLeft={timeLeft} />

          {/* Right: actions */}
          <div className="flex items-center gap-1 pr-1">
            <DesktopBtn
              icon="bookmark" filled="bookmark-filled"
              label={isBookmarked ? 'Bookmarked' : 'Bookmark'}
              onClick={onBookmark} active={isBookmarked}
            />
            <DesktopBtn icon="pause" label="Pause" onClick={onPause} />
            <DesktopBtn icon="stop"  label="Stop"  onClick={onStop} danger />
          </div>
        </nav>

        {/* ────────────── Compact (< lg) ────────────── */}
        <nav
          className="lg:hidden flex items-center w-full"
          aria-label="Quiz controls — compact">

          {/* Left: progress */}
          <div className="pl-0.5">
            <ProgressCounter
              current={currentQuestion}
              total={totalQuestions}
              compact
            />
          </div>

          {/* Feedback (visual-only toggle avoids button-in-button) */}
          <ExpandingPill
            icon={<ToggleVisual checked={immediateFeedback} />}
            label="Feedback"
            onClick={onToggleFeedback}
          />

          {/* Timer */}
          <TimerBadge timeLeft={timeLeft} compact />

          {/* Right: expanding pills */}
          <div className="flex items-center gap-0.5 pr-0.5">
            <ExpandingPill
              icon={
                <Icon
                  name={isBookmarked ? 'bookmark-filled' : 'bookmark'}
                  active={isBookmarked}
                />
              }
              label={isBookmarked ? 'Bookmarked' : 'Bookmark'}
              active={isBookmarked}
              onClick={onBookmark}
            />
            <ExpandingPill
              icon={<Icon name="pause" />}
              label="Pause"
              onClick={onPause}
            />
            <ExpandingPill
              icon={<Icon name="stop" danger />}
              label="Stop"
              danger
              onClick={onStop}
            />
          </div>
        </nav>
      </div>
    </header>
  );
};

export default memo(QuizHeader);