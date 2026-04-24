import React, { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamCategories } from '../../hooks/useExamCategories';

// ─── Main Component ──────────────────────────────────────

export const ExploreByExam = () => {
  const navigate = useNavigate();
  const { exams, loading, error } = useExamCategories();

  const handleExamClick = useCallback(
    (examId) => navigate(`/exam/${examId}`),
    [navigate],
  );

  const gridClass = (() => {
    if (exams.length === 1) return 'max-w-md mx-auto';
    if (exams.length === 2) return 'sm:grid-cols-2 max-w-3xl mx-auto';
    return 'sm:grid-cols-2 lg:grid-cols-3';
  })();

  return (
    <section className="py-16" aria-labelledby="explore-exams-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h2
            id="explore-exams-heading"
            className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight"
          >
            Explore by Exam
          </h2>
          <p className="mt-2 text-slate-500 max-w-xl mx-auto">
            Choose your exam and dive into targeted question sets
          </p>
        </header>

        {/* Loading */}
        {loading && <ExamSkeleton />}

        {/* Error */}
        {error && !loading && <ErrorState />}

        {/* Empty */}
        {!loading && !error && exams.length === 0 && <EmptyState />}

        {/* Cards */}
        {!loading && !error && exams.length > 0 && (
          <ul
            className={`grid gap-6 list-none p-0 m-0 ${gridClass}`}
            role="list"
            aria-label="Available exams"
          >
            {exams.map((exam, index) => (
              <li
                key={exam.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <ExamCard
                  exam={exam}
                  onClick={() => handleExamClick(exam.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

// ─── Helpers ──────────────────────────────────────────────

function formatCount(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n;
}

// ─── Exam Card ────────────────────────────────────────────

const ExamCard = memo(function ExamCard({ exam, onClick }) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
    [onClick],
  );

  const ctaLabel = `View ${exam.title.split(' ').pop()} Content`;
  const progressClamped = Math.min(exam.userProgress, 100);

  return (
    <article
      className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden
        hover:shadow-xl hover:-translate-y-1 focus-visible:shadow-xl focus-visible:-translate-y-1
        focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 focus-visible:outline-none
        transition-all duration-300 group cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={`${exam.title} — ${exam.quizCount} quizzes, ${exam.questionCount} questions, ${progressClamped}% complete`}
    >
      {/* Gradient header */}
      <div
        className={`bg-gradient-to-r ${exam.gradient} p-6 text-white relative overflow-hidden`}
      >
        {/* Decorative circles */}
        <div
          className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform duration-500"
          aria-hidden="true"
        />

        <div className="relative z-10">
          <span
            className="text-3xl mb-2 block group-hover:scale-110 transition-transform duration-300 w-fit"
            aria-hidden="true"
          >
            {exam.icon}
          </span>
          <h3 className="text-xl font-bold">{exam.title}</h3>
          {exam.subtitle && (
            <p className="text-sm text-white/80 mt-0.5">{exam.subtitle}</p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {exam.description && (
          <p className="text-sm text-slate-600 mb-4 leading-relaxed line-clamp-2">
            {exam.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex gap-4 mb-4" aria-label="Exam statistics">
          <StatBlock value={exam.quizCount} label="Quizzes" />
          <div className="w-px bg-slate-200 self-stretch" aria-hidden="true" />
          <StatBlock value={formatCount(exam.questionCount)} label="Questions" />
        </div>

        {/* Subject pills */}
        {exam.subjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5" aria-label="Subjects covered">
            {exam.subjects.map((subject) => (
              <span
                key={subject}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg select-none transition-opacity group-hover:opacity-90 ${exam.pillBg}`}
              >
                {subject}
              </span>
            ))}
          </div>
        )}

        {/* Progress */}
        <div className="mb-5" role="progressbar" aria-valuenow={progressClamped} aria-valuemin={0} aria-valuemax={100} aria-label="Your progress">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-500">
              Your Progress
            </span>
            <span className={`text-xs font-bold ${exam.textColor}`}>
              {progressClamped}%
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${exam.gradient} transition-all duration-700 ease-out`}
              style={{ width: `${progressClamped}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        <div
          className={`w-full py-2.5 rounded-xl text-sm font-semibold text-center select-none transition-all duration-200 ${exam.textColor} ${exam.lightBg} group-hover:opacity-90`}
          aria-hidden="true"
        >
          {ctaLabel} →
        </div>
      </div>
    </article>
  );
});

// ─── Stat Block ───────────────────────────────────────────

function StatBlock({ value, label }) {
  return (
    <div>
      <div className="text-lg font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-16 text-slate-500" role="status">
      <span className="text-4xl mb-3 block" aria-hidden="true">📚</span>
      <p className="font-medium text-slate-700">No exams available yet</p>
      <p className="text-sm mt-1">Check back soon — new content is on the way.</p>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────

function ErrorState() {
  return (
    <div className="text-center py-16" role="alert">
      <span className="text-4xl mb-3 block" aria-hidden="true">⚠️</span>
      <p className="text-slate-700 font-medium">Unable to load exam data</p>
      <p className="text-sm text-slate-500 mt-1">Please try again in a moment.</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-md px-2 py-1 transition-colors"
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

function ExamSkeleton() {
  return (
    <div
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="Loading exams"
    >
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="bg-white/80 rounded-2xl border border-slate-200/60 overflow-hidden animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="bg-slate-200 h-36" />
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <div className="h-4 bg-slate-100 rounded w-full" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
            </div>
            <div className="flex gap-4">
              <div className="space-y-1">
                <div className="h-6 bg-slate-200 rounded w-10" />
                <div className="h-3 bg-slate-100 rounded w-14" />
              </div>
              <div className="w-px bg-slate-200" />
              <div className="space-y-1">
                <div className="h-6 bg-slate-200 rounded w-12" />
                <div className="h-3 bg-slate-100 rounded w-16" />
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className="h-6 bg-slate-100 rounded-lg w-16" />
              <div className="h-6 bg-slate-100 rounded-lg w-20" />
              <div className="h-6 bg-slate-100 rounded-lg w-14" />
            </div>
            <div className="h-2 bg-slate-100 rounded-full" />
            <div className="h-10 bg-slate-100 rounded-xl" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}