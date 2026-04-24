import { DEFAULT_CONFIG, DEFAULT_TIMER, CONFIG_KEYS } from './constants';
import { resolveAnswerDisplay } from './utils';

/* ─── Action Types ────────────────────────────────────────────── */

export const A = Object.freeze({
  SET_LOADING:         'SET_LOADING',
  SET_ERROR:           'SET_ERROR',
  CLEAR_ERROR:         'CLEAR_ERROR',

  QUIZ_INITIALIZED:    'QUIZ_INITIALIZED',
  QUIZ_RESUMED:        'QUIZ_RESUMED',
  SET_QUIZ_ACTIVE:     'SET_QUIZ_ACTIVE',
  SET_PAUSED:          'SET_PAUSED',

  SET_QUESTION_INDEX:  'SET_QUESTION_INDEX',

  SET_ANSWER:          'SET_ANSWER',
  SET_SELECTED_ANSWER: 'SET_SELECTED_ANSWER',
  SET_SHOW_FEEDBACK:   'SET_SHOW_FEEDBACK',

  SET_TIME_REMAINING:  'SET_TIME_REMAINING',

  TICK:                'TICK',                               // ← renamed from TICK_TIMER

  SET_BOOKMARKS:       'SET_BOOKMARKS',
  ADD_BOOKMARK:        'ADD_BOOKMARK',
  REMOVE_BOOKMARK:     'REMOVE_BOOKMARK',

  SET_SUBMITTING:      'SET_SUBMITTING',
  SET_CONFIG:          'SET_CONFIG',
});

/* ─── Initial State Factory ───────────────────────────────────── */

function extractConfig(raw) {
  if (!raw) return { ...DEFAULT_CONFIG };
  const overrides = {};
  for (const key of CONFIG_KEYS) {
    if (raw[key] !== undefined) overrides[key] = raw[key];
  }
  return { ...DEFAULT_CONFIG, ...overrides };
}

/** Returns the initial question timer value (or 0 if disabled). */
function freshQuestionTime(config) {
  return config.questionTimerEnabled ? (config.questionTimer || 60) : 0;
}

export function createInitialState(quizConfig) {
  const config = extractConfig(quizConfig);
  return {
    quiz:                  null,
    config,
    currentQuestionIndex:  0,
    userAnswers:           [],
    timeRemaining:         config.timerEnabled ? (config.totalTimer || DEFAULT_TIMER) : 0,
    questionTimeRemaining: freshQuestionTime(config),        // ← NEW
    isQuizActive:          false,
    isPaused:              false,
    isLoading:             true,
    error:                 null,
    bookmarkedQuestions:   new Set(),
    showFeedback:          false,
    selectedAnswer:        null,
    isSubmitting:          false,
  };
}

/* ─── Reducer ─────────────────────────────────────────────────── */

export function quizReducer(state, action) {
  const { type, payload } = action;

  switch (type) {

    /* ── Loading ── */

    case A.SET_LOADING:
      if (state.isLoading === payload) return state;
      return { ...state, isLoading: payload };

    case A.SET_ERROR:
      return { ...state, error: payload, isLoading: false };

    case A.CLEAR_ERROR:
      if (state.error === null) return state;
      return { ...state, error: null };

    /* ── Quiz Lifecycle ── */

    case A.QUIZ_INITIALIZED: {
      const { quiz, config, timeRemaining } = payload;
      const mergedConfig = { ...state.config, ...config };
      return {
        ...state,
        quiz,
        config:                mergedConfig,
        userAnswers:           new Array(quiz.questions.length).fill(null),
        timeRemaining:         timeRemaining || mergedConfig.totalTimer || DEFAULT_TIMER,
        questionTimeRemaining: freshQuestionTime(mergedConfig),  // ← NEW
        currentQuestionIndex:  0,
        isQuizActive:          true,
        isLoading:             false,
        error:                 null,
        selectedAnswer:        null,
        showFeedback:          false,
      };
    }

    case A.QUIZ_RESUMED: {
      const {
        quiz, config, currentQuestionIndex = 0,
        userAnswers = [], timeRemaining,
        bookmarkedQuestions,
      } = payload;

      const mergedConfig = { ...state.config, ...config };

      const next = {
        ...state,
        quiz,
        config:                mergedConfig,
        currentQuestionIndex,
        userAnswers:           Array.isArray(userAnswers) ? userAnswers : [],
        timeRemaining:         timeRemaining || mergedConfig.totalTimer || DEFAULT_TIMER,
        questionTimeRemaining: freshQuestionTime(mergedConfig),  // ← fresh on resume
        bookmarkedQuestions:   bookmarkedQuestions instanceof Set
          ? bookmarkedQuestions
          : new Set(Array.isArray(bookmarkedQuestions) ? bookmarkedQuestions : []),
        isQuizActive:          true,
        isPaused:              false,
        isLoading:             false,
        error:                 null,
      };

      const display        = resolveAnswerDisplay(next, currentQuestionIndex);
      next.selectedAnswer  = display.selectedAnswer;
      next.showFeedback    = display.showFeedback;
      return next;
    }

    case A.SET_QUIZ_ACTIVE:
      if (state.isQuizActive === payload) return state;
      return {
        ...state,
        isQuizActive: payload,
        ...(payload ? { isPaused: false } : {}),
      };

    case A.SET_PAUSED:
      return {
        ...state,
        isPaused: payload,
        ...(payload ? { isQuizActive: false } : {}),
      };

    /* ── Navigation ── */

    case A.SET_QUESTION_INDEX: {
      if (payload === state.currentQuestionIndex) return state;
      const display = resolveAnswerDisplay(state, payload);
      return {
        ...state,
        currentQuestionIndex:  payload,
        selectedAnswer:        display.selectedAnswer,
        showFeedback:          display.showFeedback,
        questionTimeRemaining: freshQuestionTime(state.config),  // ← reset on navigate
      };
    }

    /* ── Answers ── */

    case A.SET_ANSWER: {
      const { index, answer } = payload;
      const newAnswers  = [...state.userAnswers];
      newAnswers[index] = answer;
      return { ...state, userAnswers: newAnswers };
    }

    case A.SET_SELECTED_ANSWER:
      return { ...state, selectedAnswer: payload };

    case A.SET_SHOW_FEEDBACK:
      if (state.showFeedback === payload) return state;
      return { ...state, showFeedback: payload };

    /* ── Timer ── */

    case A.SET_TIME_REMAINING:
      return { ...state, timeRemaining: payload };

    case A.TICK: {                                           // ← unified tick
      let next          = state;
      let changed       = false;

      // Total timer
      if (state.config.timerEnabled && state.timeRemaining > 0) {
        next    = { ...next, timeRemaining: state.timeRemaining - 1 };
        changed = true;
      }

      // Question timer — only ticks if question is unanswered
      if (
        state.config.questionTimerEnabled &&
        state.questionTimeRemaining > 0 &&
        !state.userAnswers[state.currentQuestionIndex]
      ) {
        next    = changed ? next : { ...next };
        next.questionTimeRemaining = state.questionTimeRemaining - 1;
        changed = true;
      }

      return changed ? next : state;
    }

    /* ── Bookmarks ── */

    case A.SET_BOOKMARKS:
      return { ...state, bookmarkedQuestions: payload };

    case A.ADD_BOOKMARK: {
      if (state.bookmarkedQuestions.has(payload)) return state;
      const s = new Set(state.bookmarkedQuestions);
      s.add(payload);
      return { ...state, bookmarkedQuestions: s };
    }

    case A.REMOVE_BOOKMARK: {
      if (!state.bookmarkedQuestions.has(payload)) return state;
      const s = new Set(state.bookmarkedQuestions);
      s.delete(payload);
      return { ...state, bookmarkedQuestions: s };
    }

    /* ── Submission ── */

    case A.SET_SUBMITTING:
      if (state.isSubmitting === payload) return state;
      return { ...state, isSubmitting: payload };

    /* ── Config ── */

    case A.SET_CONFIG:
      return { ...state, config: { ...state.config, ...payload } };

    default:
      return state;
  }
}