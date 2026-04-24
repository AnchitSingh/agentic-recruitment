export const STORAGE_KEYS = {
    ACTIVE_QUIZZES: 'activeQuizzes',
    QUIZ_PROGRESS: 'quizProgress',
    EVALUATION_HISTORY: 'evaluationHistory',
    STUDY_ANALYTICS: 'studyAnalytics',
    BOOKMARKS: 'bookmarks',
    PAUSED_QUIZZES: 'pausedQuizzes',
    TOPIC_ATTEMPTS: 'topicAttempts',
    USER_PROFILE: 'userProfile',
    COMPLETED_QUIZZES: 'completedQuizzes',
};

export const QUESTION_TYPES = {
    MCQ: 'MCQ',
    TRUE_FALSE: 'True/False',
    SHORT_ANSWER: 'Short Answer',
    FILL_IN_BLANK: 'Fill in Blank',
    SUBJECTIVE: 'Subjective',
};

export const QUESTION_TYPE_BREAKDOWN_KEYS = {
    MCQ: 'MCQ',
    TRUE_FALSE: 'TrueFalse',
    FILL_UP: 'FillUp',
    SUBJECTIVE: 'Subjective',
};

export const TOPIC_CATEGORIES = {
    STRONG: 0.7,
    MODERATE: 0.4,
};

export const MAX_HISTORY_LENGTH = 20;
export const RECENCY_DECAY_FACTOR = 0.02;
export const MIN_RECENCY_WEIGHT = 0.5;

export const DIFFICULTY_WEIGHTS = {
    hard: 1.5,
    medium: 1.2,
    easy: 1.0,
};

export const TREND_THRESHOLD = 0.1;

export const TIME_RANGES = {
    SEVEN_DAYS: 7 * 24 * 60 * 60 * 1000,
    THIRTY_DAYS: 30 * 24 * 60 * 60 * 1000,
};