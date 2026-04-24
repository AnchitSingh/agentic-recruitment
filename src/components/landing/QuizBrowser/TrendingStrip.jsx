import React from 'react';
import { cn } from '../../../utils/designTokens';
import { formatCount } from '../../../utils/searchHelpers';

export const TrendingStrip = ({ trendingQuizzes, onResultSelect }) => {
    // If no quizzes at all, don't show the section
    if (!trendingQuizzes || trendingQuizzes.length === 0) {
        return null;
    }

    // Check if these are actual trending quizzes or fallback recommended quizzes
    const hasActualTrending = trendingQuizzes.some(quiz => quiz.trending);

    return (
        <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <span className="text-base">{hasActualTrending ? '🔥' : '✨'}</span>
                    {hasActualTrending ? 'Trending Now' : 'Popular Quizzes'}
                </div>
                <div className="flex-1 h-px bg-slate-200/60" />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
                {trendingQuizzes.slice(0, 5).map((quiz) => (
                    <button
                        key={quiz.id}
                        onClick={() => onResultSelect({ ...quiz, type: 'quiz' })}
                        className={cn(
                            'flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl',
                            'bg-white border border-slate-200/80 shadow-sm',
                            'hover:shadow-md hover:border-amber-200 hover:-translate-y-0.5',
                            'transition-all duration-200 cursor-pointer group/trend',
                            'min-w-[240px] max-w-[300px]'
                        )}
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center text-lg flex-shrink-0 group-hover/trend:scale-110 transition-transform">
                            {quiz.categoryIcon}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <div className="font-semibold text-sm text-slate-700 truncate group-hover/trend:text-amber-600 transition-colors">
                                {quiz.title}
                            </div>
                            <div className="text-xs text-slate-400">
                                {quiz.questions} Qs · ⭐ {quiz.rating} · {formatCount(quiz.completions)}
                            </div>
                        </div>
                        <svg
                            className="w-4 h-4 text-slate-300 group-hover/trend:text-amber-500 flex-shrink-0 transition-colors"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </button>
                ))}
            </div>
        </div>
    );
};
