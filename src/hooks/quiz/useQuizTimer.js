/**
 * Manages both the total quiz timer and the per-question timer
 * through a single interval + two expiration effects.
 *
 * The reducer's TICK action handles the actual decrement logic
 * (including skipping the question timer when already answered).
 */

import { useEffect, useRef } from 'react';
import { A } from './quizReducer';

export default function useQuizTimer(
  state,
  dispatch,
  onTotalTimeExpired,
  onQuestionTimeExpired,                                     // ← NEW callback
) {
  const {
    isQuizActive, isPaused, config,
    timeRemaining, questionTimeRemaining,
    currentQuestionIndex,
  } = state;

  const intervalRef         = useRef(null);
  const totalExpiredRef     = useRef(false);
  const questionExpiredRef  = useRef(false);

  // Reset expiration flags
  useEffect(() => {
    if (isQuizActive) totalExpiredRef.current = false;
  }, [isQuizActive]);

  useEffect(() => {
    questionExpiredRef.current = false;                       // ← reset on every navigate
  }, [currentQuestionIndex]);

  /* ── Single Interval ──────────────────────────────────────── */

  useEffect(() => {
    const anyTimerEnabled = config.timerEnabled || config.questionTimerEnabled;

    if (!isQuizActive || !anyTimerEnabled || isPaused) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    intervalRef.current = setInterval(() => {
      dispatch({ type: A.TICK });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isQuizActive, config.timerEnabled, config.questionTimerEnabled, isPaused, dispatch]);

  /* ── Total Timer Expiration ───────────────────────────────── */

  useEffect(() => {
    if (
      timeRemaining === 0 &&
      isQuizActive &&
      config.timerEnabled &&
      !totalExpiredRef.current
    ) {
      totalExpiredRef.current = true;
      onTotalTimeExpired();
    }
  }, [timeRemaining, isQuizActive, config.timerEnabled, onTotalTimeExpired]);

  /* ── Question Timer Expiration ────────────────────────────── */

  useEffect(() => {
    if (
      questionTimeRemaining === 0 &&
      isQuizActive &&
      config.questionTimerEnabled &&
      !questionExpiredRef.current
    ) {
      questionExpiredRef.current = true;
      onQuestionTimeExpired();
    }
  }, [questionTimeRemaining, isQuizActive, config.questionTimerEnabled, onQuestionTimeExpired]);
}