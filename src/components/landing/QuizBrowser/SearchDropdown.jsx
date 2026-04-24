import React from 'react';
import { cn } from '../../../utils/designTokens';
import { formatCount, difficultyClasses, highlightText } from '../../../utils/searchHelpers';

export const SearchDropdown = ({
    onResultSelect,
    searchQuery,
    showDropdown,
    highlightedIndex,
    setHighlightedIndex,
    searchResults,
    popularSearchTerms,
    handlePopularClick,
    isModal = false
}) => {

    if (!showDropdown) return null;

    return (
        <div className={`${isModal ? 'relative top-0 left-0 right-0 mt-3' : 'absolute top-full left-0 right-0 mt-2'} z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden animate-dropdown-in`}>
            {searchQuery.trim() ? (
                searchResults.length > 0 ? (
                    <div className="py-2 max-h-[400px] overflow-y-auto overscroll-contain">
                        {searchResults.map((result, idx) => {
                            const isFirstCat =
                                result.type === 'category' &&
                                (idx === 0 || searchResults[idx - 1]?.type !== 'category');
                            const isFirstQuiz =
                                result.type === 'quiz' &&
                                (idx === 0 || searchResults[idx - 1]?.type !== 'quiz');

                            return (
                                <React.Fragment key={`${result.type}-${result.id}-${idx}`}>
                                    {isFirstCat && (
                                        <div className="px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                            Topics
                                        </div>
                                    )}
                                    {isFirstQuiz && (
                                        <div
                                            className={cn(
                                                'px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider',
                                                idx > 0 && 'border-t border-slate-100 mt-1'
                                            )}
                                        >
                                            Quizzes
                                        </div>
                                    )}

                                    <button
                                        data-result-idx={idx}
                                        onClick={() => onResultSelect(result)}
                                        onMouseEnter={() => setHighlightedIndex(idx)}
                                        className={cn(
                                            'w-full flex items-center gap-3 px-4 py-2.5 text-left',
                                            'transition-colors cursor-pointer',
                                            highlightedIndex === idx ? 'bg-amber-50' : 'hover:bg-slate-50'
                                        )}
                                    >
                                        {result.type === 'category' ? (
                                            <>
                                                <span className="text-xl w-8 text-center flex-shrink-0">
                                                    {result.icon}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-slate-800 truncate">
                                                        {highlightText(result.label, searchQuery)}
                                                    </div>
                                                    <div className="text-xs text-slate-400 truncate">
                                                        {result.description} · {result.quizCount} quizzes
                                                    </div>
                                                </div>
                                                {result.premium ? (
                                                    <span className="text-[9px] font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                                                        PRO
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
                                                        FREE
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm flex-shrink-0">
                                                    {result.categoryIcon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm text-slate-800 truncate">
                                                        {highlightText(result.title, searchQuery)}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {result.questions} Qs · {result.duration} · {result.categoryLabel}
                                                    </div>
                                                </div>
                                                <span
                                                    className={cn(
                                                        'text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0',
                                                        difficultyClasses(result.difficulty)
                                                    )}
                                                >
                                                    {result.difficulty}
                                                </span>
                                            </>
                                        )}
                                    </button>
                                </React.Fragment>
                            );
                        })}

                        {/* Footer hint */}
                        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                            <span>
                                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                            </span>
                            <div className="hidden sm:flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-200 rounded">
                                        ↑↓
                                    </kbd>{' '}
                                    navigate
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-200 rounded">
                                        ↵
                                    </kbd>{' '}
                                    select
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* No results */
                    <div className="p-8 text-center">
                        <div className="text-4xl mb-3">🔍</div>
                        <p className="text-slate-600 font-medium mb-1">
                            No results for &ldquo;{searchQuery}&rdquo;
                        </p>
                        <p className="text-sm text-slate-400 mb-4">
                            Try a different keyword or browse below
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {popularSearchTerms.slice(0, 4).map((term) => (
                                <button
                                    key={term}
                                    onClick={() => handlePopularClick(term)}
                                    className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-amber-100 hover:text-amber-700 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                >
                                    {term}
                                </button>
                            ))}
                        </div>
                    </div>
                )
            ) : (
                /* Empty-state suggestions */
                <div className="py-2">
                    <div className="px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        🔥 Popular Searches
                    </div>
                    <div className="px-4 pb-3 flex flex-wrap gap-2">
                        {popularSearchTerms.map((term) => (
                            <button
                                key={term}
                                onClick={() => handlePopularClick(term)}
                                className="px-3 py-1.5 text-sm bg-slate-50 hover:bg-amber-50 hover:text-amber-700 text-slate-600 rounded-lg transition-colors cursor-pointer border border-slate-100 hover:border-amber-200"
                            >
                                {term}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
