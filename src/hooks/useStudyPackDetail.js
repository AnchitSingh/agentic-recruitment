import { useState, useEffect, useMemo } from 'react';
import { fetchStudyPackBySlug } from '../services/backendAPI';
import storage from '../utils/storage';

// Module-level cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export function useStudyPackDetail(slug) {
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completedQuizIds, setCompletedQuizIds] = useState(new Set());

  // Fetch pack data
  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    const cached = cache.get(slug);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setPack(cached.data);
      setLoading(false);
      loadProgress();
      return;
    }

    setLoading(true);
    setError(null);

    fetchStudyPackBySlug(slug).then(res => {
      if (cancelled) return;

      if (res.success) {
        cache.set(slug, { data: res.data, timestamp: Date.now() });
        setPack(res.data);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });

    loadProgress();

    return () => { cancelled = true; };
  }, [slug]);

  // Load user progress from localStorage
  async function loadProgress() {
    try {
      const quizProgress = await storage.get('quizProgress', []);
      if (!Array.isArray(quizProgress)) return;

      const completed = new Set();
      for (const [quizId, result] of quizProgress) {
        if (result?.completed) {
          completed.add(quizId);
          completed.add(String(quizId));
          // Also try numeric
          const num = parseInt(quizId);
          if (!isNaN(num)) completed.add(num);
        }
      }
      setCompletedQuizIds(completed);
    } catch {
      // ignore
    }
  }

  // Computed progress
  const progress = useMemo(() => {
    if (!pack?.quizzes) return { completed: 0, total: 0, percentage: 0 };

    const total = pack.quizzes.length;
    const completed = pack.quizzes.filter(q =>
      completedQuizIds.has(q.id) || completedQuizIds.has(String(q.id))
    ).length;

    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [pack, completedQuizIds]);

  // Find next uncompleted quiz
  const nextQuiz = useMemo(() => {
    if (!pack?.quizzes) return null;

    return pack.quizzes.find(q =>
      !completedQuizIds.has(q.id) && !completedQuizIds.has(String(q.id))
    ) || null;
  }, [pack, completedQuizIds]);

  // Check if a specific quiz is completed
  const isQuizCompleted = (quizId) => {
    return completedQuizIds.has(quizId) || completedQuizIds.has(String(quizId));
  };

  return {
    pack,
    loading,
    error,
    progress,
    nextQuiz,
    isQuizCompleted,
    refreshProgress: loadProgress,
  };
}