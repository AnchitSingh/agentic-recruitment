import { generateId } from '../../utils/helpers';
import { STORAGE_KEYS } from './constants';
import { createSuccessResponse, createErrorResponse } from './helpers';

export async function addBookmark(questionId, bookmarkData) {
    await this._loadData();

    try {
        const bookmark = {
            id: generateId('bookmark'),
            questionId,
            ...bookmarkData,
            createdAt: new Date().toISOString(),
        };

        this.bookmarks.set(questionId, bookmark);
        await this._saveToStorage(STORAGE_KEYS.BOOKMARKS, this.bookmarks);

        return createSuccessResponse(bookmark);
    } catch (error) {
        return createErrorResponse(error);
    }
}

export async function removeBookmark(questionId) {
    await this._loadData();

    try {
        const removed = this.bookmarks.delete(questionId);
        await this._saveToStorage(STORAGE_KEYS.BOOKMARKS, this.bookmarks);
        return createSuccessResponse({ removed });
    } catch (error) {
        return createErrorResponse(error);
    }
}

export async function getBookmarks() {
    await this._loadData();
    return createSuccessResponse(Array.from(this.bookmarks.values()));
}