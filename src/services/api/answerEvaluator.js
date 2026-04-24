import { createSuccessResponse, createErrorResponse } from './helpers';

export async function submitAnswer(quizId, questionId, answer) {
    await this._loadData();

    try {
        const quiz = this.activeQuizzes.get(quizId);
        if (!quiz) {
            return createErrorResponse(`Quiz ${quizId} not found`);
        }

        const question = quiz.questions.find((q) => q.id === questionId);
        if (!question) {
            return createErrorResponse(`Question ${questionId} not found in quiz ${quizId}`);
        }

        return evaluateObjectiveAnswer(question, answer);
    } catch (error) {
        return createErrorResponse(error);
    }
}

export function evaluateObjectiveAnswer(question, answer) {
    const isCorrect = answer === question.correctAnswer;

    const result = {
        isCorrect,
        correctAnswer: question.correctAnswer,
        feedback: {
            message: isCorrect ? 'Correct!' : 'Incorrect.',
            explanation: question.explanation || 'No explanation provided.',
        },
        explanation: question.explanation || '',
        score: isCorrect ? 1.0 : 0.0,
    };
    return createSuccessResponse(result);
}