// src/hooks/useTopicDetail.js

import { useState, useEffect, useMemo } from 'react';
import { fetchTopicData } from '../services/backendAPI';
import storage from '../utils/storage';

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export function useTopicDetail(slug) {
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completedQuizIds, setCompletedQuizIds] = useState(new Set());
  const [expandedSteps, setExpandedSteps] = useState(new Set());
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const cached = cache.get(slug);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setTopic(cached.data);
      setLoading(false);
      // Auto-expand first step
      if (cached.data?.stepGroups?.[0]) {
        setExpandedSteps(new Set([cached.data.stepGroups[0].step]));
      }
      loadProgress();
      return;
    }

    setLoading(true);
    setError(null);

    fetchTopicData(slug).then(res => {
      if (cancelled) return;

      if (res.success) {
        cache.set(slug, { data: res.data, timestamp: Date.now() });
        setTopic(res.data);
        // Auto-expand first step group
        if (res.data.stepGroups?.[0]) {
          setExpandedSteps(new Set([res.data.stepGroups[0].step]));
        }
      } else {
        setError(res.error);
      }
      setLoading(false);
    });

    loadProgress();
    return () => { cancelled = true; };
  }, [slug]);

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
    } catch { /* ignore */ }
  }

  const isQuizCompleted = (quizId) => {
    return completedQuizIds.has(quizId) || completedQuizIds.has(String(quizId));
  };

  const toggleStep = (step) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  const expandAll = () => {
    if (!topic?.stepGroups) return;
    setExpandedSteps(new Set(topic.stepGroups.map(g => g.step)));
  };

  const collapseAll = () => {
    setExpandedSteps(new Set());
  };

  // Filter quizzes by difficulty within each step group
  const filteredStepGroups = useMemo(() => {
    if (!topic?.stepGroups) return [];

    if (difficultyFilter === 'all') return topic.stepGroups;

    return topic.stepGroups
      .map(group => ({
        ...group,
        quizzes: group.quizzes.filter(q =>
          q.difficulty?.toLowerCase() === difficultyFilter
        ),
        totalQuestions: group.quizzes
          .filter(q => q.difficulty?.toLowerCase() === difficultyFilter)
          .reduce((s, q) => s + q.totalQuestions, 0),
      }))
      .filter(group => group.quizzes.length > 0);
  }, [topic, difficultyFilter]);

  // Progress
  const progress = useMemo(() => {
    if (!topic?.stepGroups) return { completed: 0, total: 0, percentage: 0 };

    const allQuizzes = topic.stepGroups.flatMap(g => g.quizzes);
    const total = allQuizzes.length;
    const completed = allQuizzes.filter(q => isQuizCompleted(q.id)).length;

    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [topic, completedQuizIds]);

  // Per-step progress
  const stepProgress = useMemo(() => {
    if (!topic?.stepGroups) return {};
    const result = {};
    for (const group of topic.stepGroups) {
      const completed = group.quizzes.filter(q => isQuizCompleted(q.id)).length;
      result[group.step] = {
        completed,
        total: group.quizzes.length,
        percentage: group.quizzes.length > 0
          ? Math.round((completed / group.quizzes.length) * 100)
          : 0,
      };
    }
    return result;
  }, [topic, completedQuizIds]);

  return {
    topic,
    loading,
    error,
    filteredStepGroups,
    progress,
    stepProgress,
    expandedSteps,
    toggleStep,
    expandAll,
    collapseAll,
    difficultyFilter,
    setDifficultyFilter,
    isQuizCompleted,
  };
}