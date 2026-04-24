import storage from '../../utils/storage';
import { STORAGE_KEYS } from './constants';
import { createSuccessResponse } from './helpers';

export async function getDebugInfo() {
    await this._loadData();

    return createSuccessResponse({
        isProduction: this.isProduction,
        activeQuizzes: Array.from(this.activeQuizzes.keys()),
        progressEntries: Array.from(this.quizProgress.keys()),
        studyPlans: Array.from(this.studyAnalytics.keys()),
        bookmarks: Array.from(this.bookmarks.keys()),
        pausedQuizzes: Array.from(this.pausedQuizzes.keys()),
        timestamp: new Date().toISOString(),
    });
}

export async function clearDebugData() {
    this._initializeDataStores();
    this._isDataLoaded = true;

    await Promise.all(Object.values(STORAGE_KEYS).map((key) => storage.remove(key)));

    return createSuccessResponse({ cleared: true });
}