/**
 * Answer selection and quiz completion.
 *
 * MCQ-only — no drafts, no AI evaluation, no text answers.
 * Answers are recorded instantly on click.
 */

import { useCallback, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import examBuddyAPI from '../../services/api';
import { A } from './quizReducer';
import { buildAnswerObject, getUnbookmarkedIncorrect } from './utils';

export default function useQuizAnswers(
  state,
  dispatch,
  quizIdRef,
  isMountedRef,
  batchAutoBookmark,
) {
  const { quiz, config } = state;

  // ── Refs for stable access inside callbacks ──
  const stateRef              = useRef(state);
  const batchAutoBookmarkRef  = useRef(batchAutoBookmark);

  useEffect(() => { stateRef.current             = state; },             [state]);
  useEffect(() => { batchAutoBookmarkRef.current  = batchAutoBookmark; }, [batchAutoBookmark]);

  /* ─── Select Answer ─────────────────────────────────────────── */

  const selectAnswer = useCallback((optionIndex, isCorrect) => {
    const {
      currentQuestionIndex, timeRemaining,
      questionTimeRemaining, userAnswers, bookmarkedQuestions,
    } = stateRef.current;

    const currentQ = quiz?.questions?.[currentQuestionIndex];
    if (!currentQ) return;
    if (userAnswers[currentQuestionIndex]) return;

    // ── Calculate actual time spent on this question ──         // ← NEW
    const questionTimeSpent = config.questionTimerEnabled
      ? (config.questionTimer || 60) - questionTimeRemaining
      : 0;

    const answer = buildAnswerObject({
      question: currentQ,
      optionIndex,
      isCorrect,
      timeRemaining,
      questionTimeSpent,                                         // ← NEW
    });

    dispatch({ type: A.SET_SELECTED_ANSWER, payload: { optionIndex, isCorrect } });
    dispatch({ type: A.SET_ANSWER,          payload: { index: currentQuestionIndex, answer } });
    dispatch({ type: A.SET_SHOW_FEEDBACK,   payload: config.immediateFeedback });

    if (!isCorrect && !bookmarkedQuestions.has(currentQ.id)) {
      batchAutoBookmarkRef.current(
        [currentQ], quiz?.title, bookmarkedQuestions,
      ).then(count => {
        if (count > 0) toast.success('Incorrect answer — question auto-bookmarked!');
      });
    }
  }, [quiz, config, dispatch]);

  /* ─── Stop / Complete Quiz ──────────────────────────────────── */

  const stopQuiz = useCallback(async () => {
    if (stateRef.current.isSubmitting) return null;

    try {
      dispatch({ type: A.SET_SUBMITTING,  payload: true });
      dispatch({ type: A.SET_QUIZ_ACTIVE, payload: false });

      const answers = stateRef.current.userAnswers;
      const valid   = answers.filter(a => a != null);

      const res = await examBuddyAPI.completeQuiz(quizIdRef.current, valid, quiz);
      if (!res?.success || !res.data) {
        throw new Error(res?.error || 'Failed to complete quiz');
      }

      // Batch auto-bookmark all incorrect
      const currentBookmarks   = stateRef.current.bookmarkedQuestions;
      const incorrectQuestions = getUnbookmarkedIncorrect(answers, quiz?.questions, currentBookmarks);

      if (incorrectQuestions.length > 0) {
        const count = await batchAutoBookmarkRef.current(
          incorrectQuestions.map(item => item.question),
          quiz?.title,
          currentBookmarks,
        );
        if (count > 0) {
          toast.success(`${count} incorrect question${count > 1 ? 's' : ''} auto-bookmarked!`);
        }
      }

      return { ...res.data, quiz, config: stateRef.current.config };
    } catch (err) {
      console.error('Error completing quiz:', err);
      if (isMountedRef.current) {
        dispatch({ type: A.SET_ERROR, payload: err.message });
        toast.error(err.message || 'Failed to complete quiz');
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        dispatch({ type: A.SET_SUBMITTING, payload: false });
      }
    }
  }, [quiz, dispatch, quizIdRef, isMountedRef]);

  return { selectAnswer, stopQuiz };
}