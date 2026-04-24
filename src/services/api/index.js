import storage from '../../utils/storage';
import { STORAGE_KEYS } from './constants';

// Import all module methods
import {
    createPracticeQuiz,
    registerQuiz,
    getActiveQuiz,
    saveQuizProgress,
    completeQuiz,
    getQuizResults,
    removePausedQuiz,
    getPausedQuizzes,
} from './quizManager';

import { submitAnswer } from './answerEvaluator';
import { addBookmark, removeBookmark, getBookmarks } from './bookmarkManager';
import { trackTopicPerformance } from './topicTracker';
import { getGlobalStats, getQuizRecommendations } from './statisticsManager';
import { getUserProfile } from './userProfile';
import { getDebugInfo, clearDebugData } from './debugUtils';

class ExamBuddyAPI {
    constructor() {
        this.isProduction = true;
        this._isDataLoaded = false;
        this._initializeDataStores();
        // ┌─── ADD THIS ──────────────────────────────────────┐
        // │ Invalidate in-memory cache when sync completes    │
        // │ so next _loadData() reads fresh merged data       │
        // └───────────────────────────────────────────────────┘
        if (typeof window !== 'undefined') {
        window.addEventListener('storage-synced', () => {
            this._isDataLoaded = false;
        });
    }
    }

    // --- Core infrastructure ---

    _initializeDataStores() {
        this.activeQuizzes = new Map();
        this.quizProgress = new Map();
        this.evaluationHistory = new Map();
        this.studyAnalytics = new Map();
        this.bookmarks = new Map();
        this.pausedQuizzes = new Map();
        this.topicAttempts = new Map();
        this.completedQuizzes = new Map();
    }

    async _loadData() {
        if (this._isDataLoaded) return;

        try {
            // Add a timeout to prevent hanging during sync initialization
            const storagePromise = Promise.all([
                storage.get(STORAGE_KEYS.ACTIVE_QUIZZES, []),
                storage.get(STORAGE_KEYS.QUIZ_PROGRESS, []),
                storage.get(STORAGE_KEYS.EVALUATION_HISTORY, []),
                storage.get(STORAGE_KEYS.STUDY_ANALYTICS, []),
                storage.get(STORAGE_KEYS.BOOKMARKS, []),
                storage.get(STORAGE_KEYS.PAUSED_QUIZZES, []),
                storage.get(STORAGE_KEYS.TOPIC_ATTEMPTS, []),
                storage.get(STORAGE_KEYS.COMPLETED_QUIZZES, []),
            ]);

            // Timeout after 2 seconds to prevent infinite loading
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Storage load timeout')), 2000)
            );

            const [
                activeQuizzes,
                quizProgress,
                evaluationHistory,
                studyAnalytics,
                bookmarks,
                pausedQuizzes,
                topicAttempts,
                completedQuizzes,
            ] = await Promise.race([storagePromise, timeoutPromise]);

            this.activeQuizzes = new Map(activeQuizzes);
            this.quizProgress = new Map(quizProgress);
            this.evaluationHistory = new Map(evaluationHistory);
            this.studyAnalytics = new Map(studyAnalytics);
            this.bookmarks = new Map(bookmarks);
            this.pausedQuizzes = new Map(pausedQuizzes);
            this.topicAttempts = new Map(topicAttempts);
            this.completedQuizzes = new Map(completedQuizzes);

            this._isDataLoaded = true;
        } catch (error) {
            console.warn('[API] Storage load failed, using defaults:', error.message);
            // Set empty defaults so app can continue
            this.activeQuizzes = new Map();
            this.quizProgress = new Map();
            this.evaluationHistory = new Map();
            this.studyAnalytics = new Map();
            this.bookmarks = new Map();
            this.pausedQuizzes = new Map();
            this.topicAttempts = new Map();
            this.completedQuizzes = new Map();
            
            this._isDataLoaded = true; // Mark as loaded even on error
        }
    }

    async _saveToStorage(key, map) {
        await storage.set(key, Array.from(map.entries()));
    }
}

// --- Attach module methods to the prototype ---

const proto = ExamBuddyAPI.prototype;

// Quiz operations
proto.createPracticeQuiz = createPracticeQuiz;
proto.registerQuiz = registerQuiz;
proto.getActiveQuiz = getActiveQuiz;
proto.saveQuizProgress = saveQuizProgress;
proto.completeQuiz = completeQuiz;
proto.getQuizResults = getQuizResults;
proto.removePausedQuiz = removePausedQuiz;
proto.getPausedQuizzes = getPausedQuizzes;

// Answer evaluation
proto.submitAnswer = submitAnswer;

// Bookmarks
proto.addBookmark = addBookmark;
proto.removeBookmark = removeBookmark;
proto.getBookmarks = getBookmarks;

// Topic tracking (internal, used by completeQuiz)
proto._trackTopicPerformance = trackTopicPerformance;

// Statistics
proto.getGlobalStats = getGlobalStats;
proto.getQuizRecommendations = getQuizRecommendations;

// User profile
proto.getUserProfile = getUserProfile;

// Debug
proto.getDebugInfo = getDebugInfo;
proto.clearDebugData = clearDebugData;

// --- Singleton export ---
const examBuddyAPI = new ExamBuddyAPI();
export default examBuddyAPI;