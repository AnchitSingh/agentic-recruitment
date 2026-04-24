// src/lib/anonTracker.js
import { supabase } from './supabase';

const ANON_ID_KEY = '_anon_device_id';

function getAnonId() {
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

function readLS(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || null;
  } catch {
    return null;
  }
}

/**
 * Reads localStorage, computes stats, dumps to Supabase.
 * Call this after quiz completion. That's it.
 */
export async function dumpAnonData() {
  const session = (await supabase.auth.getSession()).data.session;
  if (session?.user) return;

  const anonId = getAnonId();

  const quizProgress = readLS('quizProgress') || [];
  const quizHistory = readLS('quiz_history') || [];

  let questionsAnswered = 0;
  let correctAnswers = 0;
  let timeSpent = 0;
  let totalPercentage = 0;

  for (const [, result] of quizProgress) {
    if (!result) continue;
    questionsAnswered += result.answeredQuestions || 0;
    correctAnswers += result.score || 0;
    totalPercentage += result.percentage || 0;

    // Derive time from answers since result.timeSpent is 0
    if (result.timeSpent > 0) {
      timeSpent += result.timeSpent;
    } else if (result.answers?.length > 0) {
      const first = result.answers[0]?.totalTimeWhenAnswered || 0;
      const last = result.answers[result.answers.length - 1]?.totalTimeWhenAnswered || 0;
      if (first > last) {
        timeSpent += first - last; // countdown timer: first is highest
      }
    }
  }

  // Subjects + categories from quiz_history
  const subjects = new Set();
  for (const entry of quizHistory) {
    if (entry?.data?.subject) subjects.add(entry.data.subject);
    if (entry?.data?.category) subjects.add(entry.data.category);
  }

  const avgScore = quizProgress.length > 0
    ? totalPercentage / quizProgress.length
    : 0;

  try {
    await supabase.rpc('dump_anon_data', {
      p_anon_id: anonId,
      p_quizzes_completed: quizProgress.length,
      p_questions_answered: questionsAnswered,
      p_correct_answers: correctAnswers,
      p_time_spent: timeSpent,
      p_avg_score: Math.round(avgScore * 100) / 100,
      p_subjects: [...subjects],
    });
  } catch (e) {
    console.warn('[anon] dump failed:', e.message);
  }
}