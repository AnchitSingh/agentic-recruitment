import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearch } from '../../hooks/useSearch';
import { SearchDropdown } from '../landing/QuizBrowser/SearchDropdown';
import { cn } from '../../utils/designTokens';

/* ═══════════════════════════════════════════════════════════════════
   Icons — extracted to avoid inline SVG repetition
   ═══════════════════════════════════════════════════════════════════ */

const SearchIcon = ({ active }) => (
    <svg
        className={cn(
            'w-6 h-6 transition-colors duration-200',
            active ? 'text-amber-500' : 'text-slate-600'
        )}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
    </svg>
);

const CloseIcon = ({ className = 'w-5 h-5 text-slate-500' }) => (
    <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
        />
    </svg>
);

const ClockIcon = () => (
    <svg
        className="w-3.5 h-3.5 text-slate-400 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

/* ═══════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════ */

const PLACEHOLDER_TERMS = [
    'Cell Biology',
    'Pharmacology',
    'Step 2 CK',
    'Neuroanatomy',
    'Pathology',
];
const POPULAR_TAGS_LIMIT = 8;
const FOCUS_DELAY_MS = 100;

const FOCUSABLE_SELECTOR =
    'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

/* ═══════════════════════════════════════════════════════════════════
   useFocusTrap — keeps Tab cycling inside the modal
   ═══════════════════════════════════════════════════════════════════ */

function useFocusTrap(containerRef, isActive) {
    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (e) => {
            if (e.key !== 'Tab') return;
            const container = containerRef.current;
            if (!container) return;

            const focusable = [...container.querySelectorAll(FOCUSABLE_SELECTOR)];
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [containerRef, isActive]);
}

/* ═══════════════════════════════════════════════════════════════════
   useScrollLock — prevents background scroll without layout shift
   ═══════════════════════════════════════════════════════════════════ */

function useScrollLock(isLocked) {
    useEffect(() => {
        if (!isLocked) return;

        const scrollbarWidth =
            window.innerWidth - document.documentElement.clientWidth;

        const saved = {
            overflow: document.body.style.overflow,
            paddingRight: document.body.style.paddingRight,
        };

        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        return () => {
            document.body.style.overflow = saved.overflow;
            document.body.style.paddingRight = saved.paddingRight;
        };
    }, [isLocked]);
}

/* ═══════════════════════════════════════════════════════════════════
   SearchModal — Full-screen search overlay (React Portal)
   ═══════════════════════════════════════════════════════════════════ */

export const SearchModal = ({ isOpen, onClose, onResultSelect }) => {
    const modalRef = useRef(null);
    const inputRef = useRef(null);
    const previousFocusRef = useRef(null);

    const {
        searchQuery,
        showDropdown,
        placeholderIdx,
        searchContainerRef,
        searchInputRef,
        handleSearchChange,
        handleSearchFocus,
        handleSearchKeyDown,
        handleSearchClear,
        highlightedIndex,
        setHighlightedIndex,
        searchResults,
        popularSearchTerms,
        handlePopularClick,
        clearRecentSearches,
        removeRecentSearch,
        recentSearches,
    } = useSearch({ onSelect: onResultSelect });

    /* ── custom hooks ─────────────────────────────────────────── */
    useScrollLock(isOpen);
    useFocusTrap(modalRef, isOpen);

    /* ── save / restore focus ─────────────────────────────────── */
    useEffect(() => {
        if (isOpen) {
            previousFocusRef.current = document.activeElement;
        } else if (previousFocusRef.current instanceof HTMLElement) {
            previousFocusRef.current.focus();
            previousFocusRef.current = null;
        }
    }, [isOpen]);

    /* ── auto-focus input ─────────────────────────────────────── */
    useEffect(() => {
        if (!isOpen) return;
        const id = setTimeout(() => inputRef.current?.focus(), FOCUS_DELAY_MS);
        return () => clearTimeout(id);
    }, [isOpen]);

    /* ── sync internal ref with hook's ref ────────────────────── */
    useEffect(() => {
        if (inputRef.current && searchInputRef) {
            searchInputRef.current = inputRef.current;
        }
    }, [searchInputRef, isOpen]);

    /* ── Check for prefill value ───────────────────────────── */
    useEffect(() => {
        if (isOpen && inputRef.current && window.searchModalPrefill) {
            console.log('Prefilling search input with:', window.searchModalPrefill);
            // Small delay to ensure input is fully rendered
            setTimeout(() => {
                const prefillValue = window.searchModalPrefill;
                inputRef.current.value = prefillValue;
                // Trigger the change handler to update search state
                handleSearchChange({ target: { value: prefillValue } });
                window.searchModalPrefill = null; // Clear after using
            }, 50);
        }
    }, [isOpen, handleSearchChange]);

    /* ── escape to close ──────────────────────────────────────── */
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    /* ── stable callbacks ─────────────────────────────────────── */
    const handleResultSelect = useCallback(
        (result) => {
            onResultSelect(result);
            onClose();
        },
        [onResultSelect, onClose]
    );

    const handleBackdropClick = useCallback(
        (e) => {
            if (e.target === e.currentTarget) onClose();
        },
        [onClose]
    );

    /* ── derived state ────────────────────────────────────────── */
    const placeholderText = useMemo(
        () => `Search "${PLACEHOLDER_TERMS[placeholderIdx]}"…`,
        [placeholderIdx]
    );

    const showPopularTags = !showDropdown;
    const showRecentSearches =
        !showDropdown && !searchQuery && recentSearches.length > 0;

    /* ── early return ─────────────────────────────────────────── */
    if (!isOpen) return null;

    return createPortal(
        <div
            ref={modalRef}
            className={cn(
                'fixed inset-0 z-[100] flex flex-col',
                'bg-slate-900/60 backdrop-blur-sm',
                'animate-fade-in motion-reduce:animate-none'
            )}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-label="Search quizzes"
        >
            {/* ── Close button ───────────────────────────────── */}
            <button
                onClick={onClose}
                className={cn(
                    'absolute top-6 right-6 z-10',
                    'w-10 h-10 rounded-full',
                    'bg-slate-100 hover:bg-slate-200 active:bg-slate-300',
                    'flex items-center justify-center',
                    'transition-colors cursor-pointer'
                )}
                aria-label="Close search"
            >
                <CloseIcon />
            </button>

            {/* ── Search container ───────────────────────────── */}
            <div
                className="w-full max-w-3xl mx-auto mt-24 sm:mt-32 px-4 sm:px-6"
                ref={searchContainerRef}
            >
                <div className="relative bg-white rounded-2xl shadow-2xl p-2">
                    {/* search icon */}
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                        <SearchIcon active={!!searchQuery} />
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={handleSearchFocus}
                        onKeyDown={handleSearchKeyDown}
                        placeholder={placeholderText}
                        autoComplete="off"
                        spellCheck={false}
                        aria-label="Search quizzes"
                        aria-autocomplete="list"
                        aria-expanded={showDropdown}
                        aria-controls={showDropdown ? 'search-results-list' : undefined}
                        className={cn(
                            'w-full pl-14 pr-14 py-5',
                            'text-xl sm:text-2xl rounded-xl',
                            'bg-slate-50 border-0',
                            'focus:bg-white focus:ring-2 focus:ring-amber-400',
                            'placeholder-slate-400 text-slate-700',
                            'outline-none transition-all duration-300'
                        )}
                    />

                    {/* right-side affordance: clear button or ESC hint */}
                    {searchQuery ? (
                        <button
                            onClick={handleSearchClear}
                            className={cn(
                                'absolute right-4 top-1/2 -translate-y-1/2',
                                'w-8 h-8 rounded-full',
                                'bg-slate-100 hover:bg-slate-200 active:bg-slate-300',
                                'flex items-center justify-center',
                                'transition-colors cursor-pointer'
                            )}
                            aria-label="Clear search"
                        >
                            <CloseIcon className="w-4 h-4 text-slate-500" />
                        </button>
                    ) : (
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 hidden sm:flex items-center pointer-events-none">
                            <kbd className="px-2 py-1 text-xs font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded">
                                ESC
                            </kbd>
                        </div>
                    )}

                    {/* dropdown results */}
                    <SearchDropdown
                        onResultSelect={handleResultSelect}
                        searchQuery={searchQuery}
                        showDropdown={showDropdown}
                        highlightedIndex={highlightedIndex}
                        setHighlightedIndex={setHighlightedIndex}
                        searchResults={searchResults}
                        popularSearchTerms={popularSearchTerms}
                        handlePopularClick={handlePopularClick}
                        isModal
                    />
                </div>

                {/* ── Popular tags ────────────────────────────── */}
                {showPopularTags && (
                    <div
                        className="flex flex-wrap items-center justify-center gap-2 mt-6"
                        role="group"
                        aria-label="Popular searches"
                    >
                        <span className="text-sm text-slate-400 font-medium mr-1">
                            Popular:
                        </span>
                        {popularSearchTerms
                            .slice(0, POPULAR_TAGS_LIMIT)
                            .map((term) => (
                                <button
                                    key={term}
                                    onClick={() => handlePopularClick(term)}
                                    className={cn(
                                        'px-4 py-2 text-sm rounded-full shadow-sm',
                                        'text-slate-500 bg-white border border-slate-200',
                                        'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200',
                                        'active:scale-95 transition-all cursor-pointer'
                                    )}
                                >
                                    {term}
                                </button>
                            ))}
                    </div>
                )}
            </div>

            {/* ── Recent searches ─────────────────────────────── */}
            {showRecentSearches && (
                <div
                    className="w-full max-w-2xl mx-auto mt-8 px-4 sm:px-6"
                    role="region"
                    aria-label="Recent searches"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                            Recent Searches
                        </span>
                        <button
                            onClick={clearRecentSearches}
                            className="text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                            Clear all
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {recentSearches.map((term) => (
                            <span
                                key={term}
                                className={cn(
                                    'group relative pl-3 pr-7 py-1.5 text-sm rounded-lg',
                                    'bg-slate-50 text-slate-600 border border-slate-100',
                                    'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200',
                                    'transition-colors flex items-center gap-2'
                                )}
                            >
                                <button
                                    onClick={() => handlePopularClick(term)}
                                    className="flex items-center gap-2 cursor-pointer"
                                    aria-label={`Search for ${term}`}
                                >
                                    <ClockIcon />
                                    {term}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeRecentSearch(term);
                                    }}
                                    className={cn(
                                        'absolute right-1 top-1/2 -translate-y-1/2',
                                        'w-5 h-5 rounded-full',
                                        'opacity-0 group-hover:opacity-100 focus:opacity-100',
                                        'hover:bg-slate-200 flex items-center justify-center',
                                        'transition-all cursor-pointer'
                                    )}
                                    aria-label={`Remove "${term}" from recent searches`}
                                >
                                    <CloseIcon className="w-3 h-3 text-slate-400" />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};

export default SearchModal;