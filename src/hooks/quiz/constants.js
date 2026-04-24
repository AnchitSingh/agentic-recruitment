export const QUESTION_TYPE = 'MCQ';

export const DEFAULT_TIMER          = 600;
export const DEFAULT_QUESTION_TIMER = 60;                    // ← NEW

export const DEFAULT_CONFIG = Object.freeze({
  immediateFeedback:    true,
  timerEnabled:         true,
  totalTimer:           DEFAULT_TIMER,
  questionTimerEnabled: false,                               // ← NEW
  questionTimer:        DEFAULT_QUESTION_TIMER,              // ← renamed for clarity
});

export const CONFIG_KEYS = [
  'immediateFeedback',
  'timerEnabled',
  'totalTimer',
  'questionTimerEnabled',                                    // ← NEW
  'questionTimer',
  'difficulty',
];