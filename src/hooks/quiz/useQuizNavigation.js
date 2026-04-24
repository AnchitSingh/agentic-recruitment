/**
 * Question navigation — next, previous, jump-to.
 *
 * MCQ answers are saved instantly on click, so there is no
 * "save current answer" step before navigation.
 * The reducer handles answer-display restoration atomically
 * inside SET_QUESTION_INDEX.
 */

import { useCallback } from 'react';
import { A } from './quizReducer';

export default function useQuizNavigation(state, dispatch) {
  const { quiz, currentQuestionIndex } = state;

  const totalQuestions        = quiz?.questions?.length || 0;
  const currentQuestion       = quiz?.questions?.[currentQuestionIndex] || null;
  const isLastQuestion        = totalQuestions > 0 && currentQuestionIndex === totalQuestions - 1;
  const currentQuestionNumber = currentQuestionIndex + 1;

  const nextQuestion = useCallback(() => {
    if (!quiz?.questions || isLastQuestion) return;
    dispatch({ type: A.SET_QUESTION_INDEX, payload: currentQuestionIndex + 1 });
  }, [quiz, isLastQuestion, currentQuestionIndex, dispatch]);

  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex <= 0) return;
    dispatch({ type: A.SET_QUESTION_INDEX, payload: currentQuestionIndex - 1 });
  }, [currentQuestionIndex, dispatch]);

  const goToQuestion = useCallback((targetIndex) => {
    if (
      !quiz?.questions ||
      targetIndex < 0 ||
      targetIndex >= totalQuestions ||
      targetIndex === currentQuestionIndex
    ) return;
    dispatch({ type: A.SET_QUESTION_INDEX, payload: targetIndex });
  }, [quiz, totalQuestions, currentQuestionIndex, dispatch]);

  return {
    currentQuestion,
    currentQuestionIndex,
    currentQuestionNumber,
    isLastQuestion,
    nextQuestion,
    previousQuestion,
    goToQuestion,
  };
}