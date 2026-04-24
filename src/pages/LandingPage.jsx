import React from 'react';
import { useNavigate } from 'react-router-dom';
import { backgrounds, cn } from '../utils/designTokens';
import GlobalHeader from '../components/ui/GlobalHeader';
import '../styles/animations.css';

// Import extracted components
import { HeroSection } from '../components/landing/Hero/HeroSection';
import { QuizBrowserSection } from '../components/landing/QuizBrowser/QuizBrowserSection';
import { ExploreByExam } from '../components/home/ExploreByExam';
import { ExploreByStudyPackage } from '../components/home/ExploreByStudyPackage';
import { Testimonials } from '../components/home/Testimonials';
import { Footer } from '../components/home/Footer';

// Import quiz components
import LoggedInHeroSection from '../components/quiz/HeroSection';
import StatsSection from '../components/quiz/StatsSection';

// Import hooks
import { useAnimations } from '../hooks/useAnimations';
import { useQuizBrowser } from '../hooks/useQuizBrowser';

// Import data
import { quizEvents } from '../data/quizEvents';

const LandingPage = ({ onGoogleSignUp }) => {
    const navigate = useNavigate();

    // Use custom hooks
    const { mounted, entrance, currentSlide, setCurrentSlide, sliderPaused, setSliderPaused } = useAnimations();
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

    return (
        <div className={cn(backgrounds.page, 'overflow-x-hidden relative min-h-screen')}>
            {/* Background */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-amber-100/60 to-orange-100/40 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-gradient-to-tl from-orange-100/50 to-amber-50/30 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-r from-amber-50/30 to-orange-50/20 rounded-full blur-3xl" />
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: 'radial-gradient(circle, #64748b 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                    }}
                />
            </div>

            {/* Header */}
            <GlobalHeader currentPage="landing" onSearchSelect={handleSearchResultSelect} />

            {/* Main Content */}
            <main className="relative pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Hero Section */}
                <HeroSection
                    entrance={entrance}
                    onGoogleSignUp={onGoogleSignUp}
                />

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
                <Testimonials />
            </main>

            <Footer />
        </div>
    );
};

export default LandingPage;
