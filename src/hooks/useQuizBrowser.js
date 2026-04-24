// src/hooks/useQuizBrowser.js

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizCategories, allQuizzes } from '../data/quizCategories';
import { toTopicSlug } from '../services/backendAPI';

const QUIZZES_PER_PAGE = 6;

// ─── Scoring: rank quizzes for "popular" and "trending" ────
//
// Since we don't have real analytics yet, we derive popularity
// from metadata signals. When you add real completion tracking
// later, just update the scoring weights.

function scoreQuiz(quiz) {
  let score = 0;

  // Question count signals comprehensiveness
  if (quiz.questions >= 15) score += 3;
  else if (quiz.questions >= 10) score += 2;
  else if (quiz.questions >= 5) score += 1;

  // Flags from catalog generation
  if (quiz.highYield) score += 4;
  if (quiz.recommended) score += 3;
  if (quiz.trending) score += 2;

  // Search boost from catalog
  score += (quiz.searchBoost - 1) * 5;

  // Hard quizzes are popular with serious studiers
  if (quiz.difficulty === 'Hard') score += 1;

  // Real completion data (when available)
  if (quiz.completions > 0) {
    score += Math.min(Math.log10(quiz.completions) * 2, 6);
  }

  // Real ratings (when available)
  if (quiz.rating > 0) {
    score += quiz.rating * 0.5;
  }

  // Penalty for tiny quizzes
  if (quiz.questions < 5) score -= 3;

  // Penalty for "Mixed Review" (less focused)
  if (quiz.title?.includes('Mixed Review')) score -= 1;

  return score;
}

function isNewQuiz(quiz) {
  // Quizzes added in the last 14 days
  // Since catalog is generated at build time, use a relative check
  if (!quiz.createdAt) return false;
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  return new Date(quiz.createdAt).getTime() > twoWeeksAgo;
}

// ─── Sort options ───────────────────────────────────────────

const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended', fn: (a, b) => scoreQuiz(b) - scoreQuiz(a) },
  { id: 'questions-desc', label: 'Most Questions', fn: (a, b) => b.questions - a.questions },
  { id: 'questions-asc', label: 'Fewest Questions', fn: (a, b) => a.questions - b.questions },
  { id: 'difficulty-asc', label: 'Easiest First', fn: (a, b) => difficultyOrder(a) - difficultyOrder(b) },
  { id: 'difficulty-desc', label: 'Hardest First', fn: (a, b) => difficultyOrder(b) - difficultyOrder(a) },
  { id: 'title', label: 'A → Z', fn: (a, b) => a.title.localeCompare(b.title) },
];

function difficultyOrder(quiz) {
  const order = { Easy: 1, Medium: 2, Hard: 3 };
  return order[quiz.difficulty] || 2;
}

// ─── The Hook ───────────────────────────────────────────────

export const useQuizBrowser = () => {
  const navigate = useNavigate();

  // ── State ──
  const [activeCategory, setActiveCategory] = useState(() => {
    // Default to first category that has quizzes
    const first = quizCategories.find(c => c.quizzes.length > 0);
    return first?.id || quizCategories[0]?.id || 'step1';
  });
  const [highlightedQuizId, setHighlightedQuizId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [stepFilter, setStepFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');

  const quizBrowserRef = useRef(null);

  // ── Reset on category change ──
  useEffect(() => {
    setCurrentPage(1);
    setDifficultyFilter('all');
  }, [activeCategory]);

  // ── Clear highlight after delay ──
  useEffect(() => {
    if (!highlightedQuizId) return;
    const t = setTimeout(() => setHighlightedQuizId(null), 2500);
    return () => clearTimeout(t);
  }, [highlightedQuizId]);

  // ── Active category data ──
  const activeCategoryData = useMemo(
    () => quizCategories.find(c => c.id === activeCategory) || null,
    [activeCategory]
  );

  // ── Filtered + sorted quizzes for current category ──
  const filteredQuizzes = useMemo(() => {
    if (!activeCategoryData?.quizzes) return [];

    let quizzes = [...activeCategoryData.quizzes];

    // Apply difficulty filter
    if (difficultyFilter !== 'all') {
      quizzes = quizzes.filter(
        q => q.difficulty?.toLowerCase() === difficultyFilter
      );
    }

    // Apply step filter (relevant for organ-system categories that span steps)
    if (stepFilter !== 'all') {
      quizzes = quizzes.filter(q => q.step === stepFilter);
    }

    // Apply sort
    const sortOption = SORT_OPTIONS.find(s => s.id === sortBy);
    if (sortOption) {
      quizzes.sort(sortOption.fn);
    }

    return quizzes;
  }, [activeCategoryData, difficultyFilter, stepFilter, sortBy]);

  // ── Pagination ──
  const paginatedQuizzes = useMemo(() => {
    const start = (currentPage - 1) * QUIZZES_PER_PAGE;
    return filteredQuizzes.slice(start, start + QUIZZES_PER_PAGE);
  }, [filteredQuizzes, currentPage]);

  const totalPages = Math.ceil(filteredQuizzes.length / QUIZZES_PER_PAGE);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // ── Aggregate stats ──
  const totalQuizzes = useMemo(
    () => quizCategories.reduce((s, c) => s + c.quizzes.length, 0),
    []
  );

  const totalQuestions = useMemo(
    () => quizCategories.reduce(
      (s, c) => s + c.quizzes.reduce((ss, q) => ss + (q.questions || 0), 0),
      0
    ),
    []
  );

  // ── Featured quizzes (the important part) ──

  const featuredQuizzes = useMemo(() => {
    // Score all quizzes
    const scored = allQuizzes.map(q => ({
      ...q,
      _score: scoreQuiz(q),
      _isNew: isNewQuiz(q),
    }));

    // Popular: top scored quizzes (exclude study packs)
    const popular = scored
      .filter(q => !q.isStudyPack && q.questions >= 5) // minimum quality threshold, exclude study packs
      .sort((a, b) => b._score - a._score)
      .slice(0, 8);

    // High Yield: specifically flagged (exclude study packs)
    const highYield = scored
      .filter(q => !q.isStudyPack && q.highYield && q.questions >= 5)
      .sort((a, b) => b._score - a._score)
      .slice(0, 6);

    // New additions (exclude study packs)
    const newlyAdded = scored
      .filter(q => !q.isStudyPack && q._isNew && q.questions >= 5)
      .sort((a, b) => b.questions - a.questions)
      .slice(0, 6);

    // Per-step picks (one best quiz per step, exclude study packs)
    const stepPicks = [];
    const seenSteps = new Set();
    for (const q of scored.sort((a, b) => b._score - a._score)) {
      if (q.step && !seenSteps.has(q.step) && !q.isStudyPack && q.questions >= 5) {
        seenSteps.add(q.step);
        stepPicks.push(q);
      }
    }

    return { popular, highYield, newlyAdded, stepPicks };
  }, []);

  // ── Trending (for backward compat with TrendingStrip) ──
  const trendingQuizzes = useMemo(() => {
    return featuredQuizzes.popular.slice(0, 5);
  }, [featuredQuizzes]);

  // ── Available filters for current category ──
  const availableFilters = useMemo(() => {
    if (!activeCategoryData?.quizzes) return { difficulties: [], steps: [] };

    const difficulties = new Set();
    const steps = new Set();

    for (const q of activeCategoryData.quizzes) {
      if (q.difficulty) difficulties.add(q.difficulty.toLowerCase());
      if (q.step) steps.add(q.step);
    }

    return {
      difficulties: ['all', ...['easy', 'medium', 'hard'].filter(d => difficulties.has(d))],
      steps: steps.size > 1
        ? ['all', ...Array.from(steps).sort()]
        : [], // don't show step filter if category only has one step
    };
  }, [activeCategoryData]);

  // ── Handlers ──

  const handleResultSelect = useCallback((result) => {
  if (result.type === 'category') {
    navigate(`/topic/${toTopicSlug(result.label || result.id)}`);
  } else if (result.slug) {
    navigate(`/quiz/${result.slug}`);
  }
}, [navigate]);

  const handleNextPage = useCallback(() => {
    if (hasNextPage) setCurrentPage(p => p + 1);
  }, [hasNextPage]);

  const handlePreviousPage = useCallback(() => {
    if (hasPreviousPage) setCurrentPage(p => p - 1);
  }, [hasPreviousPage]);

  const goToPage = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  return {
    // State
    activeCategory,
    setActiveCategory,
    highlightedQuizId,
    setHighlightedQuizId,
    currentPage,
    difficultyFilter,
    setDifficultyFilter,
    stepFilter,
    setStepFilter,
    sortBy,
    setSortBy,

    // Refs
    quizBrowserRef,

    // Data
    quizCategories,
    activeCategoryData,
    filteredQuizzes,
    paginatedQuizzes,
    featuredQuizzes,
    trendingQuizzes,
    availableFilters,
    sortOptions: SORT_OPTIONS,

    // Stats
    totalQuizzes,
    totalQuestions,
    totalPages,
    hasNextPage,
    hasPreviousPage,

    // Handlers
    handleResultSelect,
    handleNextPage,
    handlePreviousPage,
    goToPage,
  };
};