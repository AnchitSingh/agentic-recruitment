import {
    STORAGE_KEYS,
    MAX_HISTORY_LENGTH,
    DIFFICULTY_WEIGHTS,
    RECENCY_DECAY_FACTOR,
    MIN_RECENCY_WEIGHT,
    TREND_THRESHOLD,
    TOPIC_CATEGORIES,
} from './constants';

export async function trackTopicPerformance(answers, quiz) {
    if (!answers || !quiz?.questions) return;

    try {
        console.log('🏷️ Tracking topic performance for', answers.length, 'answers');

        for (let i = 0; i < answers.length; i++) {
            const answer = answers[i];
            const question = quiz.questions[i];
            if (!answer || !question) continue;

            const tags = question.tags || [];
            for (const tag of tags) {
                updateTopicData.call(this, tag, answer, question);
            }
        }

        await this._saveToStorage(STORAGE_KEYS.TOPIC_ATTEMPTS, this.topicAttempts);
    } catch (error) {
        console.error('Error tracking topic performance:', error);
    }
}

function updateTopicData(tag, answer, question) {
    const topicKey = tag.toLowerCase().trim();
    if (!topicKey) return;

    let topicData = this.topicAttempts.get(topicKey) || {
        attempts: 0,
        correct: 0,
        totalScore: 0,
        accuracyHistory: [],
        difficultyHistory: [],
        timestamps: [],
    };

    topicData.attempts += 1;
    if (answer.isCorrect) {
        topicData.correct += 1;
    }
    topicData.totalScore += answer.score || (answer.isCorrect ? 1 : 0);

    const accuracy = (topicData.correct / topicData.attempts) * 100;
    topicData.accuracyHistory.push({
        accuracy,
        date: new Date().toISOString(),
        isCorrect: answer.isCorrect,
    });

    if (question.difficulty) {
        topicData.difficultyHistory.push({
            difficulty: question.difficulty,
            isCorrect: answer.isCorrect,
            date: new Date().toISOString(),
        });
    }

    topicData.timestamps.push(new Date().toISOString());
    topicData = limitHistoryLength(topicData);
    this.topicAttempts.set(topicKey, topicData);
}

function limitHistoryLength(topicData) {
    return {
        ...topicData,
        accuracyHistory: topicData.accuracyHistory.slice(-MAX_HISTORY_LENGTH),
        difficultyHistory: topicData.difficultyHistory.slice(-MAX_HISTORY_LENGTH),
        timestamps: topicData.timestamps.slice(-MAX_HISTORY_LENGTH),
    };
}

export function calculateTopicWeightedScore(topicData) {
    if (!topicData || topicData.attempts === 0) return 0;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (let i = 0; i < topicData.accuracyHistory.length; i++) {
        const attempt = topicData.accuracyHistory[i];
        const weight = calculateAttemptWeight(attempt, topicData.difficultyHistory[i]);

        const attemptScore = attempt.isCorrect ? 1 : 0;
        totalWeightedScore += attemptScore * weight;
        totalWeight += weight;
    }

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
}

function calculateAttemptWeight(attempt, difficultyData) {
    let weight = 1;

    if (difficultyData?.difficulty) {
        weight *= DIFFICULTY_WEIGHTS[difficultyData.difficulty] || 1.0;
    }

    const date = new Date(attempt.date);
    const daysSince = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.max(MIN_RECENCY_WEIGHT, 1.0 - daysSince * RECENCY_DECAY_FACTOR);
    weight *= recencyFactor;

    return weight;
}

export function calculateTopicTrend(topicData) {
    if (!topicData || topicData.accuracyHistory.length < 2) {
        return 'stable';
    }

    const recentAttempts = topicData.accuracyHistory.slice(-5);
    if (recentAttempts.length < 2) return 'stable';

    const recentAccuracies = recentAttempts.map((a) => (a.isCorrect ? 1 : 0));
    const midPoint = Math.ceil(recentAccuracies.length / 2);

    const firstHalf = recentAccuracies.slice(0, midPoint);
    const secondHalf = recentAccuracies.slice(midPoint);

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (avgSecond > avgFirst + TREND_THRESHOLD) return 'improving';
    if (avgSecond < avgFirst - TREND_THRESHOLD) return 'declining';
    return 'stable';
}

export function getTopicPerformance(topicAttempts) {
    const topics = Array.from(topicAttempts.entries());

    const result = { strong: [], moderate: [], weak: [] };

    for (const [topicName, topicData] of topics) {
        const weightedScore = calculateTopicWeightedScore(topicData);
        const trend = calculateTopicTrend(topicData);
        const accuracy = (topicData.correct / topicData.attempts) * 100;

        const topicInfo = {
            name: topicName,
            accuracy,
            attempts: topicData.attempts,
            trend,
        };

        if (weightedScore >= TOPIC_CATEGORIES.STRONG) {
            result.strong.push(topicInfo);
        } else if (weightedScore >= TOPIC_CATEGORIES.MODERATE) {
            result.moderate.push(topicInfo);
        } else {
            result.weak.push(topicInfo);
        }
    }

    const sortByAccuracy = (a, b) => b.accuracy - a.accuracy;
    result.strong.sort(sortByAccuracy);
    result.moderate.sort(sortByAccuracy);
    result.weak.sort(sortByAccuracy);

    return result;
}