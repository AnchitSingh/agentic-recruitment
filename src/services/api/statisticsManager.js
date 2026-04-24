import { TIME_RANGES, QUESTION_TYPE_BREAKDOWN_KEYS } from './constants';
import { createSuccessResponse, createErrorResponse, normalizeQuestionTypeForBreakdown } from './helpers';
import { getTopicPerformance } from './topicTracker';

export async function getGlobalStats(timeRange = 'all') {
    await this._loadData();

    try {
        const completedQuizzes = getCompletedQuizzes.call(this, timeRange);
        const overallStats = calculateOverallStats(completedQuizzes);
        const streakInfo = getStreakInfo.call(this);
        const questionTypesBreakdown = getQuestionTypeBreakdown.call(this);
        const topicPerformance = getTopicPerformance(this.topicAttempts);

        const stats = {
            ...overallStats,
            activeStreak: streakInfo.activeStreak,
            longestStreak: streakInfo.longestStreak,
            questionTypesBreakdown,
            topicPerformance,
            lastActive: streakInfo.lastActive,
        };

        return createSuccessResponse(stats);
    } catch (error) {
        console.error('Error getting global stats:', error);
        return createErrorResponse(error);
    }
}

export async function getQuizRecommendations() {
    try {
        return createSuccessResponse({
            recommendations: [
                {
                    topic: 'General Study',
                    reason: 'AI is unavailable, using general recommendations',
                    suggested_count: 3,
                    types: ['MCQ'],
                },
            ],
        });
    } catch (error) {
        console.error('AI Recommendations Error:', error);
        return createErrorResponse(error);
    }
}

// --- Internal helpers (not exported) ---

function getCompletedQuizzes(timeRange) {
    const allCompleted = Array.from(this.quizProgress.values()).filter((q) => q.completed);

    if (timeRange === 'all') return allCompleted;

    const cutoffDate = getCutoffDate(timeRange);
    if (!cutoffDate) return allCompleted;

    return allCompleted.filter((q) => new Date(q.completedAt) >= cutoffDate);
}

function getCutoffDate(timeRange) {
    const now = new Date();
    if (timeRange === '7d') return new Date(now.getTime() - TIME_RANGES.SEVEN_DAYS);
    if (timeRange === '30d') return new Date(now.getTime() - TIME_RANGES.THIRTY_DAYS);
    return null;
}

function calculateOverallStats(quizzes) {
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalTime = 0;

    for (const quiz of quizzes) {
        totalQuestions += quiz.answers.length;
        totalCorrect += quiz.answers.filter((a) => a?.isCorrect).length;
        totalTime += quiz.timeSpent || 0;
    }

    return {
        totalQuizzes: quizzes.length,
        totalQuestions,
        overallAccuracy: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
        totalTimeSpent: totalTime,
    };
}

function getStreakInfo() {
    const completedQuizzes = Array.from(this.quizProgress.values())
        .filter((q) => q.completed)
        .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));

    if (completedQuizzes.length === 0) {
        return { activeStreak: 0, longestStreak: 0, lastActive: null };
    }

    const { currentStreak, maxStreak } = calculateStreaks(completedQuizzes);
    const activeStreak = calculateActiveStreak(completedQuizzes);

    return {
        activeStreak,
        longestStreak: Math.max(maxStreak, currentStreak),
        lastActive: completedQuizzes[completedQuizzes.length - 1].completedAt,
    };
}

function normalizeDate(date) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
}

function calculateStreaks(completedQuizzes) {
    let currentStreak = 1;
    let maxStreak = 1;
    let lastDate = normalizeDate(new Date(completedQuizzes[0].completedAt));

    for (let i = 1; i < completedQuizzes.length; i++) {
        const quizDate = normalizeDate(new Date(completedQuizzes[i].completedAt));
        const diffDays = Math.floor((quizDate - lastDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            currentStreak++;
        } else if (diffDays > 1) {
            maxStreak = Math.max(maxStreak, currentStreak);
            currentStreak = 1;
        }
        lastDate = quizDate;
    }

    return { currentStreak, maxStreak };
}

function calculateActiveStreak(completedQuizzes) {
    const today = normalizeDate(new Date());
    const lastQuizDate = normalizeDate(
        new Date(completedQuizzes[completedQuizzes.length - 1].completedAt)
    );

    const daysSinceLast = Math.floor((today - lastQuizDate) / (1000 * 60 * 60 * 24));
    if (daysSinceLast > 1) return 0;

    let activeStreak = 0;
    let checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - (daysSinceLast === 1 ? 1 : 0));

    for (let i = completedQuizzes.length - 1; i >= 0; i--) {
        const quizDate = normalizeDate(new Date(completedQuizzes[i].completedAt));

        if (quizDate.getTime() === checkDate.getTime()) {
            activeStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else if (quizDate.getTime() < checkDate.getTime()) {
            const prevDay = new Date(checkDate);
            prevDay.setDate(prevDay.getDate() - 1);

            if (quizDate.getTime() === prevDay.getTime()) {
                activeStreak++;
                checkDate = prevDay;
            } else {
                break;
            }
        }
    }

    return activeStreak;
}

function getQuestionTypeBreakdown() {
    const completedQuizzes = Array.from(this.quizProgress.values()).filter((q) => q.completed);

    const typeData = Object.fromEntries(
        Object.values(QUESTION_TYPE_BREAKDOWN_KEYS).map((key) => [key, { count: 0, correct: 0 }])
    );

    for (const quiz of completedQuizzes) {
        if (!quiz.answers) continue;

        for (const answer of quiz.answers) {
            if (!answer?.questionType) continue;

            const normalizedType = normalizeQuestionTypeForBreakdown(answer.questionType);
            if (normalizedType && typeData[normalizedType]) {
                typeData[normalizedType].count += 1;
                if (answer.isCorrect) {
                    typeData[normalizedType].correct += 1;
                }
            }
        }
    }

    const result = {};
    for (const [type, data] of Object.entries(typeData)) {
        result[type] = {
            count: data.count,
            accuracy: data.count > 0 ? (data.correct / data.count) * 100 : 0,
        };
    }

    return result;
}