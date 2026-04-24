/**
 * SyncedStorage — drop-in replacement for the original storage utility.
 *
 * Same interface:  storage.get(key, defaultValue) → Promise<value>
 *                  storage.set(key, value)        → Promise<boolean>
 *                  storage.remove(key)            → Promise<boolean>
 *
 * Added:           storage.initSync(userId)       → Promise<{success, errors}>
 *                  storage.reset(clearLocal?)     → void
 *                  storage.destroy()              → void
 *
 * How it works:
 *   • get() always reads from localStorage (fast, works offline)
 *   • set() writes to localStorage + marks key dirty for background sync
 *   • initSync() pulls from Supabase, merges with LS, pushes merged state back
 *   • Dirty keys are synced to Supabase on a 2-second debounce
 *   • On tab hide: immediate sync attempt via fetch + keepalive
 *   • Unauthenticated users get pure localStorage (no sync)
 */

import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';
import {
  quizProgressHandler,
  bookmarksHandler,
  topicAttemptsHandler,
  createGenericHandler,
} from '../lib/syncHandlers';

// ─── Configuration ──────────────────────────────────────────

/** Keys that map to structured Supabase tables */
const STRUCTURED_HANDLERS = {
  quizProgress: quizProgressHandler,
  bookmarks: bookmarksHandler,
  topicAttempts: topicAttemptsHandler,
};

/** All keys that should sync to Supabase */
const SYNCED_KEYS = new Set([
  // Structured
  'quizProgress',
  'bookmarks',
  'topicAttempts',
  // Generic (→ user_data table)
  'activeQuizzes',
  'pausedQuizzes',
  'completedQuizzes',
  'quiz_history',
  'evaluationHistory',
  'studyAnalytics',
  'userProfile',
]);

const SYNC_DEBOUNCE_MS = 2000;
const SYNC_RETRY_MS = 5000;
const INIT_TIMEOUT_MS = 5000; // 5 seconds max

// ─── SyncedStorage Class ────────────────────────────────────

class SyncedStorage {
  constructor() {
    this.userId = null;
    this.initialized = false;
    this.dirtyKeys = new Set();
    this.syncTimer = null;
    this.syncing = false;
    this._genericHandlers = new Map();
    this._cachedToken = null;

    // Best-effort sync when tab goes hidden
    this._handleVisibility = () => {
      if (document.visibilityState === 'hidden' && this.dirtyKeys.size > 0) {
        clearTimeout(this.syncTimer);
        this._syncNow();       // async, might not finish
        this._keepAliveSync(); // fetch with keepalive as backup
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this._handleVisibility);
    }

    // Re-sync when coming back online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.initialized && this.dirtyKeys.size > 0) {
          this._scheduleSync(500);
        }
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PUBLIC API — same signature as original storage.js
  // ═══════════════════════════════════════════════════════════

  async get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  async set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));

      // Mark dirty for background sync (only if sync is active)
      if (this.initialized && SYNCED_KEYS.has(key)) {
        this.dirtyKeys.add(key);
        this._scheduleSync();
      }

      return true;
    } catch (e) {
      console.error(`[storage] Failed to write "${key}":`, e);
      return false;
    }
  }

  async remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SYNC LIFECYCLE
  // ═══════════════════════════════════════════════════════════

  /**
   * Initialize sync for an authenticated user.
   * Call once after login, before rendering the app.
   *
   * Flow: Pull remote → Merge with local → Push merged state
   */
  async initSync(userId) {
    // Already initialized for this user
    if (this.initialized && this.userId === userId) {
      return { success: true, errors: [] };
    }

    // Switching users — clean up previous state
    if (this.userId && this.userId !== userId) {
      this.reset(true);
    }

    this.userId = userId;

    // Cache auth token for keepalive requests
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      this._cachedToken = session?.access_token || null;
    } catch {
      this._cachedToken = null;
    }

    // Run migration for existing LS data
    this._migrateLocalData();

    const errors = [];

    try {
      // Race against timeout so the app doesn't hang
      await Promise.race([
        this._fullSync(errors),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Sync timeout')), INIT_TIMEOUT_MS)
        ),
      ]);
    } catch (err) {
      console.warn('[sync] Init failed/timed out, continuing with local data:', err.message);
      errors.push({ phase: 'init', error: err.message });
    }

    this.initialized = true;

    return { success: errors.length === 0, errors };
  }

  /**
   * Force an immediate sync of all dirty keys.
   * Call after critical operations (e.g., quiz completion).
   */
  async forceSync() {
    clearTimeout(this.syncTimer);
    await this._syncNow();
  }

  /**
   * Clean up on logout.
   * @param {boolean} clearLocal — if true, removes synced keys from LS
   */
  reset(clearLocal = false) {
    clearTimeout(this.syncTimer);
    this.initialized = false;
    this.dirtyKeys.clear();
    this.syncing = false;
    this._cachedToken = null;

    if (clearLocal) {
      for (const key of SYNCED_KEYS) {
        localStorage.removeItem(key);
      }
      // Clean sync metadata
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k?.startsWith('_sync_')) localStorage.removeItem(k);
      }
    }

    this.userId = null;
  }

  /** Remove event listeners. Call on app unmount. */
  destroy() {
    clearTimeout(this.syncTimer);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this._handleVisibility);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // INTERNAL — Full Sync (used during init)
  // ═══════════════════════════════════════════════════════════

  async _fullSync(errors) {
    // ── Phase 1: Pull ALL keys in PARALLEL ──
    const remoteData = {};

    const pullResults = await Promise.allSettled(
      [...SYNCED_KEYS].map(async (key) => {
        try {
          const handler = this._getHandler(key);
          const data = await handler.pull(supabase, this.userId);
          return { key, data };
        } catch (err) {
          err._syncKey = key;
          throw err;
        }
      })
    );

    for (const result of pullResults) {
      if (result.status === 'fulfilled') {
        remoteData[result.value.key] = result.value.data;
      } else {
        const key = result.reason?._syncKey || 'unknown';
        console.warn(`[sync] Pull failed: ${key}`, result.reason?.message);
        errors.push({ key, phase: 'pull', error: result.reason?.message });
        remoteData[key] = null;
      }
    }

    // ── Phase 2: Merge local + remote per handler strategy ──
    for (const key of SYNCED_KEYS) {
      const local = this._readLS(key);
      const remote = remoteData[key];

      // Nothing on either side
      if (remote === null && local === null) continue;

      const handler = this._getHandler(key);
      const merged = handler.merge(local, remote);

      if (merged !== null && merged !== undefined) {
        this._writeLS(key, merged);
      }
    }

    // ── Phase 3: Push ALL keys in PARALLEL ──
    const pushResults = await Promise.allSettled(
      [...SYNCED_KEYS].map(async (key) => {
        const data = this._readLS(key);
        if (data === null) return null;
        const handler = this._getHandler(key);
        await handler.push(supabase, this.userId, data);
        return key;
      })
    );

    for (const result of pushResults) {
      if (result.status === 'rejected') {
        console.warn(`[sync] Push failed:`, result.reason);
        errors.push({ phase: 'push', error: result.reason?.message });
      }
    }

    // ── Phase 4: Notify app ──
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage-synced'));
    }
  }

  // ═══════════════════════════════════════════════════════════
  // INTERNAL — Background Sync Engine
  // ═══════════════════════════════════════════════════════════

  _scheduleSync(delay = SYNC_DEBOUNCE_MS) {
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => this._syncNow(), delay);
  }

  async _syncNow() {
    if (!this.initialized || this.syncing || !this.userId) return;
    if (this.dirtyKeys.size === 0) return;

    this.syncing = true;
    const keys = [...this.dirtyKeys];
    this.dirtyKeys.clear();

    for (const key of keys) {
      try {
        const handler = this._getHandler(key);
        const data = this._readLS(key);
        if (data !== null) {
          await handler.push(supabase, this.userId, data);
        }
      } catch (err) {
        console.error(`[sync] Push failed: ${key}`, err.message);
        this.dirtyKeys.add(key); // Retry next cycle
      }
    }

    this.syncing = false;

    // Retry failed keys with backoff
    if (this.dirtyKeys.size > 0) {
      this._scheduleSync(SYNC_RETRY_MS);
    }
  }

  /**
   * Last-resort sync using fetch with keepalive.
   * Fires on tab close — only handles generic (user_data) keys
   * since they can be batched into one small request.
   * Structured tables sync on next init if this misses.
   */
  _keepAliveSync() {
    if (!this.userId || !this._cachedToken) return;

    // Batch all dirty generic keys into one user_data upsert
    const rows = [];
    for (const key of this.dirtyKeys) {
      if (STRUCTURED_HANDLERS[key]) continue; // Skip structured — too complex for keepalive
      const data = this._readLS(key);
      if (data === null) continue;

      rows.push({
        user_id: this.userId,
        key,
        value: data,
        updated_at: new Date().toISOString(),
      });
    }

    if (rows.length === 0) return;

    const body = JSON.stringify(rows);

    // keepalive has 64KB limit — only attempt if payload fits
    if (body.length > 60000) return;

    try {
      fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${this._cachedToken}`,
          Prefer: 'resolution=merge-duplicates',
        },
        body,
        keepalive: true,
      }).catch(() => {}); // Best effort — no error handling needed
    } catch {
      // Swallow — page is unloading
    }
  }

  // ═══════════════════════════════════════════════════════════
  // INTERNAL — Helpers
  // ═══════════════════════════════════════════════════════════

  _getHandler(key) {
    if (STRUCTURED_HANDLERS[key]) return STRUCTURED_HANDLERS[key];

    // Lazily create and cache generic handlers
    if (!this._genericHandlers.has(key)) {
      this._genericHandlers.set(key, createGenericHandler(key));
    }
    return this._genericHandlers.get(key);
  }

  _readLS(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  _writeLS(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`[storage] LS write failed for "${key}":`, e);
    }
  }

  /**
   * One-time migration for existing localStorage data.
   * Normalizes data shapes so handlers can process them cleanly.
   * Safe to run multiple times (idempotent).
   */
  _migrateLocalData() {
    if (localStorage.getItem('_sync_migration_v1')) return;

    // Ensure quizProgress entries all have required fields
    const rawProgress = this._readLS('quizProgress');
    if (Array.isArray(rawProgress)) {
      const fixed = rawProgress.map(([quizId, result]) => [
        quizId,
        {
          quizId: result?.quizId || quizId,
          totalQuestions: result?.totalQuestions || 0,
          answeredQuestions: result?.answeredQuestions || 0,
          score: result?.score || 0,
          totalScore: result?.totalScore || 0,
          percentage: result?.percentage || 0,
          timeSpent: result?.timeSpent || 0,
          completedAt: result?.completedAt || new Date().toISOString(),
          answers: result?.answers || [],
          completed: result?.completed ?? true,
        },
      ]);
      this._writeLS('quizProgress', fixed);
    }

    // Ensure bookmarks have consistent shape
    const rawBookmarks = this._readLS('bookmarks');
    if (Array.isArray(rawBookmarks)) {
      const fixed = rawBookmarks.map(([qId, bm]) => [
        qId,
        {
          id: bm?.id || `bookmark_${qId}`,
          questionId: bm?.questionId || qId,
          ...(typeof bm === 'object' ? bm : {}),
          createdAt: bm?.createdAt || new Date().toISOString(),
        },
      ]);
      this._writeLS('bookmarks', fixed);
    }

    localStorage.setItem('_sync_migration_v1', Date.now().toString());
    console.log('[sync] Local data migration complete');
  }
}

// ─── Singleton Export (same as original) ─────────────────────

const storage = new SyncedStorage();
export default storage;