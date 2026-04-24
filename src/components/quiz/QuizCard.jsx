import React from 'react';
import Badge from '../ui/Badge';
import { cn } from '../../utils/designTokens';

const QuizCard = ({ quiz, onStartQuiz, variant = 'catalog' }) => {
  const handleCardClick = () => {
    if (onStartQuiz && quiz.slug) {
      onStartQuiz(quiz.slug);
    }
  };

  if (variant === 'suggestion') {
    return (
      <div className="group rounded-xl border border-slate-100 bg-white p-4 hover:border-amber-200 hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
          {quiz.category && <Badge size="xs" variant="default">{quiz.category}</Badge>}
          {quiz.subject && <Badge size="xs" variant="info">{quiz.subject}</Badge>}
        </div>
        <h3
          className="font-semibold text-slate-800 text-sm leading-snug min-h-[2.5rem]
                     line-clamp-2 group-hover:text-amber-700 transition-colors"
        >
          {quiz.title}
        </h3>
        <p className="text-xs text-slate-500 mt-1 mb-3 flex items-center gap-2">
          <span>{quiz.questionCount} questions</span>
          <span className="text-slate-300">·</span>
          <span>{quiz.timeLimit} min</span>
        </p>
        <button
          size="sm"
          className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
          onClick={handleCardClick}
        >
          Start Quiz
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleCardClick}
      className="group text-left rounded-xl border border-slate-100 bg-white p-4
                 hover:border-amber-200 hover:shadow-md transition-all duration-200
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        {quiz.category && <Badge size="xs" variant="default">{quiz.category}</Badge>}
        {quiz.difficulty && (
          <span
            className={cn(
              'text-[11px] font-medium capitalize px-1.5 py-0.5 rounded',
              quiz.difficulty === 'easy' && 'bg-green-50 text-green-600',
              quiz.difficulty === 'medium' && 'bg-amber-50 text-amber-600',
              quiz.difficulty === 'hard' && 'bg-red-50 text-red-600',
            )}
          >
            {quiz.difficulty}
          </span>
        )}
      </div>

      <h3
        className="font-semibold text-slate-800 text-sm leading-snug mb-1.5 line-clamp-2
                   min-h-[2.5rem] group-hover:text-amber-700 transition-colors"
      >
        {quiz.title}
      </h3>

      {quiz.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2 min-h-[2rem]">{quiz.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-50">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {quiz.questionCount} Qs
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {quiz.timeLimit} min
        </span>
      </div>
    </button>
  );
};

export default QuizCard;
