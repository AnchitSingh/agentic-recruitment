import { QUESTION_TYPE_BREAKDOWN_KEYS } from './constants';

/**
 * Creates a standardized success response
 */
export const createSuccessResponse = (data) => ({
    success: true,
    data,
    error: null,
});

/**
 * Creates a standardized error response
 */
export const createErrorResponse = (error) => ({
    success: false,
    data: null,
    error: typeof error === 'string' ? error : error.message,
});

/**
 * Normalizes question type for breakdown statistics
 */
export const normalizeQuestionTypeForBreakdown = (type) => {
    if (!type) return null;

    const cleanType = String(type).toLowerCase().replace(/[\s/_-]/g, '');

    if (cleanType.includes('mcq') || cleanType === 'mcq') {
        return QUESTION_TYPE_BREAKDOWN_KEYS.MCQ;
    }
    return QUESTION_TYPE_BREAKDOWN_KEYS.MCQ;
};

/**
 * Transforms a raw AI question to standardized format
 */
export const transformQuestion = (question, index, preserveIds = false) => {
    // placeholder — original was empty
};