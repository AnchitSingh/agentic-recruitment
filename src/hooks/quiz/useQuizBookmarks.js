import { useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import examBuddyAPI from '../../services/api';
import { A } from './quizReducer';
import { buildBookmarkData } from './utils';

export default function useQuizBookmarks(dispatch, isMountedRef) {

  // Load bookmarks on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await examBuddyAPI.getBookmarks();
        if (!cancelled && res?.success && Array.isArray(res.data)) {
          dispatch({
            type:    A.SET_BOOKMARKS,
            payload: new Set(res.data.map(b => b.questionId)),
          });
        }
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [dispatch]);

  /**
   * Toggle a single question's bookmark.
   * Reads bookmarkedSet from the caller's ref to avoid stale closure.
   */
  const toggleBookmark = useCallback(async (question, quizTitle, bookmarkedSet) => {
    if (!question) return;

    const id         = question.id;
    const isBookmarked = bookmarkedSet.has(id);

    try {
      if (isBookmarked) {
        const res = await examBuddyAPI.removeBookmark(id);
        if (res?.success) {
          dispatch({ type: A.REMOVE_BOOKMARK, payload: id });
          toast.success('Bookmark removed');
        } else {
          toast.error('Failed to remove bookmark');
        }
      } else {
        const data = buildBookmarkData(question, quizTitle);
        const res  = await examBuddyAPI.addBookmark(id, data);
        if (res?.success) {
          dispatch({ type: A.ADD_BOOKMARK, payload: id });
          toast.success('Question bookmarked');
        } else {
          toast.error('Failed to bookmark question');
        }
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      if (isMountedRef.current) toast.error('Failed to update bookmark');
    }
  }, [dispatch, isMountedRef]);

  /**
   * Auto-bookmark a batch of incorrect questions.
   * Uses a local `seen` set to avoid double-bookmarking within the same batch.
   */
  const batchAutoBookmark = useCallback(async (questions, quizTitle, currentBookmarks) => {
    const seen  = new Set(currentBookmarks);
    let   count = 0;

    for (const question of questions) {
      if (seen.has(question.id)) continue;
      try {
        const data = buildBookmarkData(question, quizTitle);
        const res  = await examBuddyAPI.addBookmark(question.id, data);
        if (res?.success) {
          dispatch({ type: A.ADD_BOOKMARK, payload: question.id });
          seen.add(question.id);
          count++;
        }
      } catch (err) {
        console.error('Error auto-bookmarking:', err);
      }
    }

    return count;
  }, [dispatch]);

  return { toggleBookmark, batchAutoBookmark };
}