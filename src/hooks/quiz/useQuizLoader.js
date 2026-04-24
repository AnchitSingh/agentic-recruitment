import { useCallback } from 'react';
import toast from 'react-hot-toast';
import examBuddyAPI from '../../services/api';
import { normalizeQuizData, validateNormalizedQuiz } from '../../utils/dataNormalizer';
import { validateQuiz } from '../../utils/schema';
import { A } from './quizReducer';
import { DEFAULT_TIMER } from './constants';

function validateAndNormalize(rawQuiz, label = 'Quiz') {
  if (!validateQuiz(rawQuiz)) {
    throw new Error(`${label} failed schema validation. Please try again.`);
  }
  const normalized = normalizeQuizData(rawQuiz);
  const result     = validateNormalizedQuiz(normalized);
  if (!result.valid) {
    throw new Error(`${label} normalization failed: ${result.error}`);
  }
  return normalized;
}

export default function useQuizLoader(dispatch, quizIdRef, isMountedRef) {

  const loadPreGeneratedQuiz = useCallback(async (quizData, restoreFromQuizId = null) => {
    console.log('loadPreGeneratedQuiz called with:', { quizData: !!quizData, restoreFromQuizId });
    try {
      const quiz = validateAndNormalize(quizData, 'Pre-generated quiz');

      // Try to restore progress from localStorage if requested
      let restoredState = null;
      if (restoreFromQuizId) {
        try {
          const localStorageKey = `quiz_progress_${restoreFromQuizId}`;
          const savedState = localStorage.getItem(localStorageKey);
          console.log('Looking for localStorage key:', localStorageKey);
          console.log('Found savedState:', savedState ? 'YES' : 'NO');
          
          if (savedState) {
            restoredState = JSON.parse(savedState);
            console.log('Restored quiz state from localStorage:', restoreFromQuizId);
            console.log('Restored state details:', {
              currentQuestionIndex: restoredState.currentQuestionIndex,
              userAnswersCount: restoredState.userAnswers?.length || 0,
              timeRemaining: restoredState.timeRemaining
            });
          } else {
            console.log('No saved state found in localStorage for:', restoreFromQuizId);
          }
        } catch (err) {
          console.warn('Could not restore progress from localStorage, starting fresh:', err);
        }
      }

      // If we have restored state, use QUIZ_RESUMED
      if (restoredState) {
        dispatch({
          type: A.QUIZ_RESUMED,
          payload: {
            quiz,
            config: quiz.config,
            currentQuestionIndex: restoredState.currentQuestionIndex || 0,
            userAnswers: restoredState.userAnswers || [],
            timeRemaining: restoredState.timeRemaining || quiz.timeLimit || quiz.config?.totalTimer || DEFAULT_TIMER,
            bookmarkedQuestions: restoredState.bookmarkedQuestions || [],
          },
        });
        quizIdRef.current = restoreFromQuizId;
        // Clear the localStorage entry after successful restore
        localStorage.removeItem(`quiz_progress_${restoreFromQuizId}`);
        toast.success('Quiz resumed!');
      } else {
        // Fresh start
        dispatch({
          type: A.QUIZ_INITIALIZED,
          payload: {
            quiz,
            config: quiz.config,
            timeRemaining: quiz.timeLimit || quiz.config?.totalTimer || DEFAULT_TIMER,
          },
        });
        quizIdRef.current = quiz.id;
        toast.success('Quiz ready!');
      }

      examBuddyAPI.registerQuiz(quiz).catch(err => {
        console.error('API registration failed:', err);
      });
    } catch (err) {
      console.error('Error loading pre-generated quiz:', err);
      dispatch({ type: A.SET_ERROR, payload: err.message });
    }
  }, [dispatch, quizIdRef]);

  const loadExistingQuiz = useCallback(async (quizId) => {
    if (!quizId) {
      dispatch({ type: A.SET_ERROR, payload: 'No quiz ID provided' });
      return;
    }

    try {
      dispatch({ type: A.SET_LOADING, payload: true });

      const response = await examBuddyAPI.getActiveQuiz(quizId);
      if (!isMountedRef.current) return;
      if (!response?.success) throw new Error(response?.error || 'Failed to load quiz');

      const saved = response.data;
      const quiz  = validateAndNormalize(saved, 'Loaded quiz');

      await examBuddyAPI.registerQuiz(quiz);

      dispatch({
        type: A.QUIZ_RESUMED,
        payload: {
          quiz,
          config:              quiz.config,
          currentQuestionIndex: saved.currentQuestionIndex || 0,
          userAnswers:          saved.userAnswers || [],
          timeRemaining:        saved.timeRemaining || quiz.config?.totalTimer || DEFAULT_TIMER,
          bookmarkedQuestions:  saved.bookmarkedQuestions || [],
        },
      });

      quizIdRef.current = quizId;
      await examBuddyAPI.removePausedQuiz(quizId);
      toast.success('Quiz loaded successfully');
    } catch (err) {
      console.error('Error loading quiz:', err);
      if (isMountedRef.current) {
        dispatch({ type: A.SET_ERROR, payload: err.message });
        toast.error(err.message || 'Failed to load quiz');
      }
    }
  }, [dispatch, quizIdRef, isMountedRef]);

  const generateQuiz = useCallback(async (quizConfig) => {
    if (!quizConfig || (!quizConfig.questions && !quizConfig.topic)) {
      const msg = 'Invalid quiz configuration: missing questions or topic';
      dispatch({ type: A.SET_ERROR, payload: msg });
      toast.error(msg);
      return;
    }

    try {
      dispatch({ type: A.SET_LOADING, payload: true });

      const response =
        Array.isArray(quizConfig.questions) && quizConfig.questions.length > 0
          ? await examBuddyAPI.createPracticeQuiz(quizConfig)
          : await examBuddyAPI.generateQuiz(quizConfig);

      if (!isMountedRef.current) return;
      if (!response?.success) throw new Error(response?.error || 'Failed to generate quiz');

      const quiz = validateAndNormalize(response.data, 'Generated quiz');

      dispatch({
        type: A.QUIZ_INITIALIZED,
        payload: {
          quiz,
          config:        quiz.config,
          timeRemaining: quiz.timeLimit || quiz.config?.totalTimer || quizConfig.totalTimer || DEFAULT_TIMER,
        },
      });

      quizIdRef.current = quiz.id;
      toast.success('Quiz started successfully');
    } catch (err) {
      console.error('Error generating quiz:', err);
      if (isMountedRef.current) {
        dispatch({ type: A.SET_ERROR, payload: err.message });
        toast.error(err.message || 'Failed to generate quiz');
      }
    }
  }, [dispatch, quizIdRef, isMountedRef]);

  return { loadPreGeneratedQuiz, loadExistingQuiz, generateQuiz };
}