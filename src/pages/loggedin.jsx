import React from 'react';
import { useNavigate } from 'react-router-dom';
import { backgrounds, cn } from '../utils/designTokens';
import GlobalHeader from '../components/ui/GlobalHeader';
import { WelcomeSection } from '../components/home/WelcomeSection';
import { ContinueStudying } from '../components/home/ContinueStudying';
import { RecentlyViewed } from '../components/home/RecentlyViewed';
import { QuizBrowserSection } from '../components/landing/QuizBrowser/QuizBrowserSection';
import { ExploreByExam } from '../components/home/ExploreByExam';
import { ExploreByStudyPackage } from '../components/home/ExploreByStudyPackage';
import { Testimonials } from '../components/home/Testimonials';
import { Footer } from '../components/home/Footer';
import { useQuizBrowser } from '../hooks/useQuizBrowser';

const HomePage = () => {
  const navigate = useNavigate();
  const {
    activeCategory, setActiveCategory,
    highlightedQuizId, setHighlightedQuizId,
    quizBrowserRef, activeCategoryData,
    totalQuizzes, totalQuestions,
    trendingQuizzes, quizCategories,
    handleResultSelect,
  } = useQuizBrowser();

  const handleStartQuiz = (quiz) => navigate('/quiz', { state: { quiz } });

  return (
    <div className={cn(backgrounds.page, 'overflow-x-hidden relative min-h-screen')}>
      {/* Background decorations */}
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

      <GlobalHeader currentPage="home" onSearchSelect={handleResultSelect} />

      <main className="relative pt-20">
        <WelcomeSection />
        <ContinueStudying onContinue={handleStartQuiz} />
        <RecentlyViewed onStartQuiz={handleStartQuiz} />

        <QuizBrowserSection
          quizBrowserRef={quizBrowserRef}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          highlightedQuizId={highlightedQuizId}
          activeCategoryData={activeCategoryData}
          totalQuizzes={totalQuizzes}
          totalQuestions={totalQuestions}
          trendingQuizzes={trendingQuizzes}
          quizCategories={quizCategories}
          onResultSelect={handleResultSelect}
          onStartQuiz={handleStartQuiz}
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

export default HomePage;