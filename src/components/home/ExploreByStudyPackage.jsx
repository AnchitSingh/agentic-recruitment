import React, { memo, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudyPacks } from '../../hooks/useStudyPacks';
import {
  ORGAN_VISUALS,
  DEFAULT_VISUAL,
  generatePackFeatures,
} from '../../data/visualConfig';

// ─── Icons ────────────────────────────────────────────────

const ChevronDown = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUp = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
  </svg>
);

const QuizzesIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  </svg>
);

const QuestionsIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────

const DIFFICULTY_COLORS = {
  easy: 'bg-emerald-400',
  hard: 'bg-red-400',
  medium: 'bg-amber-400',
};

function formatDuration(totalQuizzes) {
  const minutes = totalQuizzes * 15;
  return minutes >= 60
    ? `~${Math.round(minutes / 60)}h total`
    : `~${minutes} min total`;
}

function formatCount(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n;
}

function formatStep(step) {
  return step ? step.replace('step', 'Step ') : null;
}

// ─── Main Component ──────────────────────────────────────

export const ExploreByStudyPackage = () => {
  const navigate = useNavigate();
  const {
    packs,
    loading,
    error,
    hasMore,
    remaining,
    totalCount,
    showMore,
    showLess,
    isExpanded,
  } = useStudyPacks();

  const handleStart = useCallback(
    (slug) => navigate(`/study-pack/${slug}`),
    [navigate],
  );

  return (
    <section className="py-16" aria-labelledby="study-packages-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h2
            id="study-packages-heading"
            className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight"
          >
            Study Packages
          </h2>
          <p className="mt-2 text-slate-500 max-w-xl mx-auto">
            {loading
              ? 'Loading curated collections…'
              : `${totalCount} curated collections designed for efficient, goal-driven studying`}
          </p>
        </header>

        {/* Loading */}
        {loading && <StudyPackSkeleton />}

        {/* Error */}
        {error && !loading && <ErrorState />}

        {/* Empty */}
        {!loading && !error && packs.length === 0 && <EmptyState />}

        {/* Cards */}
        {!loading && !error && packs.length > 0 && (
          <>
            <ul
              className="grid gap-6 sm:grid-cols-2 list-none p-0 m-0"
              role="list"
              aria-label="Study packages"
            >
              {packs.map((pack, index) => (
                <li
                  key={pack.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <StudyPackCard
                    pack={pack}
                    index={index}
                    onStart={() => handleStart(pack.slug)}
                  />
                </li>
              ))}
            </ul>

            {/* Pagination */}
            {totalCount > 4 && (
              <nav className="flex items-center justify-center gap-3 mt-10" aria-label="Pagination">
                {hasMore && (
                  <button
                    onClick={showMore}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none text-slate-700 text-sm font-semibold transition-colors duration-200"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Show More
                    <span className="text-slate-400 font-normal">
                      ({remaining} remaining)
                    </span>
                  </button>
                )}

                {isExpanded && (
                  <button
                    onClick={showLess}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none text-slate-600 text-sm font-medium transition-colors duration-200"
                  >
                    <ChevronUp className="w-4 h-4" />
                    Show Less
                  </button>
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
};

// ─── Study Pack Card ──────────────────────────────────────

const StudyPackCard = memo(function StudyPackCard({ pack, index, onStart }) {
  const visual = ORGAN_VISUALS[pack.organ_system] || DEFAULT_VISUAL;
  const features = useMemo(() => generatePackFeatures(pack), [pack]);
  const emoji = pack.cover_emoji || visual.emoji;
  const isPopular = pack.total_quizzes >= 5 && index < 2;
  const durationLabel = formatDuration(pack.total_quizzes);
  const stepLabel = formatStep(pack.step);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStart();
      }
    },
    [onStart],
  );

  return (
    <article
      className={`relative bg-white/80 backdrop-blur-sm rounded-2xl border shadow-sm overflow-hidden
        hover:shadow-xl hover:-translate-y-1 focus-visible:shadow-xl focus-visible:-translate-y-1
        focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none
        transition-all duration-300 group cursor-pointer ${
          isPopular
            ? 'border-amber-300 ring-1 ring-amber-200/50'
            : 'border-slate-200/60'
        }`}
      role="button"
      tabIndex={0}
      onClick={onStart}
      onKeyDown={handleKeyDown}
      aria-label={`${pack.title} — ${pack.total_quizzes} quizzes, ${pack.total_questions} questions`}
    >
      {/* Popular badge */}
      {isPopular && (
        <span className="absolute top-4 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md z-10 select-none">
          ⭐ Popular
        </span>
      )}

      <div className="p-6">
        {/* Icon + Title */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${visual.gradient} flex items-center justify-center text-xl text-white shrink-0 shadow-md
              group-hover:scale-110 transition-transform duration-300`}
            aria-hidden="true"
          >
            {emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-slate-800 leading-snug line-clamp-1">
              {pack.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 select-none">
                Free
              </span>
              <span className="text-xs text-slate-400">{durationLabel}</span>
              {stepLabel && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 select-none">
                  {stepLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 mb-5 leading-relaxed line-clamp-2">
          {pack.description || `Comprehensive ${pack.organ_system || ''} study package.`}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-5 mb-5 text-sm">
          <Stat icon={<QuizzesIcon className="w-4 h-4 text-slate-400" />} value={pack.total_quizzes} label="quizzes" />
          <Stat icon={<QuestionsIcon className="w-4 h-4 text-slate-400" />} value={formatCount(pack.total_questions)} label="questions" />
          {pack.difficulty && pack.difficulty !== 'mixed' && (
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${DIFFICULTY_COLORS[pack.difficulty] || 'bg-amber-400'}`}
                aria-hidden="true"
              />
              <span className="text-slate-500 capitalize">{pack.difficulty}</span>
            </div>
          )}
        </div>

        {/* Features */}
        {features.length > 0 && (
          <ul className="space-y-2 mb-6 list-none p-0 m-0" aria-label="Package features">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-sm">
                <CheckIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-slate-600">{feature}</span>
              </li>
            ))}
          </ul>
        )}

        {/* CTA */}
        <div
          className={`w-full py-3 rounded-xl text-sm font-semibold text-center select-none transition-all duration-200 ${
            isPopular
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200/50 group-hover:shadow-lg group-hover:shadow-amber-300/50'
              : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
          }`}
          aria-hidden="true"
        >
          Start Package →
        </div>
      </div>
    </article>
  );
});

// ─── Stat ─────────────────────────────────────────────────

function Stat({ icon, value, label }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="font-semibold text-slate-700">{value}</span>
      <span className="text-slate-500">{label}</span>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-16 text-slate-500" role="status">
      <span className="text-4xl mb-3 block" aria-hidden="true">📦</span>
      <p className="font-medium text-slate-700">No study packages yet</p>
      <p className="text-sm mt-1">Check back soon — new packages are added regularly.</p>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────

function ErrorState() {
  return (
    <div className="text-center py-16" role="alert">
      <span className="text-4xl mb-3 block" aria-hidden="true">⚠️</span>
      <p className="text-slate-700 font-medium">Unable to load study packages</p>
      <p className="text-sm text-slate-500 mt-1">Something went wrong on our end.</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-md px-2 py-1 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Try again
      </button>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────

function StudyPackSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2" role="status" aria-label="Loading study packages">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="bg-white/80 rounded-2xl border border-slate-200/60 p-6 animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          </div>
          <div className="space-y-2 mb-5">
            <div className="h-4 bg-slate-100 rounded w-full" />
            <div className="h-4 bg-slate-100 rounded w-2/3" />
          </div>
          <div className="flex gap-5 mb-5">
            <div className="h-4 bg-slate-100 rounded w-24" />
            <div className="h-4 bg-slate-100 rounded w-28" />
          </div>
          <div className="space-y-2 mb-6">
            <div className="h-4 bg-slate-50 rounded w-5/6" />
            <div className="h-4 bg-slate-50 rounded w-4/6" />
            <div className="h-4 bg-slate-50 rounded w-3/4" />
          </div>
          <div className="h-12 bg-slate-200 rounded-xl" />
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}