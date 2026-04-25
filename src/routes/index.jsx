import { Routes, Route } from 'react-router-dom';
import IndexPage from '../pages/index';
import ResultsPage from '../pages/ResultsPage';

/**
 * AppRoutes - Main routing configuration for the application.
 * Defines route paths and their corresponding page components.
 *
 * @returns {JSX.Element} Rendered routes configuration
 */
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/results" element={<ResultsPage />} />
    </Routes>
  );
};

export default AppRoutes;
