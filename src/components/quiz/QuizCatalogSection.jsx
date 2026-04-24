import React, { useRef } from 'react';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import QuizCard from './QuizCard';
import { CATALOG_PAGE_SIZE } from '../../utils/quizHelpers';
import { cn } from '../../utils/designTokens';

const Icons = {
  folder: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  search: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  x: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

const QuizCatalogSection = ({
  catalog,
  categories,
  activeCategory,
  setActiveCategory,
  searchTerm,
  setSearchTerm,
  debouncedSearch,
  filteredCatalog,
  visibleCount,
  setVisibleCount,
  onStartQuiz,
}) => {
  const searchRef = useRef(null);

  const clearSearch = () => {
    setSearchTerm('');
    searchRef.current?.focus();
  };

  const hasMore = filteredCatalog.length > visibleCount;

  return (
    <section
      aria-label="Quiz catalog"
      className="bg-white/90 backdrop-blur-sm border border-white/70 rounded-2xl shadow-sm p-4 sm:p-5"
    >
      {/* heading + search */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <span className="text-indigo-500">{Icons.folder}</span>
            Discover Quizzes
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Browse {catalog.length} quizzes by category or keyword.
          </p>
        </div>

        <div className="w-full lg:w-96 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {Icons.search}
          </span>
          <input
            ref={searchRef}
            id="catalog-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search quizzes, subjects, topics…"
            aria-label="Search quizzes"
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-sm
                       placeholder:text-slate-400
                       focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
                       transition-shadow"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                         hover:text-slate-600 transition-colors"
            >
              {Icons.x}
            </button>
          )}
        </div>
      </div>

      {/* category pills */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none
                    -mx-1 px-1"
        role="tablist"
        aria-label="Quiz categories"
      >
        {categories.map((cat) => (
          <button
            key={cat}
            role="tab"
            aria-selected={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all duration-200 shrink-0',
              activeCategory === cat
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-200'
                : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:text-amber-700',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* result count */}
      {debouncedSearch && (
        <p className="text-xs text-slate-500 mb-3">
          {filteredCatalog.length} result{filteredCatalog.length !== 1 && 's'} for "
          <span className="font-medium text-slate-700">{debouncedSearch}</span>"
        </p>
      )}

      {/* grid or empty */}
      {filteredCatalog.length === 0 ? (
        <EmptyState
          icon={Icons.search}
          title="No quizzes found"
          description="Try adjusting your search or selected category."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setActiveCategory('All');
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredCatalog.slice(0, visibleCount).map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                onStartQuiz={onStartQuiz}
                variant="catalog"
              />
            ))}
          </div>

          {/* show more */}
          {hasMore && (
            <div className="text-center mt-6">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setVisibleCount((c) => c + CATALOG_PAGE_SIZE)}
              >
                Show more ({filteredCatalog.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default QuizCatalogSection;
