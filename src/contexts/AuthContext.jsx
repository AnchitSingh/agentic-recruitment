import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { supabase } from '../lib/supabase';
import storage from '../utils/storage';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════════════════
   AuthContext
   ─────────────────────────────────────────────────────────────────
   Session lifecycle   Supabase auth state ↔ storage sync
   Splash screen       Branded loading / error-recovery overlay
   Auth operations     signIn · signUp · signOut · resetPassword
                       updatePassword
   ═══════════════════════════════════════════════════════════════════ */

const INIT_TIMEOUT_MS = 15_000;

/* ── Splash keyframes (scoped prefix avoids collisions) ── */
const SPLASH_KEYFRAMES = `
  @keyframes ebAuthSpin {
    to { transform: rotate(360deg); }
  }
  @keyframes ebAuthFadeUp {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes ebAuthDot {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
    40%           { transform: translateY(-5px); opacity: 1; }
  }
`;

/* ═══════════════════════════════════════════════════════════════════
   SplashScreen
   ─────────────────────────────────────────────────────────────────
   Full-page overlay shown until auth + storage sync completes.
   • Loading state: spinning ring · EB logo · bouncing dots
   • Error state:   red logo · message · amber retry button
   Inherits the floating-island design language from GlobalHeader.
   ═══════════════════════════════════════════════════════════════════ */
const SplashScreen = ({ error, onRetry }) => (
  <>
    <style>{SPLASH_KEYFRAMES}</style>

    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center
                 bg-gradient-to-br from-slate-50 via-white to-amber-50/30
                 select-none"
      role={error ? 'alert' : 'status'}
      aria-live="polite"
      aria-label={error ? 'Initialisation error' : 'Loading application'}
    >
      <div
        className="flex flex-col items-center px-8"
        style={{ animation: 'ebAuthFadeUp 0.5s ease-out both' }}
      >
        {/* ── Spinner ring + centre logo ── */}
        <div className="relative w-[76px] h-[76px] mb-8">
          {/* Track */}
          <div className="absolute inset-0 rounded-full border-[3px] border-amber-100/70" />

          {/* Arc — only while loading */}
          {!error && (
            <div
              className="absolute inset-0 rounded-full border-[3px] border-transparent
                         border-t-amber-500 border-r-orange-500"
              style={{
                animation:
                  'ebAuthSpin 0.9s cubic-bezier(0.45,0.05,0.55,0.95) infinite',
              }}
            />
          )}

          {/* Centre mark */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center
                          shadow-md transition-colors duration-300 ${
                error
                  ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/20'
                  : 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/25'
              }`}
            >
              {error ? (
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M12 9v4m0 4h.01" />
                </svg>
              ) : (
                <span className="text-white font-bold text-sm tracking-tight">
                  EB
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Text / action ── */}
        {error ? (
          <>
            <p className="text-sm font-semibold text-slate-700 mb-1 text-center">
              Something went wrong
            </p>
            <p className="text-xs text-slate-400 mb-6 text-center max-w-[280px] leading-relaxed">
              {error}
            </p>
            <button
              onClick={onRetry}
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-white
                         bg-gradient-to-r from-amber-500 to-orange-600
                         shadow-md shadow-amber-500/25
                         hover:shadow-lg hover:shadow-amber-500/35
                         active:scale-[0.97] transition-all duration-200
                         focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            >
              Try Again
            </button>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-400 mb-3 tracking-wide">
              Loading your data
            </p>
            <div className="flex space-x-1.5" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-amber-400"
                  style={{
                    animation: `ebAuthDot 1.4s ease-in-out ${i * 0.16}s infinite`,
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  </>
);

/* ═══════════════════════════════════════════════════════════════════
   Context + hook
   ═══════════════════════════════════════════════════════════════════ */
const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

/* ═══════════════════════════════════════════════════════════════════
   AuthProvider
   ─────────────────────────────────────────────────────────────────
   Lifecycle
   ┌───────────────────────────────────────────────────────────────┐
   │  mount → onAuthStateChange listener                          │
   │                                                              │
   │  INITIAL_SESSION / SIGNED_IN                                 │
   │    → setUser → storage.initSync → ready                      │
   │                                                              │
   │  TOKEN_REFRESHED                                             │
   │    → setUser → cache token (skip full sync) → ready          │
   │                                                              │
   │  no session                                                  │
   │    → guest mode → ready                                      │
   │                                                              │
   │  SIGNED_OUT                                                  │
   │    → storage.reset → setUser(null)                           │
   │    (stays ready — app re-renders in guest mode)              │
   │                                                              │
   │  15 s timeout (safety)                                       │
   │    → initError → splash shows retry                          │
   └───────────────────────────────────────────────────────────────┘
   ═══════════════════════════════════════════════════════════════════ */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState(null);

  /* Prevent double initialization */
  const initRef = useRef(false);

  /* ── Session lifecycle ── */
  useEffect(() => {
    let mounted = true;

    /* ── Single handler for any session ── */
    async function handleAuth(session, event) {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);

        // Skip full sync on token refresh — just update cached token
        if (event === 'TOKEN_REFRESHED') {
          storage._cachedToken = session.access_token;
          if (!ready) setReady(true);
          return;
        }

        // Prevent duplicate initSync calls
        if (initRef.current) {
          if (!ready) setReady(true);
          return;
        }
        
        initRef.current = true;

        // Run sync with safety net
        try {
          await storage.initSync(session.user.id);
        } catch (err) {
          console.error('[Auth] initSync failed:', err);
        }

        if (mounted) setReady(true);

      } else {
        // No session (anonymous or signed out)
        if (event === 'SIGNED_OUT') {
          storage.reset(true);
          initRef.current = false;
        }
        setUser(null);
        if (mounted) setReady(true);
      }
    }

    /* ── Primary: getSession (guaranteed to resolve) ── */
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuth(session, 'INITIAL_SESSION');
    }).catch((err) => {
      console.error('[Auth] getSession failed:', err);
      if (mounted) setReady(true);
    });

    /* ── Secondary: listen for future changes ── */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Skip INITIAL_SESSION — already handled by getSession above
      if (event === 'INITIAL_SESSION') return;
      handleAuth(session, event);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      storage.destroy();
    };
  }, [ready]);

  /* ═════════════════════════════════════════════════════════════════
     Auth operations
     Each returns { success, data?, error? } so callers can branch
     without wrapping in their own try/catch.
     ═════════════════════════════════════════════════════════════════ */

  const signUp = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      toast.success('Account created! Check your email to verify.');
      return { success: true, data };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  const signIn = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast.success('Welcome back!');
      return { success: true, data };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/browse`,
        },
      });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Manually clear user state and storage immediately
      setUser(null);
      storage.reset(true);
      
      toast.success('Signed out');
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  const resetPassword = useCallback(async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Reset link sent — check your inbox.');
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      toast.success('Password updated!');
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  /* ── Memoised context value ── */
  const value = useMemo(
    () => ({
      user,
      ready,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [user, ready, signUp, signIn, signInWithGoogle, signOut, resetPassword, updatePassword],
  );

  /* ── Gate: splash until initialised ── */
  if (!ready) {
    return (
      <SplashScreen
        error={initError}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};