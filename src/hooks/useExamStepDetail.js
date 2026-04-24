import { useState, useEffect, useMemo } from 'react';
import { fetchExamStepData } from '../services/backendAPI';
import storage from '../utils/storage';
import { STEP_VISUALS } from '../data/visualConfig';

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export function useExamStepDetail(step) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completedQuizIds, setCompletedQuizIds] = useState(new Set());
  const [organFilter, setOrganFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  useEffect(() => {
    if (!step) return;

    let cancelled = false;

    const cached = cache.get(step);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      setLoading(false);
      loadProgress();
      return;
    }

    setLoading(true);
    setError(null);

    fetchExamStepData(step).then(res => {
      if (cancelled) return;

      if (res.success) {
        cache.set(step, { data: res.data, timestamp: Date.now() });
        setData(res.data);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });

    loadProgress();

    return () => { cancelled = true; };
  }, [step]);

  async function loadProgress() {
    try {
      const quizProgress = await storage.get('quizProgress', []);
      if (!Array.isArray(quizProgress)) return;

      const completed = new Set();
      for (const [quizId, result] of quizProgress) {
        if (result?.completed) {
          completed.add(quizId);
          completed.add(String(quizId));
          const num = parseInt(quizId);
          if (!isNaN(num)) completed.add(num);
        }
      }
      setCompletedQuizIds(completed);
    } catch {
      // ignore
    }
  }

  const visuals = STEP_VISUALS[step] || STEP_VISUALS.step1;

  // Filter organ groups
  const filteredOrganGroups = useMemo(() => {
    if (!data?.organGroups) return [];

    let groups = data.organGroups;

    if (organFilter !== 'all') {
      groups = groups.filter(g => g.organ === organFilter);
    }

    if (difficultyFilter !== 'all') {
      groups = groups.map(g => ({
        ...g,
        quizzes: g.quizzes.filter(q =>
          q.difficulty?.toLowerCase() === difficultyFilter
        ),
      })).filter(g => g.quizzes.length > 0);
    }

    return groups;
  }, [data, organFilter, difficultyFilter]);

  // Overall progress
  const progress = useMemo(() => {
    if (!data?.organGroups) return { completed: 0, total: 0, percentage: 0 };

    const allQuizzes = data.organGroups.flatMap(g => g.quizzes);
    const total = allQuizzes.length;
    const completed = allQuizzes.filter(q =>
      completedQuizIds.has(q.id) || completedQuizIds.has(String(q.id))
    ).length;

    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [data, completedQuizIds]);

  // Per-organ progress
  const organProgress = useMemo(() => {
    if (!data?.organGroups) return {};

    const result = {};
    for (const group of data.organGroups) {
      const completed = group.quizzes.filter(q =>
        completedQuizIds.has(q.id) || completedQuizIds.has(String(q.id))
      ).length;
      result[group.organ] = {
        completed,
        total: group.quizzes.length,
        percentage: group.quizzes.length > 0
          ? Math.round((completed / group.quizzes.length) * 100)
          : 0,
      };
    }
    return result;
  }, [data, completedQuizIds]);

  const isQuizCompleted = (quizId) => {
    return completedQuizIds.has(quizId) || completedQuizIds.has(String(quizId));
  };

  return {
    data,
    loading,
    error,
    visuals,
    filteredOrganGroups,
    progress,
    organProgress,
    organFilter,
    setOrganFilter,
    difficultyFilter,
    setDifficultyFilter,
    isQuizCompleted,
  };
}