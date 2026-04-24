/**
 * useQuizState — main orchestrator hook.
 *
 * MCQ-only. No answerRef, no drafts, no AI evaluation.
 *
 * Composition order (no circular deps):
 *   1. useQuizLoader      (standalone)
 *   2. useQuizBookmarks   (standalone)
 *   3. useQuizAnswers     (receives batchAutoBookmark)
 *   4. useQuizNavigation  (standalone — MCQ answers are instant)
 *   5. useQuizTimer       (receives handleTimeExpired)
 */

import { useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import examBuddyAPI from '../../services/api';
import { quizReducer, createInitialState, A } from './quizReducer';
import { calculateProgress, calculateScore } from './utils';
import useQuizLoader     from './useQuizLoader';
import useQuizTimer      from './useQuizTimer';
import useQuizBookmarks  from './useQuizBookmarks';
import useQuizAnswers    from './useQuizAnswers';
import useQuizNavigation from './useQuizNavigation';

export default function useQuizState(quizConfig = null) {
  const [state, dispatch] = useReducer(quizReducer, quizConfig, createInitialState);

  /* ── Stable Refs ── */

  const quizIdRef     = useRef(null);
  const isMountedRef  = useRef(true);
  const stateRef      = useRef(state);
  const initCalledRef = useRef(false);

  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  /* ── 1. Loader ── */

  const loader = useQuizLoader(dispatch, quizIdRef, isMountedRef);

  /* ── 2. Bookmarks ── */

  const {
    toggleBookmark: toggleBookmarkRaw,
    batchAutoBookmark,
  } = useQuizBookmarks(dispatch, isMountedRef);

  /* ── 3. Answers ── */

  const { selectAnswer, stopQuiz } = useQuizAnswers(
    state, dispatch, quizIdRef, isMountedRef, batchAutoBookmark,
  );

  /* ── 4. Navigation ── */

  const {
    currentQuestion,
    currentQuestionIndex,
    currentQuestionNumber,
    isLastQuestion,
    nextQuestion,
    previousQuestion,
    goToQuestion,
  } = useQuizNavigation(state, dispatch);

  /* ── 5. Timer ── */

  const handleTimeExpired = useCallback(() => {
    if (!isMountedRef.current) return;
    stopQuiz().then(results => {
      if (results) toast.success("Time's up! Quiz submitted automatically.");
    });
  }, [stopQuiz]);

  const handleQuestionTimeExpired = useCallback(() => {      // ← NEW
    if (!isMountedRef.current) return;
    const s = stateRef.current;

    // Last question → submit entire quiz
    if (s.currentQuestionIndex >= (s.quiz?.questions?.length || 0) - 1) {
      stopQuiz().then(results => {
        if (results) toast.success("Time's up! Quiz submitted automatically.");
      });
      return;
    }

    // Otherwise → auto-advance
    toast('⏱️ Time expired for this question', { icon: '⏭️' });
    dispatch({
      type: A.SET_QUESTION_INDEX,
      payload: s.currentQuestionIndex + 1,
    });
  }, [stopQuiz, dispatch]);

  useQuizTimer(state, dispatch, handleTimeExpired, handleQuestionTimeExpired);

  /* ── Initialization (once) ── */

  useEffect(() => {
    if (!quizConfig || initCalledRef.current) return;
    initCalledRef.current = true;

    console.log('useQuizState - Initializing with config:', {
      hasQuizData: !!quizConfig.quizData,
      hasQuizId: !!quizConfig.quizId,
      hasQuestions: !!quizConfig.questions,
      hasTopic: !!quizConfig.topic,
      restoreFromQuizId: quizConfig.restoreFromQuizId
    });

    if (quizConfig.quizData) {
      loader.loadPreGeneratedQuiz(quizConfig.quizData, quizConfig.restoreFromQuizId);
    }
    else if (quizConfig.quizId)                         loader.loadExistingQuiz(quizConfig.quizId);
    else if (quizConfig.questions || quizConfig.topic)  loader.generateQuiz(quizConfig);
  }, [quizConfig, loader]);

  /* ── Pause / Resume ── */

  const pauseQuiz = useCallback(async () => {
    try {
      dispatch({ type: A.SET_PAUSED, payload: true });

      const s     = stateRef.current;
      const score = calculateScore(s.userAnswers);

      const snapshot = {
        quizId:               quizIdRef.current,
        id:                   quizIdRef.current,
        slug:                 s.quiz?.slug || null, // Save slug for backend quizzes
        source:               s.quiz?.source || 'local', // Track if backend or local
        title:                s.quiz?.title   || 'Quiz',
        subject:              s.quiz?.subject || 'General',
        questions:            s.quiz?.questions || [],
        totalQuestions:       s.quiz?.questions?.length || 0,
        progress:            Math.round(calculateProgress(s.userAnswers, s.quiz?.questions?.length || 0)),
        currentQuestion:     s.currentQuestionIndex + 1,
        difficulty:          s.config.difficulty || 'medium',
        score,
        currentQuestionIndex: s.currentQuestionIndex,
        userAnswers:          s.userAnswers,
        timeRemaining:        s.timeRemaining,
        bookmarkedQuestions:  Array.from(s.bookmarkedQuestions),
        config:               s.config,
        pausedAt:             new Date().toISOString(),
      };

      // Save to localStorage for query param based resume
      const localStorageKey = `quiz_progress_${quizIdRef.current}`;
      console.log('PauseQuiz - Saving to localStorage key:', localStorageKey);
      console.log('PauseQuiz - Quiz ID:', quizIdRef.current);
      localStorage.setItem(localStorageKey, JSON.stringify(snapshot));
      console.log('PauseQuiz - Saved to localStorage successfully');

      // Also try to save via API for backward compatibility
      try {
        const res = await examBuddyAPI.saveQuizProgress(quizIdRef.current, snapshot);
        if (!res?.success) throw new Error(res?.error || 'Failed to save progress');
      } catch (apiErr) {
        console.warn('API save failed, but localStorage save succeeded:', apiErr);
        // Don't throw error - localStorage is sufficient for resume functionality
      }
    } catch (err) {
      console.error('Error pausing quiz:', err);
      if (isMountedRef.current) {
        dispatch({ type: A.SET_ERROR, payload: err.message });
        toast.error(err.message || 'Failed to save quiz progress');
      }
    }
  }, [dispatch]);

  const resumeQuiz = useCallback(() => {
    dispatch({ type: A.SET_PAUSED,      payload: false });
    dispatch({ type: A.SET_QUIZ_ACTIVE, payload: true  });
  }, [dispatch]);

  /* ── Immediate Feedback Toggle ── */

  const toggleImmediateFeedback = useCallback(() => {
    const s        = stateRef.current;
    const newValue = !s.config.immediateFeedback;

    dispatch({ type: A.SET_CONFIG,        payload: { immediateFeedback: newValue } });

    if (!newValue) {
      dispatch({ type: A.SET_SHOW_FEEDBACK, payload: false });
      toast('Immediate feedback turned off');
    } else if (s.selectedAnswer) {
      dispatch({ type: A.SET_SHOW_FEEDBACK, payload: true });
      toast('Immediate feedback turned on');
    }
  }, [dispatch]);

  /* ── Toggle Bookmark (stable wrapper) ── */

  const toggleBookmark = useCallback(() => {
    const s = stateRef.current;
    const q = s.quiz?.questions?.[s.currentQuestionIndex];
    if (q) toggleBookmarkRaw(q, s.quiz?.title, s.bookmarkedQuestions);
  }, [toggleBookmarkRaw]);

  /* ── Derived State ── */

  const progress = useMemo(
    () => calculateProgress(state.userAnswers, state.quiz?.questions?.length || 0),
    [state.userAnswers, state.quiz],
  );

  const isBookmarked = currentQuestion
    ? state.bookmarkedQuestions.has(currentQuestion.id)
    : false;

  /* ── Public API ── */

  return {
    // State
    quiz:                  state.quiz,
    config:                state.config,
    currentQuestion,
    currentQuestionIndex,
    currentQuestionNumber,
    timeRemaining:         state.timeRemaining,
    questionTimeRemaining: state.questionTimeRemaining,      // ← NEW
    isQuizActive:          state.isQuizActive,
    isPaused:              state.isPaused,
    isLoading:             state.isLoading,
    error:                 state.error,
    showFeedback:          state.showFeedback,
    selectedAnswer:        state.selectedAnswer,
    userAnswers:           state.userAnswers,
    bookmarkedQuestions:   state.bookmarkedQuestions,
    isLastQuestion,
    progress,
    isBookmarked,
    isSubmitting:          state.isSubmitting,

    // Actions
    initializeQuiz:          loader.generateQuiz,
    loadExistingQuiz:        loader.loadExistingQuiz,
    selectAnswer,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    toggleBookmark,
    pauseQuiz,
    resumeQuiz,
    stopQuiz,
    toggleImmediateFeedback,
    clearError: useCallback(() => dispatch({ type: A.CLEAR_ERROR }), [dispatch]),
  };
}