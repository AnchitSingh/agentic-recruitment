import { useState, useEffect, useRef } from 'react';
import { fetchQuestionBySlug } from '../services/backendAPI';

// Simple in-memory cache — survives navigation, cleared on reload
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export function useQuestion(slug) {
  const [data, setData] = useState(() => cache.get(slug)?.data || null);
  const [loading, setLoading] = useState(!cache.has(slug));
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check cache
    const cached = cache.get(slug);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetchQuestionBySlug(slug).then((res) => {
      if (res.success) {
        cache.set(slug, { data: res.data, timestamp: Date.now() });
        setData(res.data);

        // Pre-cache related questions (user will likely click them)
        prefetchRelated(res.data.related);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });
  }, [slug]);

  return { data, loading, error };
}

// Prefetch related questions in the background
function prefetchRelated(related) {
  if (!related?.length) return;

  // Fetch first 3 related questions after a short delay
  setTimeout(() => {
    related.slice(0, 3).forEach((q) => {
      if (!cache.has(q.slug)) {
        fetchQuestionBySlug(q.slug).then((res) => {
          if (res.success) {
            cache.set(q.slug, { data: res.data, timestamp: Date.now() });
          }
        });
      }
    });
  }, 2000); // wait 2s so main page loads first
}
