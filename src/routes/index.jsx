import { Routes, Route } from 'react-router-dom';
import IndexPage from '../pages/index';
import QuizPage from '../pages/QuizPage';
import QuizLoadingPage from '../pages/QuizLoadingPage';
import QuizResultsPage from '../pages/QuizResultsPage';
import BookmarksPage from '../pages/BookmarksPage';
import PausedQuizzesPage from '../pages/PausedQuizzesPage';
import GlobalStatsPage from '../pages/GlobalStatsPage';
import HistoryPage from '../pages/HistoryPage';
import QuizCatalogPage from '../pages/QuizCatalogPage';
import QuestionPage from '../pages/QuestionPage';
import StudyPackPage from '../pages/StudyPackPage';
import ExamStepPage from '../pages/ExamStepPage';
import TopicPage from '../pages/TopicPage';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/browse" element={<QuizCatalogPage />} />
      <Route path="/quiz" element={<QuizPage />} />
      <Route path="/quiz/:slug" element={<QuizPage />} />
      <Route path="/question/:slug" element={<QuestionPage />} />
      <Route path="/quiz/loading" element={<QuizLoadingPage />} />
      <Route path="/results" element={<QuizResultsPage />} />
      <Route path="/bookmarks" element={<BookmarksPage />} />
      <Route path="/paused" element={<PausedQuizzesPage />} />
      <Route path="/stats" element={<GlobalStatsPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/study-pack/:slug" element={<StudyPackPage />} />
      <Route path="/exam/:step" element={<ExamStepPage />} />
      <Route path="/topic/:slug" element={<TopicPage />} />
    </Routes>
  );
};

export default AppRoutes;
