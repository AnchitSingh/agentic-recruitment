import { Routes, Route } from 'react-router-dom';
import IndexPage from '../pages/index';
import ResultsPage from '../pages/ResultsPage';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/results" element={<ResultsPage />} />
    </Routes>
  );
};

export default AppRoutes;
