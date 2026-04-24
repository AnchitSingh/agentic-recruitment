// src/components/landing/QuizBrowser/QuizBrowserSection.jsx

import React from 'react';
import { SearchBar } from './SearchBar';
import { FeaturedQuizzes } from './FeaturedQuizzes';
import { CategoryTabs } from './CategoryTabs';
import { QuizGrid } from './QuizGrid';

export const QuizBrowserSection = ({
  quizBrowserRef,
  activeCategory,
  setActiveCategory,
  highlightedQuizId,
  activeCategoryData,
  totalQuizzes,
  totalQuestions,
  quizCategories,
  filteredQuizzes,
  paginatedQuizzes,
  featuredQuizzes,
  trendingQuizzes,
  availableFilters,
  sortOptions,
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  difficultyFilter,
  setDifficultyFilter,
  stepFilter,
  setStepFilter,
  sortBy,
  setSortBy,
  onResultSelect,
  onStartQuiz,
  onNextPage,
  onPreviousPage,
  goToPage,
  onSetHighlightedQuizId,
}) => {
  return (
    <section
      ref={quizBrowserRef}
      className="py-16 sm:py-24 bg-gradient-to-b from-slate-50/80 to-white relative scroll-mt-20"
    >
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-0 w-96 h-96 bg-gradient-to-bl from-blue-50/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-0 w-96 h-96 bg-gradient-to-tr from-amber-50/40 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* ── Section Header ── */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-sm font-medium mb-4">
            📚 Quiz Library
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-slate-800 mb-3">
            What Would You Like to Study
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              {' '}Today
            </span>?
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            <span className="font-semibold text-slate-700">{totalQuizzes}</span> quizzes ·{' '}
            <span className="font-semibold text-slate-700">{totalQuestions.toLocaleString()}</span> questions
            across{' '}
            <span className="font-semibold text-slate-700">{quizCategories.length}</span> topics
          </p>
        </div>

        {/* ── Search ── */}
        <SearchBar onResultSelect={onResultSelect} />

        {/* ── Featured / Popular / Trending ── */}
        <FeaturedQuizzes
          featured={featuredQuizzes}
          onStartQuiz={onStartQuiz}
          onCategorySelect={(catId) => {
            setActiveCategory(catId);
            setTimeout(() => {
              document.getElementById('browse-by-topic')?.scrollIntoView({
                behavior: 'smooth', block: 'start',
              });
            }, 100);
          }}
        />

        {/* ── Browse by Topic ── */}
        <div id="browse-by-topic" className="scroll-mt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="text-base">📂</span>
              Browse by Topic
            </div>
            <div className="flex-1 h-px bg-slate-200/60" />
            <span className="text-xs text-slate-400">
              {filteredQuizzes.length} quiz{filteredQuizzes.length !== 1 ? 'zes' : ''}
            </span>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Category Tabs */}
            <CategoryTabs
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              quizCategories={quizCategories}
            />

            {/* Quiz Grid */}
            <QuizGrid
              activeCategoryData={activeCategoryData}
              highlightedQuizId={highlightedQuizId}
              filteredQuizzes={filteredQuizzes}
              paginatedQuizzes={paginatedQuizzes}
              currentPage={currentPage}
              totalPages={totalPages}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
              availableFilters={availableFilters}
              sortOptions={sortOptions}
              difficultyFilter={difficultyFilter}
              setDifficultyFilter={setDifficultyFilter}
              stepFilter={stepFilter}
              setStepFilter={setStepFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              onStartQuiz={onStartQuiz}
              onNextPage={onNextPage}
              onPreviousPage={onPreviousPage}
              goToPage={goToPage}
            />
          </div>
        </div>
      </div>
    </section>
  );
};