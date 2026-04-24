import { Routes, Route } from 'react-router-dom';
import IndexPage from '../pages/index';
import QuizPage from '../pages/QuizPage';
import QuizLoadingPage from '../pages/QuizLoadingPage';
import QuizResultsPage from '../pages/QuizResultsPage';
import BookmarksPage from '../pages/BookmarksPage';
import QuizCatalogPage from '../pages/QuizCatalogPage';
import QuestionPage from '../pages/QuestionPage';

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
    </Routes>
  );
};

export default AppRoutes;
