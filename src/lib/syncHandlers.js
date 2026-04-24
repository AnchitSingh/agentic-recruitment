/**
 * Sync Handlers — transform between app format and Supabase tables.
 *
 * Every handler implements:
 *   pull(supabase, userId)        → fetch from DB, return app-format data
 *   push(supabase, userId, data)  → write app-format data to DB
 *   merge(local, remote)          → resolve conflicts between two copies
 *
 * The app stores Maps as Array.from(map.entries()):
 *   [[key1, val1], [key2, val2], ...]
 *
 * Handlers convert between that shape and proper DB rows.
 */

// ─────────────────────────────────────────────────────────────
// QUIZ RESULTS (quizProgress key)
//
// Strategy: append-only with cursor.
// Quiz results are immutable once created — a completed quiz
// never changes. We track which IDs have been synced and only
// push new ones. Merge unions both sets by quizId.
// ─────────────────────────────────────────────────────────────

export const quizProgressHandler = {
  async pull(supabase, userId) {
    const { data, error } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    return (data || []).map((row) => [
      row.quiz_id,
      {
        quizId: row.quiz_id,
        totalQuestions: row.total_questions,
        answeredQuestions: row.answered_questions,
        score: row.score,
        totalScore: row.total_score,
        percentage: row.percentage,
        timeSpent: row.time_spent || 0,
        completedAt: row.completed_at,
        answers: row.answers || [],
        completed: true,
      },
    ]);
  },

  async push(supabase, userId, entries) {
    if (!entries?.length) return;

    // Only push entries not yet synced
    const syncedIds = new Set(
      JSON.parse(localStorage.getItem('_sync_cursor_quiz_results') || '[]')
    );

    const newEntries = entries.filter(([quizId]) => !syncedIds.has(quizId));
    if (newEntries.length === 0) return;

    // Enrich with quiz metadata from completedQuizzes if available
    let completedQuizzes = new Map();
    try {
      const raw = localStorage.getItem('completedQuizzes');
      if (raw) completedQuizzes = new Map(JSON.parse(raw));
    } catch {
      /* ignore */
    }

    // Also check quiz_history for metadata
    let quizHistory = [];
    try {
      const raw = localStorage.getItem('quiz_history');
      if (raw) quizHistory = JSON.parse(raw);
    } catch {
      /* ignore */
    }

    const rows = newEntries.map(([quizId, result]) => {
      const quiz = completedQuizzes.get(quizId);
      const historyEntry = quizHistory.find((h) => h.id === quizId);

      return {
        user_id: userId,
        quiz_id: quizId,
        title: quiz?.title || historyEntry?.title || quiz?.subject || null,
        subject: quiz?.subject || historyEntry?.subject || null,
        slug: quiz?.slug || historyEntry?.slug || null,
        source: quiz?.source || historyEntry?.source || 'local',
        total_questions: result.totalQuestions || 0,
        answered_questions: result.answeredQuestions || 0,
        score: result.score || 0,
        total_score: result.totalScore || 0,
        percentage: result.percentage || 0,
        time_spent: result.timeSpent || 0,
        completed_at: result.completedAt || new Date().toISOString(),
        answers: result.answers || [],
      };
    });

    // Batch upsert (50 at a time)
    for (let i = 0; i < rows.length; i += 50) {
      const { error } = await supabase
        .from('quiz_results')
        .upsert(rows.slice(i, i + 50), { onConflict: 'user_id,quiz_id' });
      if (error) throw error;
    }

    // Advance cursor
    for (const [quizId] of newEntries) syncedIds.add(quizId);
    localStorage.setItem('_sync_cursor_quiz_results', JSON.stringify([...syncedIds]));
  },

  merge(local, remote) {
    if (!remote?.length) return local || [];
    if (!local?.length) return remote;

    // Union by quizId — completed results win over incomplete
    const merged = new Map();

    for (const [quizId, result] of remote) {
      merged.set(quizId, result);
    }

    for (const [quizId, result] of local) {
      const existing = merged.get(quizId);
      if (!existing || result.completed) {
        merged.set(quizId, result);
      }
    }

    return Array.from(merged.entries());
  },
};

// ─────────────────────────────────────────────────────────────
// BOOKMARKS
//
// Strategy: snapshot-based three-way merge.
// Tracks a snapshot of question IDs at last sync. On merge,
// computes what each side added/removed since the snapshot
// and applies both. ADD wins over REMOVE for conflicts.
// ─────────────────────────────────────────────────────────────

const BOOKMARKS_SNAPSHOT_KEY = '_sync_snapshot_bookmarks';

export const bookmarksHandler = {
  async pull(supabase, userId) {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    return (data || []).map((row) => [
      row.question_id,
      {
        id: row.bookmark_data?.id || `bookmark_${row.question_id}`,
        questionId: row.question_id,
        ...(row.bookmark_data || {}),
        createdAt: row.created_at,
      },
    ]);
  },

  async push(supabase, userId, entries) {
    entries = entries || [];
    const currentIds = new Set(entries.map(([qId]) => qId));

    // Get snapshot of last synced state
    const snapshotRaw = localStorage.getItem(BOOKMARKS_SNAPSHOT_KEY);
    const snapshotIds = new Set(snapshotRaw ? JSON.parse(snapshotRaw) : []);

    // Determine additions and removals since last sync
    const toAdd = entries.filter(([qId]) => !snapshotIds.has(qId));
    const toRemove = [...snapshotIds].filter((id) => !currentIds.has(id));

    // Insert new bookmarks
    if (toAdd.length > 0) {
      const rows = toAdd.map(([questionId, bookmark]) => {
        const { id, questionId: _qid, createdAt, ...rest } = bookmark;
        return {
          user_id: userId,
          question_id: questionId,
          bookmark_data: { id, ...rest },
          created_at: createdAt || new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from('bookmarks')
        .upsert(rows, { onConflict: 'user_id,question_id' });
      if (error) throw error;
    }

    // Delete removed bookmarks
    if (toRemove.length > 0) {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .in('question_id', toRemove);
      if (error) throw error;
    }

    // Update snapshot
    localStorage.setItem(BOOKMARKS_SNAPSHOT_KEY, JSON.stringify([...currentIds]));
  },

  merge(local, remote) {
    if (!remote?.length) return local || [];
    if (!local?.length) return remote;

    const snapshotRaw = localStorage.getItem(BOOKMARKS_SNAPSHOT_KEY);

    // ── First sync ever: no snapshot → take union ──
    if (!snapshotRaw) {
      const merged = new Map(remote);
      for (const [k, v] of local) merged.set(k, v);
      return Array.from(merged.entries());
    }

    // ── Three-way merge ──
    const snapshotIds = new Set(JSON.parse(snapshotRaw));
    const localMap = new Map(local);
    const remoteMap = new Map(remote);
    const localIds = new Set(localMap.keys());
    const remoteIds = new Set(remoteMap.keys());

    const result = new Map();

    // Start with all items from snapshot that still exist somewhere
    for (const id of snapshotIds) {
      const val = localMap.get(id) || remoteMap.get(id);
      if (val) result.set(id, val);
    }

    // Apply removals (removed from either side)
    for (const id of snapshotIds) {
      if (!localIds.has(id)) result.delete(id);
      if (!remoteIds.has(id)) result.delete(id);
    }

    // Apply additions (new items win — ADD beats REMOVE)
    for (const [id, val] of localMap) {
      if (!snapshotIds.has(id)) result.set(id, val);
    }
    for (const [id, val] of remoteMap) {
      if (!snapshotIds.has(id)) result.set(id, val);
    }

    return Array.from(result.entries());
  },
};

// ─────────────────────────────────────────────────────────────
// TOPIC PERFORMANCE (topicAttempts key)
//
// Strategy: merge histories, recalculate aggregates.
// History arrays are deduped by timestamp, capped at 20.
// Aggregate fields (attempts, correct, totalScore) take
// the max of local/remote/merged-history-length.
// ─────────────────────────────────────────────────────────────

export const topicAttemptsHandler = {
  async pull(supabase, userId) {
    const { data, error } = await supabase
      .from('topic_performance')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    return (data || []).map((row) => [
      row.topic_key,
      {
        attempts: row.attempts,
        correct: row.correct,
        totalScore: row.total_score,
        accuracyHistory: row.accuracy_history || [],
        difficultyHistory: row.difficulty_history || [],
        timestamps: row.timestamps || [],
      },
    ]);
  },

  async push(supabase, userId, entries) {
    if (!entries?.length) return;

    const rows = entries.map(([topicKey, data]) => ({
      user_id: userId,
      topic_key: topicKey,
      attempts: data.attempts || 0,
      correct: data.correct || 0,
      total_score: data.totalScore || 0,
      accuracy_history: data.accuracyHistory || [],
      difficulty_history: data.difficultyHistory || [],
      timestamps: data.timestamps || [],
      updated_at: new Date().toISOString(),
    }));

    for (let i = 0; i < rows.length; i += 50) {
      const { error } = await supabase
        .from('topic_performance')
        .upsert(rows.slice(i, i + 50), { onConflict: 'user_id,topic_key' });
      if (error) throw error;
    }
  },

  merge(local, remote) {
    if (!remote?.length) return local || [];
    if (!local?.length) return remote;

    const localMap = new Map(local);
    const remoteMap = new Map(remote);
    const allKeys = new Set([...localMap.keys(), ...remoteMap.keys()]);

    const merged = [];
    for (const key of allKeys) {
      const l = localMap.get(key);
      const r = remoteMap.get(key);

      if (!l) {
        merged.push([key, r]);
        continue;
      }
      if (!r) {
        merged.push([key, l]);
        continue;
      }

      // Merge + dedupe histories by timestamp, keep most recent 20
      const mergedAccuracy = dedupeByTimestamp([
        ...(r.accuracyHistory || []),
        ...(l.accuracyHistory || []),
      ]).slice(-20);

      const mergedDifficulty = dedupeByTimestamp([
        ...(r.difficultyHistory || []),
        ...(l.difficultyHistory || []),
      ]).slice(-20);

      const mergedTimestamps = [...new Set([...(r.timestamps || []), ...(l.timestamps || [])])]
        .sort()
        .slice(-20);

      merged.push([
        key,
        {
          // Aggregates: take max (they're cumulative and might exceed history length)
          attempts: Math.max(l.attempts || 0, r.attempts || 0, mergedTimestamps.length),
          correct: Math.max(l.correct || 0, r.correct || 0),
          totalScore: Math.max(l.totalScore || 0, r.totalScore || 0),
          accuracyHistory: mergedAccuracy,
          difficultyHistory: mergedDifficulty,
          timestamps: mergedTimestamps,
        },
      ]);
    }

    return merged;
  },
};

function dedupeByTimestamp(arr) {
  const seen = new Set();
  return arr
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
    .filter((item) => {
      // Key on timestamp + result to catch exact duplicates
      const key = `${item.date}_${item.isCorrect}_${item.accuracy || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// ─────────────────────────────────────────────────────────────
// GENERIC HANDLER (user_data table)
//
// For all other keys: activeQuizzes, pausedQuizzes,
// completedQuizzes, quiz_history, evaluationHistory,
// studyAnalytics, userProfile, etc.
//
// Stores the raw value as JSONB. Merge strategy adapts
// to the data shape automatically.
// ─────────────────────────────────────────────────────────────

export function createGenericHandler(storageKey) {
  return {
    async pull(supabase, userId) {
      const { data, error } = await supabase
        .from('user_data')
        .select('value')
        .eq('user_id', userId)
        .eq('key', storageKey)
        .maybeSingle();

      if (error) throw error;
      return data?.value ?? null;
    },

    async push(supabase, userId, value) {
      if (value === null || value === undefined) return;

      const { error } = await supabase.from('user_data').upsert(
        {
          user_id: userId,
          key: storageKey,
          value: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,key' }
      );

      if (error) throw error;
    },

    merge(local, remote) {
      if (remote === null || remote === undefined) return local;
      if (local === null || local === undefined) return remote;

      // ── Map entries: [[key, value], ...] — merge by key, local wins ──
      if (isMapEntries(local) && isMapEntries(remote)) {
        const merged = new Map(remote);
        for (const [k, v] of local) merged.set(k, v);
        return Array.from(merged.entries());
      }

      // ── Arrays with id field (quiz_history) — dedupe by id ──
      if (Array.isArray(local) && Array.isArray(remote)) {
        if (local.length === 0) return remote;
        if (remote.length === 0) return local;

        if (local[0]?.id || remote[0]?.id) {
          const byId = new Map();
          for (const item of remote) byId.set(item.id, item);
          for (const item of local) byId.set(item.id, item); // local wins
          return [...byId.values()]
            .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
            .slice(0, 50);
        }

        return local; // Can't dedupe without IDs
      }

      // ── Plain objects — shallow merge, local wins ──
      if (typeof local === 'object' && typeof remote === 'object') {
        return { ...remote, ...local };
      }

      return local;
    },
  };
}

function isMapEntries(data) {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    Array.isArray(data[0]) &&
    data[0].length === 2
  );
}