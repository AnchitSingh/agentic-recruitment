import { useState, useEffect, useMemo } from 'react';
import { fetchExamAggregates } from '../services/backendAPI';
import storage from '../utils/storage';
import { STEP_VISUALS } from '../data/visualConfig';

// Module-level cache
let cachedExams = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000;

// Step display order
const STEP_ORDER = ['step1', 'step2', 'step3'];

export function useExamCategories() {
  const [exams, setExams] = useState(cachedExams || []);
  const [loading, setLoading] = useState(!cachedExams);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cachedExams && Date.now() - cacheTimestamp < CACHE_TTL) {
      setExams(cachedExams);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);

      const res = await fetchExamAggregates();
      if (cancelled) return;

      if (res.success) {
        // Calculate user progress per step
        const progress = await calculateProgress(res.data);

        // Map to display format with visuals
        const mapped = res.data
          .map(stepData => {
            const visuals = STEP_VISUALS[stepData.step] || STEP_VISUALS.step1;

            return {
              id: stepData.step,
              title: visuals.title,
              subtitle: visuals.subtitle,
              icon: visuals.icon,
              gradient: visuals.gradient,
              lightBg: visuals.lightBg,
              textColor: visuals.textColor,
              pillBg: visuals.pillBg,
              description: visuals.description,
              quizCount: stepData.quizCount,
              questionCount: stepData.questionCount,
              subjects: stepData.subjects.slice(0, 8), // limit pills
              userProgress: progress[stepData.step] || 0,
              sortOrder: STEP_ORDER.indexOf(stepData.step),
            };
          })
          .sort((a, b) => a.sortOrder - b.sortOrder);

        cachedExams = mapped;
        cacheTimestamp = Date.now();
        setExams(mapped);
      } else {
        setError(res.error);
      }

      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { exams, loading, error };
}

/**
 * Calculate user's completion percentage per step
 * by cross-referencing completed quizzes with quiz catalog
 */
async function calculateProgress(stepData) {
  const progress = {};

  try {
    // Get completed quiz IDs from localStorage
    const quizProgress = await storage.get('quizProgress', []);
    if (!Array.isArray(quizProgress) || quizProgress.length === 0) {
      return progress;
    }

    // Get completed quiz IDs
    const completedIds = new Set();
    for (const [quizId, result] of quizProgress) {
      if (result?.completed) {
        // Extract numeric ID if it's a Supabase quiz
        const numId = parseInt(quizId);
        if (!isNaN(numId)) {
          completedIds.add(numId);
        }
      }
    }

    if (completedIds.size === 0) return progress;

    // Get quiz-to-step mapping from quiz_history or completedQuizzes
    const quizHistory = await storage.get('quiz_history', []);
    const quizStepMap = new Map();

    for (const entry of quizHistory) {
      if (entry.data?.step) {
        quizStepMap.set(entry.id, entry.data.step);
      }
    }

    // Count completed quizzes per step
    const completedPerStep = {};
    for (const id of completedIds) {
      const step = quizStepMap.get(id) || quizStepMap.get(String(id));
      if (step) {
        completedPerStep[step] = (completedPerStep[step] || 0) + 1;
      }
    }

    // Calculate percentage
    for (const stepInfo of stepData) {
      const completed = completedPerStep[stepInfo.step] || 0;
      progress[stepInfo.step] = stepInfo.quizCount > 0
        ? Math.round((completed / stepInfo.quizCount) * 100)
        : 0;
    }
  } catch (e) {
    console.warn('[progress] Failed to calculate:', e);
  }

  return progress;
}