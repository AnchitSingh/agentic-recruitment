import storage from '../../utils/storage';
import { STORAGE_KEYS } from './constants';
import { createSuccessResponse, createErrorResponse } from './helpers';

export function createQuizConfig(config) {
    return {
        immediateFeedback: config.immediateFeedback,
        timerEnabled: config.timerEnabled,
        totalTimer: config.totalTimer,
        timeLimit: config.timeLimit,
        questionTimer: config.questionTimer,
        showAnswers: config.showAnswers !== false,
        allowRetake: config.allowRetake !== false,
        difficulty: config.difficulty || 'medium',
        subject: config.subject || config.topic || 'General',
        questionCount: config.questionCount || 5,
        questionTypes: config.questionTypes || ['MCQ'],
    };
}

export async function createPracticeQuiz(config) {
    await this._loadData();
    try {
        const validQuestions = config.questions || [];

        const quiz = {
            id: `practice_${Date.now()}`,
            title: config.title || 'Practice Quiz',
            subject: config.subject || 'Mixed',
            totalQuestions: validQuestions.length,
            config: createQuizConfig(config),
            questions: validQuestions,
            createdAt: new Date().toISOString(),
            timeLimit: config.totalTimer || null,
        };

        this.activeQuizzes.set(quiz.id, quiz);
        await this._saveToStorage(STORAGE_KEYS.ACTIVE_QUIZZES, this.activeQuizzes);

        return createSuccessResponse(quiz);
    } catch (error) {
        return createErrorResponse(error);
    }
}

export async function registerQuiz(quiz) {
    await this._loadData();
    if (!quiz || !quiz.id) {
        return createErrorResponse('Invalid quiz object provided for registration.');
    }
    this.activeQuizzes.set(quiz.id, quiz);
    await this._saveToStorage(STORAGE_KEYS.ACTIVE_QUIZZES, this.activeQuizzes);
    return createSuccessResponse(quiz);
}

export async function getActiveQuiz(quizId) {
    await this._loadData();
    const quiz = this.activeQuizzes.get(quizId) || this.pausedQuizzes.get(quizId);
    return quiz
        ? createSuccessResponse(quiz)
        : createErrorResponse('Quiz not found');
}

export async function saveQuizProgress(quizId, progress) {
    await this._loadData();
    if (!this.isProduction) {
        return createSuccessResponse({ saved: true });
    }

    try {
        this.pausedQuizzes.set(quizId, {
            ...progress,
            lastUpdated: new Date().toISOString(),
        });
        await this._saveToStorage(STORAGE_KEYS.PAUSED_QUIZZES, this.pausedQuizzes);

        this.activeQuizzes.delete(quizId);
        await this._saveToStorage(STORAGE_KEYS.ACTIVE_QUIZZES, this.activeQuizzes);

        return createSuccessResponse({ saved: true });
    } catch (error) {
        return createErrorResponse(error);
    }
}

export async function completeQuiz(quizId, answers, quiz) {
    await this._loadData();

    try {
        const results = calculateQuizResults(quizId, answers, quiz);

        await this._trackTopicPerformance(answers, quiz);

        this.quizProgress.set(quizId, { ...results, completed: true });
        await this._saveToStorage(STORAGE_KEYS.QUIZ_PROGRESS, this.quizProgress);

        const completedQuizzes = new Map();
        const existingCompleted = await storage.get(STORAGE_KEYS.COMPLETED_QUIZZES, []);
        if (Array.isArray(existingCompleted)) {
            existingCompleted.forEach(([key, value]) => completedQuizzes.set(key, value));
        }
        completedQuizzes.set(quizId, quiz);
        await this._saveToStorage(STORAGE_KEYS.COMPLETED_QUIZZES, completedQuizzes);

        const history = await storage.get('quiz_history', []);
        const quizEntry = {
            id: quizId,
            title: quiz.title || quiz.subject || 'Untitled Quiz',
            slug: quiz.slug,
            source: quiz.source || 'local',
            score: results.score,
            totalQuestions: results.totalQuestions,
            percentage: results.percentage,
            completedAt: results.completedAt,
            savedAt: Date.now(),
            data: quiz,
        };
        const updatedHistory = [quizEntry, ...history.filter((q) => q.id !== quizId)].slice(0, 20);
        await storage.set('quiz_history', updatedHistory);

        this.activeQuizzes.delete(quizId);
        await this._saveToStorage(STORAGE_KEYS.ACTIVE_QUIZZES, this.activeQuizzes);

        // ┌─── ADD THIS ──────────────────────────────────┐
        // │ Immediately sync critical data to Supabase    │
        // │ instead of waiting for debounce               │
        // └───────────────────────────────────────────────┘
        storage.forceSync().catch(() => {});


        return createSuccessResponse({ ...results, quiz });
    } catch (error) {
        return createErrorResponse(error);
    }
}

export function calculateQuizResults(quizId, answers, quiz) {
    const totalQuestions = quiz?.questions?.length || 0;
    const answeredQuestions = answers?.length || 0;
    const score = answers?.filter((a) => a?.isCorrect).length || 0;
    const totalScore =
        answers?.reduce((sum, a) => sum + (a?.score || (a?.isCorrect ? 1 : 0)), 0) || 0;

    return {
        quizId,
        totalQuestions,
        answeredQuestions,
        score,
        totalScore,
        percentage: totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0,
        timeSpent: 0,
        completedAt: new Date().toISOString(),
        answers: answers || [],
    };
}

export async function getQuizResults(quizId) {
    try {
        const progress = this.quizProgress.get(quizId);

        let quiz = this.activeQuizzes.get(quizId);
        if (!quiz) {
            quiz = this.completedQuizzes.get(quizId);
        }

        if (!progress || !quiz) {
            return createErrorResponse('Quiz or progress data not found');
        }

        const results = {
            quizId,
            totalQuestions: quiz.questions.length,
            answeredQuestions: Object.keys(progress.answers || {}).length,
            correctAnswers: 0,
            totalScore: 0,
            percentage: 0,
            timeSpent: progress.timeSpent || 0,
            completedAt: progress.completedAt || null,
            answers: progress.answers || {},
            feedback: [],
            quiz,
        };

        for (const answerData of Object.values(progress.answers || {})) {
            if (answerData.isCorrect === true) {
                results.correctAnswers++;
            }
            results.totalScore += answerData.score || 0;
        }

        results.percentage =
            quiz.questions.length > 0
                ? Math.round((results.correctAnswers / quiz.questions.length) * 100)
                : 0;

        return createSuccessResponse(results);
    } catch (error) {
        return createErrorResponse(error);
    }
}

export async function removePausedQuiz(quizId) {
    await this._loadData();
    try {
        const removed = this.pausedQuizzes.delete(quizId);
        await this._saveToStorage(STORAGE_KEYS.PAUSED_QUIZZES, this.pausedQuizzes);
        return createSuccessResponse({ removed });
    } catch (error) {
        return createErrorResponse(error);
    }
}

export async function getPausedQuizzes() {
    await this._loadData();
    return createSuccessResponse(Array.from(this.pausedQuizzes.values()));
}