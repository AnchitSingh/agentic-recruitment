import { QUESTION_TYPE } from './constants';

/**
 * Build a standardised bookmark payload from a question.
 */
export function buildBookmarkData(question, quizTitle = 'Untitled Quiz') {
  const options      = Array.isArray(question.options) ? question.options : [];
  const correctIndex = options.findIndex(o => o?.isCorrect === true);

  return {
    question:       question.question    || '',
    type:           QUESTION_TYPE,
    explanation:    question.explanation  || '',
    subject:        question.subject     || 'General',
    difficulty:     question.difficulty   || 'medium',
    tags:           Array.isArray(question.tags) ? question.tags : [],
    quizTitle,
    answer:         question.answer,
    options,
    correct_answer: correctIndex >= 0 ? correctIndex : 0,
  };
}

/**
 * @param {number} questionTimeSpent — actual seconds spent on this question.
 *   Calculated by caller as: config.questionTimer − questionTimeRemaining
 *   Falls back to 0 if per-question timer is disabled.
 */
export function buildAnswerObject({
  question,
  optionIndex,
  isCorrect,
  timeRemaining      = 0,
  questionTimeSpent  = 0,                                    // ← NEW
}) {
  return {
    questionId:            question.id,
    questionType:          question.type || 'MCQ',           // ← Added for stats
    selectedOption:        typeof optionIndex === 'number' ? optionIndex : 0,
    isCorrect:             Boolean(isCorrect),
    timeSpent:             questionTimeSpent,                 // ← was hardcoded 0
    totalTimeWhenAnswered: timeRemaining,
  };
}

/**
 * Count answered (non-null) entries vs total questions.
 */
export function calculateProgress(userAnswers, totalQuestions) {
  if (!totalQuestions) return 0;
  const answered = userAnswers.filter(a => a != null).length;
  return Math.min(100, (answered / totalQuestions) * 100);
}

/**
 * Count correct vs total answered.
 */
export function calculateScore(userAnswers) {
  const answered = userAnswers.filter(a => a != null);
  return {
    correct: answered.filter(a => a.isCorrect).length,
    total:   answered.length,
  };
}

/**
 * Return incorrect answers whose questions are not yet bookmarked.
 */
export function getUnbookmarkedIncorrect(userAnswers, questions, bookmarkedSet) {
  const results = [];
  for (let i = 0; i < userAnswers.length; i++) {
    const a = userAnswers[i];
    const q = questions?.[i];
    if (a && q && !a.isCorrect && !bookmarkedSet.has(q.id)) {
      results.push({ index: i, question: q });
    }
  }
  return results;
}

/**
 * Resolve selectedAnswer + showFeedback for a given question index.
 * Called by the reducer during navigation for atomic restoration.
 */
export function resolveAnswerDisplay(state, questionIndex) {
  const existing = state.userAnswers[questionIndex];
  const question = state.quiz?.questions?.[questionIndex];

  if (!existing || !question) {
    return { selectedAnswer: null, showFeedback: false };
  }

  return {
    selectedAnswer: {
      optionIndex: existing.selectedOption,
      isCorrect:   existing.isCorrect,
    },
    showFeedback: state.config.immediateFeedback,
  };
}