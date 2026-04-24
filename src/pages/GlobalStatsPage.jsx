import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import GlobalHeader from '../components/ui/GlobalHeader';
import BackgroundEffects from '../components/ui/BackgroundEffects';
import examBuddyAPI from '../services/api';
import { BarChart, DonutChart } from '../components/charts';
import { backgrounds, cn } from '../utils/designTokens';

/* ═══════════════════════════════════════════════════════════════════
   GlobalStatsPage — Learning Analytics dashboard
   ─────────────────────────────────────────────────────────────────
   Top      : KPI cards (quizzes · questions · accuracy · streak)
   Middle   : Charts (bar + donut)
   Bottom   : Tabbed topic performance (weak · moderate · strong)
   ═══════════════════════════════════════════════════════════════════ */

// ── One-time style injection ───────────────────────────────────────
let injected = false;
function injectStyles() {
  if (injected || typeof document === 'undefined') return;
  const s = document.createElement('style');
  s.textContent = [
    '@keyframes gs-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}',
    '@keyframes gs-pop{0%{transform:scale(.92);opacity:0}100%{transform:scale(1);opacity:1}}',
    '.gs-scroll::-webkit-scrollbar{height:4px;width:5px}',
    '.gs-scroll::-webkit-scrollbar-track{background:#f1f5f9;border-radius:8px}',
    '.gs-scroll::-webkit-scrollbar-thumb{background:#fbbf24;border-radius:8px}',
    '.gs-scroll::-webkit-scrollbar-thumb:hover{background:#f59e0b}',
  ].join('');
  document.head.appendChild(s);
  injected = true;
}

// ── Constants ──────────────────────────────────────────────────────
const TIME_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: '30d', label: '30 Days' },
  { value: '7d',  label: '7 Days' },
];

const TOPIC_TABS = [
  {
    id: 'weak',
    label: 'To Improve',
    icon: '⚠️',
    empty: '🎉 No weak topics — great work!',
    bg: 'bg-red-50',
    border: 'border-red-200',
    name: 'text-red-800',
    value: 'text-red-600',
    tab: 'border-red-500 text-red-700',
    hoverBg: 'hover:bg-red-100/60',
  },
  {
    id: 'moderate',
    label: 'Moderate',
    icon: '📊',
    empty: 'No moderate topics yet',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    name: 'text-amber-800',
    value: 'text-amber-600',
    tab: 'border-amber-500 text-amber-700',
    hoverBg: 'hover:bg-amber-100/60',
  },
  {
    id: 'strong',
    label: 'Strong',
    icon: '✓',
    empty: 'Complete more quizzes to reveal strong topics',
    bg: 'bg-green-50',
    border: 'border-green-200',
    name: 'text-green-800',
    value: 'text-green-600',
    tab: 'border-green-500 text-green-700',
    hoverBg: 'hover:bg-green-100/60',
  },
];

const STAT_DEFS = [
  {
    key: 'totalQuizzes',
    label: 'Quizzes',
    gradient: 'from-amber-100 to-orange-100',
    iconColor: 'text-amber-600',
    path: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    key: 'totalQuestions',
    label: 'Questions',
    gradient: 'from-blue-100 to-indigo-100',
    iconColor: 'text-blue-600',
    path: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key: 'overallAccuracy',
    label: 'Accuracy',
    gradient: 'from-green-100 to-emerald-100',
    iconColor: 'text-green-600',
    suffix: '%',
    round: true,
    path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key: 'activeStreak',
    label: 'Streak',
    gradient: 'from-purple-100 to-pink-100',
    iconColor: 'text-purple-600',
    unit: 'days',
    path: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z',
  },
];

const TREND_MAP = {
  improving: { icon: '↗', cls: 'text-green-600' },
  declining: { icon: '↘', cls: 'text-red-600' },
  stable:    { icon: '→', cls: 'text-slate-500' },
};

// ── Sub-components ─────────────────────────────────────────────────

/* ═══════════════════════════════════════════════════════════════════
   FullPageStatus — Shared loading / error / empty guard
   ═══════════════════════════════════════════════════════════════════ */
const FullPageStatus = memo(({ icon, title, message, action }) => (
  <div className={cn(backgrounds.pageMinHeight, 'min-h-screen')}>
    <BackgroundEffects />
    <GlobalHeader currentPage="stats" />
    <div className="flex items-center justify-center min-h-screen">
      <div
        className="text-center max-w-md mx-4"
        style={{ animation: 'gs-pop .4s ease-out both' }}
      >
        <div className="mx-auto mb-4">{icon}</div>
        {title && (
          <h2 className="text-lg font-semibold text-slate-800 mb-2">{title}</h2>
        )}
        <p className="text-slate-600 text-sm mb-5">{message}</p>
        {action}
      </div>
    </div>
  </div>
));
FullPageStatus.displayName = 'FullPageStatus';

/* ═══════════════════════════════════════════════════════════════════
   StatCard — KPI tile with icon badge & staggered entrance
   ═══════════════════════════════════════════════════════════════════ */
const StatCard = memo(({ def, value, delay = 0 }) => {
  const display = def.round ? Math.round(value) : value;

  return (
    <div
      className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm"
      style={{ animation: `gs-up .5s ease-out ${delay}s both` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-xs mb-1">{def.label}</p>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">
            {display}
            {def.suffix ?? ''}
            {def.unit && (
              <span className="text-sm font-normal text-slate-500 ml-1">
                {def.unit}
              </span>
            )}
          </p>
        </div>
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
            `bg-gradient-to-br ${def.gradient}`,
          )}
          aria-hidden="true"
        >
          <svg
            className={cn('w-4 h-4', def.iconColor)}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d={def.path}
            />
          </svg>
        </div>
      </div>
      {/* Accuracy mini bar inside the card */}
      {def.key === 'overallAccuracy' && (
        <div className="mt-3">
          <AccuracyMiniBar value={value} />
        </div>
      )}
    </div>
  );
});
StatCard.displayName = 'StatCard';

/* ═══════════════════════════════════════════════════════════════════
   TimeRangeSelector — Segmented control
   ═══════════════════════════════════════════════════════════════════ */
const TimeRangeSelector = memo(({ value, onChange }) => (
  <div
    className="inline-flex bg-white/80 backdrop-blur-sm rounded-xl p-1
      border border-slate-200/60 self-start sm:self-auto"
    role="radiogroup"
    aria-label="Time range filter"
  >
    {TIME_RANGES.map((opt) => (
      <button
        key={opt.value}
        role="radio"
        aria-checked={value === opt.value}
        onClick={() => onChange(opt.value)}
        className={cn(
          'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-amber-400 focus-visible:ring-offset-1',
          value === opt.value
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50',
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
));
TimeRangeSelector.displayName = 'TimeRangeSelector';

/* ═══════════════════════════════════════════════════════════════════
   TopicCard — Single topic tile with trend badge
   ═══════════════════════════════════════════════════════════════════ */
const TopicCard = memo(({ topic, theme, delay = 0 }) => {
  const trend = TREND_MAP[topic.trend] ?? null;

  return (
    <div
      className={cn(
        'p-3 rounded-xl border transition-shadow duration-200',
        theme.bg,
        theme.border,
        theme.hoverBg,
      )}
      style={{ animation: `gs-up .4s ease-out ${delay}s both` }}
    >
      <div className="flex justify-between items-start gap-2 mb-1.5">
        <span className={cn('font-medium text-sm leading-snug flex-1', theme.name)}>
          {topic.name}
        </span>
        <span className={cn('text-sm font-bold tabular-nums whitespace-nowrap', theme.value)}>
          {Math.round(topic.accuracy)}%
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="tabular-nums">{topic.attempts} attempts</span>
        {trend && (
          <>
            <span aria-hidden="true">·</span>
            <span className={cn('capitalize font-medium', trend.cls)}>
              {trend.icon} {topic.trend}
            </span>
          </>
        )}
      </div>
    </div>
  );
});
TopicCard.displayName = 'TopicCard';

/* ═══════════════════════════════════════════════════════════════════
   TopicPerformance — Tabbed panel with accessible tab pattern
   ═══════════════════════════════════════════════════════════════════ */
const TopicPerformance = memo(({ topicPerformance }) => {
  const [activeId, setActiveId] = useState('weak');

  const activeTab = TOPIC_TABS.find((t) => t.id === activeId);
  const topics = topicPerformance[activeId] ?? [];

  const handleKeyDown = useCallback(
    (e) => {
      const ids = TOPIC_TABS.map((t) => t.id);
      const idx = ids.indexOf(activeId);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveId(ids[(idx + 1) % ids.length]);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveId(ids[(idx - 1 + ids.length) % ids.length]);
      }
    },
    [activeId],
  );

  return (
    <div
      className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5
        border border-white/50 shadow-sm"
      style={{ animation: 'gs-up .5s ease-out .3s both' }}
    >
      <h2 className="text-sm font-semibold text-slate-800 mb-3">
        Topic Performance
      </h2>

      {/* Tab bar */}
      <div
        className="flex gap-1 mb-4 border-b border-slate-200"
        role="tablist"
        aria-label="Topic performance categories"
        onKeyDown={handleKeyDown}
      >
        {TOPIC_TABS.map((tab) => {
          const count = (topicPerformance[tab.id] ?? []).length;
          const isActive = activeId === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveId(tab.id)}
              className={cn(
                'px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium',
                'border-b-2 transition-all duration-200 whitespace-nowrap',
                'focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-amber-400 focus-visible:ring-inset',
                isActive
                  ? tab.tab
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              )}
            >
              <span className="mr-1" aria-hidden="true">
                {tab.icon}
              </span>
              <span className="hidden sm:inline">{tab.label}</span>{' '}
              <span className="text-xs opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Tab panel */}
      <div
        role="tabpanel"
        id={`panel-${activeId}`}
        aria-labelledby={`tab-${activeId}`}
        className="max-h-80 overflow-y-auto gs-scroll"
      >
        {topics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {topics.map((topic, i) => (
              <TopicCard
                key={topic.name ?? i}
                topic={topic}
                theme={activeTab}
                delay={Math.min(i * 0.04, 0.4)}
              />
            ))}
          </div>
        ) : (
          <div
            className="text-center py-10 text-slate-500 text-sm"
            role="status"
          >
            {activeTab.empty}
          </div>
        )}
      </div>
    </div>
  );
});
TopicPerformance.displayName = 'TopicPerformance';

/* ═══════════════════════════════════════════════════════════════════
   ChartsSection — Collapsible analytics charts
   ═══════════════════════════════════════════════════════════════════ */
const ChartsSection = memo(({ stats }) => {
  const [expanded, setExpanded] = useState(true);

  const { barData, donutData, totalAnswered } = useMemo(() => {
    const mcq = stats.questionTypesBreakdown?.MCQ ?? { count: 0, accuracy: 0 };
    const correct = Math.round((mcq.accuracy / 100) * mcq.count);
    const incorrect = mcq.count - correct;

    return {
      barData: [
        { label: 'Correct',   value: correct,   color: '#10B981' },
        { label: 'Incorrect', value: incorrect,  color: '#EF4444' },
      ],
      donutData: [
        { label: 'Correct',   value: correct,   color: '#10B981' },
        { label: 'Incorrect', value: incorrect,  color: '#EF4444' },
      ],
      totalAnswered: mcq.count,
    };
  }, [stats]);

  // Always show charts, even with no data

  return (
    <div style={{ animation: 'gs-up .5s ease-out .2s both' }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="mb-3 text-sm text-amber-600 hover:text-amber-700 font-medium
          flex items-center gap-1.5 transition-colors rounded-lg px-2 py-1
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <svg
          className={cn(
            'w-3.5 h-3.5 transition-transform duration-200',
            expanded && 'rotate-90',
          )}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
          />
        </svg>
        {expanded ? 'Hide Charts' : 'Show Charts'}
      </button>

      <div
        className={cn(
          'transition-all duration-300 overflow-hidden',
          expanded
            ? 'max-h-[800px] opacity-100'
            : 'max-h-0 opacity-0',
        )}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Performance Breakdown */}
          <div
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5
              border border-white/50 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-slate-800 mb-3">
              Performance Breakdown
            </h3>
            <BarChart
              data={barData}
              height={220}
              showDataLabels
              yAxisMax={Math.max(...barData.map((d) => d.value), 5)}
            />
          </div>

          {/* Answer Distribution */}
          <div
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5
              border border-white/50 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-slate-800 mb-3">
              Answer Distribution
            </h3>
            <DonutChart
              data={donutData}
              height={220}
              donutSize={65}
              centerLabel={{ label: 'Total', value: totalAnswered }}
              showLegend
              legendPosition="bottom"
            />
          </div>
        </div>
      </div>
    </div>
  );
});
ChartsSection.displayName = 'ChartsSection';

/* ═══════════════════════════════════════════════════════════════════
   AccuracyMiniBar — Inline accuracy indicator for KPI card
   ═══════════════════════════════════════════════════════════════════ */
const AccuracyMiniBar = memo(({ value }) => (
  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden" aria-hidden="true">
    <div
      className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500
        transition-all duration-700 ease-out"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
));
AccuracyMiniBar.displayName = 'AccuracyMiniBar';

/* ═══════════════════════════════════════════════════════════════════
   PrimaryBtn / GhostBtn — CTA buttons with focus-visible
   ═══════════════════════════════════════════════════════════════════ */
const PrimaryBtn = memo(({ onClick, children, className = '' }) => (
  <button
    onClick={onClick}
    className={cn(
      'px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600',
      'text-white text-sm font-semibold rounded-xl shadow-md',
      'hover:shadow-lg hover:-translate-y-0.5',
      'active:translate-y-0 active:shadow-md',
      'transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2',
      'focus-visible:ring-amber-400 focus-visible:ring-offset-2',
      className,
    )}
  >
    {children}
  </button>
));
PrimaryBtn.displayName = 'PrimaryBtn';

const GhostBtn = memo(({ onClick, children, className = '' }) => (
  <button
    onClick={onClick}
    className={cn(
      'px-5 py-2.5 bg-white border-2 border-amber-500/60',
      'text-amber-700 text-sm font-semibold rounded-xl',
      'hover:bg-amber-50 hover:border-amber-500',
      'transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2',
      'focus-visible:ring-amber-400 focus-visible:ring-offset-2',
      className,
    )}
  >
    {children}
  </button>
));
GhostBtn.displayName = 'GhostBtn';

/* ═══════════════════════════════════════════════════════════════════
   GlobalStatsPage — Orchestrator
   ═══════════════════════════════════════════════════════════════════ */
const GlobalStatsPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('all');

  useEffect(injectStyles, []);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await examBuddyAPI.getGlobalStats(timeRange);
      if (res.success) {
        setStats(res.data);
      } else {
        setError(res.error || 'Failed to load statistics');
      }
    } catch (err) {
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const goHome = useCallback(() => navigate('/home'), [navigate]);

  /* ═══════════ Guards ═══════════ */

  if (loading) {
    return (
      <FullPageStatus
        icon={
          <div
            className="w-12 h-12 border-[3px] border-amber-500 border-t-transparent
              rounded-full animate-spin mx-auto"
            role="status"
            aria-label="Loading"
          />
        }
        message="Loading statistics…"
      />
    );
  }

  if (error) {
    return (
      <FullPageStatus
        icon={
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        }
        title="Error Loading Statistics"
        message={error}
        action={<PrimaryBtn onClick={loadStats}>Retry</PrimaryBtn>}
      />
    );
  }

  if (!stats) {
    return (
      <FullPageStatus
        icon={
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        }
        message="No statistics yet. Complete some quizzes to see your progress!"
        action={<PrimaryBtn onClick={goHome}>Start Learning</PrimaryBtn>}
      />
    );
  }

  /* ═══════════ Main Render ═══════════ */
  const hasWeakTopics = (stats.topicPerformance?.weak ?? []).length > 0;

  // Handle search result selection from GlobalHeader
  const handleSearchResultSelect = (result) => {
    if (result.type === 'quiz' && result.slug) {
      // Start the quiz
      navigate(`/quiz/${result.slug}`);
    }
  };

  return (
    <div className={cn(backgrounds.pageMinHeight, 'min-h-screen pb-8')}>
      <BackgroundEffects />
      <GlobalHeader currentPage="stats" onSearchSelect={handleSearchResultSelect} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Learning Analytics
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Track your quiz performance over time
            </p>
          </div>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {STAT_DEFS.map((def, i) => (
            <StatCard
              key={def.key}
              def={def}
              value={stats[def.key] ?? 0}
              delay={i * 0.06}
            />
          ))}
        </div>

        {/* ── Charts ── */}
        <div className="mb-5">
          <ChartsSection stats={stats} />
        </div>

        {/* ── Topic Performance ── */}
        <div className="mb-8">
          <TopicPerformance topicPerformance={stats.topicPerformance ?? {}} />
        </div>

        {/* ── CTAs ── */}
        <div className="flex flex-wrap gap-3 justify-center">
          <GhostBtn onClick={goHome}>← Back to Home</GhostBtn>
          {hasWeakTopics && (
            <PrimaryBtn
              onClick={() => navigate('/home', { state: { openQuizSetup: true } })}
            >
              Practice Weak Topics →
            </PrimaryBtn>
          )}
        </div>
      </main>
    </div>
  );
};

export default GlobalStatsPage;