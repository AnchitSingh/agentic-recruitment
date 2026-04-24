import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlobalHeader from '../components/ui/GlobalHeader';
import BackgroundEffects from '../components/ui/BackgroundEffects';
import Button from '../components/ui/Button';
import examBuddyAPI from '../services/api';
import { getQuizzes } from '../services/dataService';
import { backgrounds, cn } from '../utils/designTokens';

// Import components from LandingPage
import { QuizBrowserSection } from '../components/landing/QuizBrowser/QuizBrowserSection';
import { ExploreByExam } from '../components/home/ExploreByExam';
import { ExploreByStudyPackage } from '../components/home/ExploreByStudyPackage';

// Import hooks
import { useQuizBrowser } from '../hooks/useQuizBrowser';

/* ─── hooks ─────────────────────────────────────────────── */

function useDebounce(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}


/* ─── main page ─────────────────────────────────────────── */

const QuizCatalogPage = () => {
  const navigate = useNavigate();

  // Use quiz browser hook
  const {
    activeCategory,
    setActiveCategory,
    highlightedQuizId,
    setHighlightedQuizId,
    quizBrowserRef,
    activeCategoryData,
    totalQuizzes,
    totalQuestions,
    trendingQuizzes,
    featuredQuizzes,
    quizCategories,
    filteredQuizzes,
    paginatedQuizzes,
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
    handleResultSelect,
    handleNextPage,
    handlePreviousPage,
    goToPage,
  } = useQuizBrowser();

  // Handle quiz start
  const handleStartQuiz = (quiz) => {
    // Navigate to quiz with slug
    navigate(`/quiz/${quiz.slug}`, { state: { quiz } });
  };

  // Handle search result selection
  const handleSearchResultSelect = (result) => {
    handleResultSelect(result);
  };
  
  /* ─── main render ────────────────────────────────────── */
  return (
    <div className={cn(backgrounds.pageMinHeight, 'min-h-screen')}>
      <BackgroundEffects />
      <GlobalHeader currentPage="browse" onSearchSelect={handleSearchResultSelect} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-30 pb-12 relative z-10">
        {/* Quiz Browser Section */}
        <QuizBrowserSection
          quizBrowserRef={quizBrowserRef}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          highlightedQuizId={highlightedQuizId}
          activeCategoryData={activeCategoryData}
          totalQuizzes={totalQuizzes}
          totalQuestions={totalQuestions}
          quizCategories={quizCategories}
          filteredQuizzes={filteredQuizzes}
          paginatedQuizzes={paginatedQuizzes}
          featuredQuizzes={featuredQuizzes}
          trendingQuizzes={trendingQuizzes}
          availableFilters={availableFilters}
          sortOptions={sortOptions}
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          difficultyFilter={difficultyFilter}
          setDifficultyFilter={setDifficultyFilter}
          stepFilter={stepFilter}
          setStepFilter={setStepFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          onResultSelect={handleSearchResultSelect}
          onStartQuiz={handleStartQuiz}
          onNextPage={handleNextPage}
          onPreviousPage={handlePreviousPage}
          goToPage={goToPage}
          onSetHighlightedQuizId={setHighlightedQuizId}
        />
        <ExploreByExam />
        <ExploreByStudyPackage />
      </main>
    </div>
  );
};

export default QuizCatalogPage;