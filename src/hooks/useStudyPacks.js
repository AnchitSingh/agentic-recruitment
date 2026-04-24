import { useState, useEffect, useMemo } from 'react';
import { fetchStudyPacks } from '../services/backendAPI';

const PACKS_PER_PAGE = 4;

// Module-level cache so we don't re-fetch on every mount
let cachedPacks = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export function useStudyPacks() {
  const [packs, setPacks] = useState(cachedPacks || []);
  const [loading, setLoading] = useState(!cachedPacks);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PACKS_PER_PAGE);

  useEffect(() => {
    // Use cache if fresh
    if (cachedPacks && Date.now() - cacheTimestamp < CACHE_TTL) {
      setPacks(cachedPacks);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      const res = await fetchStudyPacks();

      if (cancelled) return;

      if (res.success) {
        // Sort: most quizzes first, then alphabetical
        const sorted = (res.data || []).sort((a, b) => {
          if (b.total_quizzes !== a.total_quizzes) return b.total_quizzes - a.total_quizzes;
          return a.title.localeCompare(b.title);
        });

        cachedPacks = sorted;
        cacheTimestamp = Date.now();
        setPacks(sorted);
      } else {
        setError(res.error);
      }

      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Paginated view
  const visiblePacks = useMemo(
    () => packs.slice(0, visibleCount),
    [packs, visibleCount]
  );

  const hasMore = visibleCount < packs.length;
  const remaining = packs.length - visibleCount;

  const showMore = () => {
    setVisibleCount(prev => Math.min(prev + PACKS_PER_PAGE, packs.length));
  };

  const showLess = () => {
    setVisibleCount(PACKS_PER_PAGE);
  };

  return {
    packs: visiblePacks,
    allPacks: packs,
    loading,
    error,
    hasMore,
    remaining,
    totalCount: packs.length,
    showMore,
    showLess,
    isExpanded: visibleCount > PACKS_PER_PAGE,
  };
}