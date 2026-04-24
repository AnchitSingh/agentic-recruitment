import React from 'react';
import { cn } from '../../../utils/designTokens';
import { useSearch } from '../../../hooks/useSearch';
import { SearchDropdown } from './SearchDropdown';

export const SearchBar = ({ onResultSelect }) => {
    const {
        searchQuery,
        showDropdown,
        placeholderIdx,
        searchContainerRef,
        searchInputRef,
        handleSearchChange,
        handleSearchFocus,
        handleSearchKeyDown,
        clearSearch,
        highlightedIndex,
        setHighlightedIndex,
        searchResults,
        popularSearchTerms,
        handlePopularClick,
    } = useSearch();

    return (
        <div className="max-w-2xl mx-auto mb-10" ref={searchContainerRef}>
            <div className="relative">
                {/* Search icon */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                    <svg
                        className={cn(
                            'w-5 h-5 transition-colors duration-200',
                            searchQuery ? 'text-amber-500' : 'text-slate-400'
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>

                <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={handleSearchFocus}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={`Search "${['Cell Biology', 'Pharmacology', 'Step 2 CK', 'Neuroanatomy', 'Pathology'][placeholderIdx]}"…`}
                    autoComplete="off"
                    className={cn(
                        'w-full pl-12 pr-14 py-4 text-base sm:text-lg rounded-2xl',
                        'bg-white border-2 border-slate-200',
                        'focus:border-amber-400 focus:ring-4 focus:ring-amber-100/80',
                        'placeholder-slate-400 text-slate-700',
                        'shadow-sm hover:shadow-md focus:shadow-md',
                        'outline-none transition-all duration-300'
                    )}
                />

                {/* Clear button or ⌘K hint */}
                {searchQuery ? (
                    <button
                        onClick={clearSearch}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                        aria-label="Clear search"
                    >
                        <svg
                            className="w-4 h-4 text-slate-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                ) : (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center pointer-events-none">
                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded">
                            ⌘K
                        </kbd>
                    </div>
                )}

                {/* Search Dropdown */}
                <SearchDropdown 
                    onResultSelect={onResultSelect}
                    searchQuery={searchQuery}
                    showDropdown={showDropdown}
                    highlightedIndex={highlightedIndex}
                    setHighlightedIndex={setHighlightedIndex}
                    searchResults={searchResults}
                    popularSearchTerms={popularSearchTerms}
                    handlePopularClick={handlePopularClick}
                />
            </div>
            
            {/* Popular tags (below search, when dropdown closed) */}
            {!showDropdown && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                    <span className="text-xs text-slate-400 font-medium mr-1">
                        Popular:
                    </span>
                    {popularSearchTerms.slice(0, 6).map((term) => (
                        <button
                            key={term}
                            onClick={() => handlePopularClick(term)}
                            className="px-3 py-1 text-xs text-slate-500 bg-white hover:bg-amber-50 hover:text-amber-700 border border-slate-200 hover:border-amber-200 rounded-full transition-all cursor-pointer"
                        >
                            {term}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
