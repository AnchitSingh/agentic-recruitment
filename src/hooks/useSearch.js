/**
 * useSearch.js  — Enhanced Search Hook v2
 *
 * Fixes:
 *  ✓ Short queries (1-2 chars) now show results instead of "nothing found"
 *  ✓ Fallback to filtered trending when engine returns empty for short queries
 *  ✓ `isEmptyState` only true for meaningful-length queries with no results
 *  ✓ New `hasFallbackResults` flag for UI to render a softer empty state
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { quizCategories } from '../data/quizCategories';
import { popularSearchTerms, searchPlaceholders } from '../data/searchTerms';
import SearchEngine from '../search/SearchEngine';

const RECENT_KEY     = 'usmle_recent_searches_v2';
const COUNT_KEY      = 'usmle_search_counts';
const MAX_RECENT     = 8;
const CACHE_SIZE     = 60;
const SHORT_DEBOUNCE = 80;
const LONG_DEBOUNCE  = 150;

// Queries this short get a trending fallback instead of "nothing found"
const SHORT_QUERY_THRESHOLD = 2;


// ── Simple LRU cache ────────────────────────────────────────────────────────
class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.map     = new Map();
  }
  get(key) {
    if (!this.map.has(key)) return undefined;
    const val = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }
  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.maxSize) {
      this.map.delete(this.map.keys().next().value);
    }
  }
  has(key) { return this.map.has(key); }
}


// ── Storage helpers ─────────────────────────────────────────────────────────
const safeRead = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const safeWrite = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* quota exceeded */ }
};
const safeRemove = (key) => {
  try { localStorage.removeItem(key); }
  catch { /* */ }
};


const normaliseQuery = (q) => q.trim().replace(/\s+/g, ' ').toLowerCase();


// ═══════════════════════════════════════════════════════════════════════════
export const useSearch = ({ onSelect } = {}) => {
  // ── Core state ─────────────────────────────────────────────────────────
  const [searchQuery,      setSearchQuery]      = useState('');
  const [debouncedQuery,   setDebouncedQuery]   = useState('');
  const [showDropdown,     setShowDropdown]      = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [placeholderIdx,   setPlaceholderIdx]   = useState(0);
  const [hasPrefetched,    setHasPrefetched]    = useState(false);

  const [recentSearches, setRecentSearches] = useState(() =>
    safeRead(RECENT_KEY, [])
  );
  const [searchCounts, setSearchCounts] = useState(() =>
    safeRead(COUNT_KEY, {})
  );

  // ── Refs ────────────────────────────────────────────────────────────────
  const searchContainerRef = useRef(null);
  const searchInputRef     = useRef(null);
  const debounceRef        = useRef(null);
  const resultCacheRef     = useRef(new LRUCache(CACHE_SIZE));

  // ── Build engine once ──────────────────────────────────────────────────
  const engine = useMemo(() => new SearchEngine(quizCategories), []);

  // ── Prefetch ───────────────────────────────────────────────────────────
  const prefetch = useCallback(() => {
    if (hasPrefetched) return;
    setHasPrefetched(true);
    const terms = popularSearchTerms.slice(0, 12);
    let i = 0;
    const next = () => {
      if (i >= terms.length) return;
      const key = normaliseQuery(terms[i++]);
      if (!resultCacheRef.current.has(key)) {
        resultCacheRef.current.set(key, engine.search(key, 12));
      }
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback(next)
        : setTimeout(next, 50);
    };
    setTimeout(next, 200);
  }, [engine, hasPrefetched]);


  // ── Adaptive debounce ──────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const delay = searchQuery.trim().length <= 3 ? SHORT_DEBOUNCE : LONG_DEBOUNCE;
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(normaliseQuery(searchQuery));
    }, delay);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);


  // ── Rotate placeholder ────────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery) return;
    const t = setInterval(
      () => setPlaceholderIdx((p) => (p + 1) % searchPlaceholders.length),
      3000
    );
    return () => clearInterval(t);
  }, [searchQuery]);


  // ── Close on outside click ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (searchContainerRef.current &&
          !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);


  // ── ⌘K / Ctrl+K ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowDropdown(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);


  // ── Search results (cached) ────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!debouncedQuery) return [];
    const cache = resultCacheRef.current;
    if (cache.has(debouncedQuery)) return cache.get(debouncedQuery);
    const results = engine.search(debouncedQuery, 12);
    cache.set(debouncedQuery, results);
    return results;
  }, [debouncedQuery, engine]);


  // ── Suggestions ("did you mean") ───────────────────────────────────────
  const suggestions = useMemo(() => {
    if (!debouncedQuery || searchResults.length > 0) return [];
    const cacheKey = `suggest:${debouncedQuery}`;
    const cache    = resultCacheRef.current;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    const sugg = engine.suggest(debouncedQuery);
    cache.set(cacheKey, sugg);
    return sugg;
  }, [debouncedQuery, searchResults, engine]);


  // ── Trending quizzes ───────────────────────────────────────────────────
  const trendingQuizzes = useMemo(() => {
    const trending = [];
    for (const cat of quizCategories) {
      for (const q of cat.quizzes) {
        if (q.trending || q.recommended) {
          trending.push({
            type:          'quiz',
            ...q,
            categoryId:    cat.id,
            categoryIcon:  cat.icon,
            categoryLabel: cat.label,
            premium:       cat.premium,
          });
        }
      }
    }
    trending.sort((a, b) => (b.completions || 0) - (a.completions || 0));
    return trending.slice(0, 6);
  }, []);


  // ── Short-query fallback ───────────────────────────────────────────────
  // When the user types 1-2 chars and the engine returns nothing,
  // show trending quizzes filtered by the first character(s).
  // This prevents the jarring "nothing found" for single keystrokes.
  const shortQueryFallback = useMemo(() => {
    if (
      !debouncedQuery ||
      debouncedQuery.length > SHORT_QUERY_THRESHOLD ||
      searchResults.length > 0
    ) {
      return [];
    }

    const prefix = debouncedQuery.toLowerCase();

    // 1) Filter trending quizzes whose title starts with the prefix
    const filteredTrending = trendingQuizzes.filter((q) =>
      (q.title || '').toLowerCase().startsWith(prefix)
    );
    if (filteredTrending.length > 0) return filteredTrending;

    // 2) Broaden: any trending quiz whose title contains the prefix
    const containsTrending = trendingQuizzes.filter((q) =>
      (q.title || '').toLowerCase().includes(prefix)
    );
    if (containsTrending.length > 0) return containsTrending;

    // 3) Scan all categories/quizzes for title prefix match
    const broad = [];
    for (const cat of quizCategories) {
      if (cat.label.toLowerCase().startsWith(prefix)) {
        broad.push({
          type: 'category', id: cat.id, label: cat.label, icon: cat.icon,
          description: cat.description, premium: cat.premium,
          quizCount: cat.quizzes.length, tags: cat.tags || [],
        });
      }
      for (const q of cat.quizzes) {
        if ((q.title || '').toLowerCase().startsWith(prefix)) {
          broad.push({
            type: 'quiz', ...q,
            categoryId: cat.id, categoryIcon: cat.icon,
            categoryLabel: cat.label, premium: cat.premium,
          });
        }
        if (broad.length >= 8) break;
      }
      if (broad.length >= 8) break;
    }
    if (broad.length > 0) return broad;

    // 4) Last resort: show all trending
    return trendingQuizzes;
  }, [debouncedQuery, searchResults, trendingQuizzes]);


  // ── Unified navigable items ────────────────────────────────────────────
  const navigableItems = useMemo(() => {
    if (debouncedQuery) {
      // Engine returned results — use them
      if (searchResults.length > 0) return searchResults;

      // Short query with no engine results — use fallback
      if (shortQueryFallback.length > 0) return shortQueryFallback;

      // Truly no results (longer query) — empty list, UI shows "no results"
      return [];
    }

    // Idle state — recent + trending
    const recentItems = recentSearches.slice(0, 5).map((q) => ({
      type:  'recent',
      id:    `recent:${q}`,
      query: q,
      label: q,
    }));
    return [...recentItems, ...trendingQuizzes];
  }, [debouncedQuery, searchResults, shortQueryFallback, recentSearches, trendingQuizzes]);


  // ── Sorted recents ─────────────────────────────────────────────────────
  const sortedRecentSearches = useMemo(() => {
    return [...recentSearches].sort(
      (a, b) => (searchCounts[b] || 0) - (searchCounts[a] || 0)
    );
  }, [recentSearches, searchCounts]);


  // ── Recent search persistence ──────────────────────────────────────────
  const saveRecentSearch = useCallback((query) => {
    const q = query?.trim();
    if (!q || q.length < 2) return;

    setSearchCounts((prev) => {
      const updated = { ...prev, [q]: (prev[q] || 0) + 1 };
      safeWrite(COUNT_KEY, updated);
      return updated;
    });

    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== q);
      const updated  = [q, ...filtered].slice(0, MAX_RECENT);
      safeWrite(RECENT_KEY, updated);
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    setSearchCounts({});
    safeRemove(RECENT_KEY);
    safeRemove(COUNT_KEY);
  }, []);

  const removeRecentSearch = useCallback((query) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s !== query);
      safeWrite(RECENT_KEY, updated);
      return updated;
    });
  }, []);


  // ── Event handlers ──────────────────────────────────────────────────────
  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
    setShowDropdown(true);
    setHighlightedIndex(-1);
  }, []);

  const handleSearchFocus = useCallback(() => {
    setShowDropdown(true);
    prefetch();
  }, [prefetch]);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
    setHighlightedIndex(-1);
    searchInputRef.current?.focus();
  }, []);

  const handleSearchKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        setShowDropdown(false);
        searchInputRef.current?.blur();
        return null;
      }

      const items = navigableItems;
      if (!items.length) return null;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((p) => (p < items.length - 1 ? p + 1 : 0));
        return null;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((p) => (p > 0 ? p - 1 : items.length - 1));
        return null;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < items.length) {
          const item = items[highlightedIndex];
          if (item.type === 'recent') {
            setSearchQuery(item.query);
            setShowDropdown(true);
            setHighlightedIndex(-1);
            return null;
          }
          saveRecentSearch(searchQuery);
          setShowDropdown(false);
          onSelect?.(item);
          return item;
        }
        if (searchQuery.trim()) {
          saveRecentSearch(searchQuery);
          setShowDropdown(false);
        }
      }

      return null;
    },
    [navigableItems, highlightedIndex, searchQuery, saveRecentSearch, onSelect]
  );

  const handleResultSelect = useCallback(
    (result) => {
      saveRecentSearch(searchQuery);
      setShowDropdown(false);
      onSelect?.(result);
      return result;
    },
    [searchQuery, saveRecentSearch, onSelect]
  );

  const handlePopularClick = useCallback((term) => {
    setSearchQuery(term);
    setShowDropdown(true);
    setHighlightedIndex(-1);
    searchInputRef.current?.focus();
  }, []);

  const handleSuggestionClick = useCallback((suggestion) => {
    const term = typeof suggestion === 'string' ? suggestion : suggestion.query;
    setSearchQuery(term);
    setShowDropdown(true);
    setHighlightedIndex(-1);
    searchInputRef.current?.focus();
  }, []);

  const handleRecentClick = useCallback((term) => {
    setSearchQuery(term);
    setShowDropdown(true);
    setHighlightedIndex(-1);
    searchInputRef.current?.focus();
  }, []);


  // ── Derived flags ──────────────────────────────────────────────────────
  const hasResults          = searchResults.length > 0;
  const hasFallbackResults  = !hasResults && shortQueryFallback.length > 0;
  const isSearching         = searchQuery !== '' && searchQuery !== debouncedQuery;

  // "Nothing found" only for meaningful-length queries that truly return nothing
  const isEmptyState        = !!debouncedQuery
                              && !hasResults
                              && !hasFallbackResults
                              && !isSearching;


  // ── Expose ──────────────────────────────────────────────────────────────
  return {
    // State
    searchQuery,
    setSearchQuery,
    showDropdown,
    setShowDropdown,
    highlightedIndex,
    setHighlightedIndex,
    placeholderIdx,

    // Refs
    searchContainerRef,
    searchInputRef,

    // Computed results
    searchResults,
    suggestions,
    trendingQuizzes,
    navigableItems,
    recentSearches: sortedRecentSearches,
    popularSearchTerms,
    shortQueryFallback,     // ← NEW: UI can render this differently (e.g. "Showing matches for 'c'...")

    // Handlers
    handleSearchChange,
    handleSearchFocus,
    handleSearchKeyDown,
    handleResultSelect,
    handleSearchClear,
    handlePopularClick,
    handleSuggestionClick,
    handleRecentClick,
    clearRecentSearches,
    removeRecentSearch,
    saveRecentSearch,

    // Metadata
    hasResults,
    hasFallbackResults,     // ← NEW: true when showing filtered trending instead of engine results
    isSearching,
    isEmptyState,           // ← FIXED: no longer true for 1-2 char queries with fallback results
  };
};