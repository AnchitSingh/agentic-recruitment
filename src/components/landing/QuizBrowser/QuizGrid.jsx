// src/components/landing/QuizBrowser/QuizGrid.jsx

import React from 'react';
import { QuizCard } from './QuizCard';

export const QuizGrid = ({
  activeCategoryData,
  highlightedQuizId,
  filteredQuizzes,
  paginatedQuizzes,
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  availableFilters,
  sortOptions,
  difficultyFilter,
  setDifficultyFilter,
  stepFilter,
  setStepFilter,
  sortBy,
  setSortBy,
  onStartQuiz,
  onNextPage,
  onPreviousPage,
  goToPage,
}) => {
  if (!activeCategoryData) return null;

  return (
    <div className="flex-1 min-w-0">
      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Difficulty filter chips */}
        <div className="flex gap-1.5">
          {availableFilters.difficulties.map(diff => (
            <button
              key={diff}
              onClick={() => setDifficultyFilter(diff)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                difficultyFilter === diff
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {diff === 'all' ? 'All' : (
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    diff === 'easy' ? 'bg-emerald-400'
                    : diff === 'hard' ? 'bg-red-400'
                    : 'bg-amber-400'
                  }`} />
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Step filter (if category spans multiple steps) */}
        {availableFilters.steps.length > 0 && (
          <>
            <div className="w-px h-5 bg-slate-200 hidden sm:block" />
            <div className="flex gap-1.5">
              {availableFilters.steps.map(step => (
                <button
                  key={step}
                  onClick={() => setStepFilter(step)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    stepFilter === step
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {step === 'all' ? 'All Steps' : step.replace('step', 'Step ')}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sort dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-600 cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            {sortOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
          <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* ── Quiz Cards ── */}
      {paginatedQuizzes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paginatedQuizzes.map(quiz => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              highlighted={quiz.id === highlightedQuizId}
              onStart={() => onStartQuiz(quiz)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          hasFilters={difficultyFilter !== 'all' || stepFilter !== 'all'}
          onClearFilters={() => {
            setDifficultyFilter('all');
            setStepFilter('all');
          }}
        />
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalResults={filteredQuizzes.length}
          hasNext={hasNextPage}
          hasPrev={hasPreviousPage}
          onNext={onNextPage}
          onPrev={onPreviousPage}
          goToPage={goToPage}
        />
      )}
    </div>
  );
};

// ─── Pagination Component ─────────────────────────────────

function Pagination({ currentPage, totalPages, totalResults, hasNext, hasPrev, onNext, onPrev, goToPage }) {
  // Generate page numbers with ellipsis
  const pages = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);

    if (currentPage > 3) pages.push('...');

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - 2) pages.push('...');

    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200/60">
      {/* Results count */}
      <span className="text-xs text-slate-400 hidden sm:block">
        {totalResults} quiz{totalResults !== 1 ? 'zes' : ''}
      </span>

      {/* Page numbers */}
      <div className="flex items-center gap-1.5 mx-auto sm:mx-0">
        {/* Prev */}
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="Previous page"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Page numbers */}
        {pages.map((page, i) =>
          page === '...' ? (
            <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-slate-400 text-sm">
              ···
            </span>
          ) : (
            <button
              key={page}
              onClick={() => goToPage(page)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                currentPage === page
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {page}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="Next page"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Page X of Y */}
      <span className="text-xs text-slate-400 hidden sm:block">
        Page {currentPage} of {totalPages}
      </span>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────

function EmptyState({ hasFilters, onClearFilters }) {
  return (
    <div className="text-center py-16 bg-white/50 rounded-2xl border border-dashed border-slate-200">
      <span className="text-4xl mb-3 block">🔍</span>
      <h3 className="text-lg font-semibold text-slate-700 mb-1">
        No quizzes match your filters
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        Try adjusting the difficulty or step filter
      </p>
      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="px-5 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
}