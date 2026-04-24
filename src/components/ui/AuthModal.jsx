import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Mail,
  Lock,
  X,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle,
} from 'lucide-react';

const AuthModal = ({ isOpen, onClose, defaultMode = 'login' }) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [visible, setVisible] = useState(false);

  const modalRef = useRef(null);
  const emailRef = useRef(null);
  const firstFocusableRef = useRef(null);

  // ── sync defaultMode prop ──────────────────────────────────
  useEffect(() => setMode(defaultMode), [defaultMode]);

  // ── open / close choreography + body-scroll lock ───────────
  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => setVisible(true));
      document.body.style.overflow = 'hidden';
      const focus = setTimeout(() => emailRef.current?.focus(), 160);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(focus);
      };
    }
    setVisible(false);
    document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ── helpers ────────────────────────────────────────────────
  const resetFields = useCallback(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError('');
    setSuccess('');
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      onClose();
      resetFields();
    }, 220);
  }, [onClose, resetFields]);

  // ── Escape key ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && isOpen && handleClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  // ── basic focus trap ───────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      const focusable = modalRef.current.querySelectorAll(
        'button, input, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
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

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError('');
    setSuccess('');
    setTimeout(() => emailRef.current?.focus(), 80);
  };

  // ── submit ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      const result =
        mode === 'login'
          ? await signIn(email, password)
          : await signUp(email, password);

      if (result.success) {
        if (mode === 'signup') {
          setSuccess('Account created! Check your email to verify.');
          setTimeout(handleClose, 2200);
        } else {
          handleClose();
        }
      } else {
        setError(result.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── don't render when fully closed ─────────────────────────
  if (!isOpen) return null;

  // ── shared input classes (amber focus ring) ────────────────
  const inputCls =
    'w-full py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 ' +
    'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 ' +
    'focus:border-amber-500 transition-all duration-200';

  // ── render ─────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      {/* ─── Backdrop ──────────────────────────────────────── */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* ─── Centring wrapper ──────────────────────────────── */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl
            transform transition-all duration-200
            ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}
        >
          
          <div className="p-8">
            {/* ─── Close button ─────────────────────────────── */}
            <button
              ref={firstFocusableRef}
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600
                         hover:bg-slate-100 rounded-lg transition-all duration-150
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* ─── Header ──────────────────────────────────── */}
            <div className="text-center mb-8">
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center
                           rounded-full bg-gradient-to-br from-amber-500 to-orange-600
                           shadow-lg shadow-amber-600/25"
              >
                <Lock className="h-7 w-7 text-white" />
              </div>

              <h2
                id="auth-modal-title"
                className="text-2xl font-bold text-slate-900 mb-1"
              >
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>

              <p className="text-sm text-slate-500">
                {mode === 'login'
                  ? 'Sign in to continue your learning journey'
                  : 'Join Resident Quest to track your progress'}
              </p>
            </div>

            {/* ─── Form ────────────────────────────────────── */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* error banner */}
              {error && (
                <div
                  className="flex items-start gap-3 rounded-xl border border-red-200
                             bg-red-50 p-3 text-sm text-red-700
                             animate-[fadeSlideIn_200ms_ease-out]"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* success banner */}
              {success && (
                <div
                  className="flex items-start gap-3 rounded-xl border border-green-200
                             bg-green-50 p-3 text-sm text-green-700
                             animate-[fadeSlideIn_200ms_ease-out]"
                  role="status"
                >
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {/* email */}
              <div>
                <label
                  htmlFor="auth-email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={emailRef}
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={`${inputCls} pl-10 pr-4`}
                  />
                </div>
              </div>

              {/* password */}
              <div>
                <label
                  htmlFor="auth-password"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={
                      mode === 'login' ? 'current-password' : 'new-password'
                    }
                    placeholder="••••••••"
                    className={`${inputCls} pl-10 pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                               hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {mode === 'signup' && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Must be at least 6 characters
                  </p>
                )}
              </div>

              {/* confirm password (signup only) */}
              {mode === 'signup' && (
                <div className="animate-[fadeSlideIn_200ms_ease-out]">
                  <label
                    htmlFor="auth-confirm-password"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="auth-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className={`${inputCls} pl-10 pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                                 hover:text-slate-600 transition-colors"
                      aria-label={
                        showConfirmPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl
                           bg-gradient-to-r from-amber-600 to-orange-600
                           px-4 py-2.5 font-semibold text-white
                           shadow-lg shadow-amber-600/25
                           hover:from-amber-700 hover:to-orange-700
                           hover:shadow-amber-600/40
                           active:scale-[0.98]
                           focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-offset-2 focus-visible:ring-amber-600
                           disabled:cursor-not-allowed disabled:opacity-50
                           disabled:shadow-none disabled:active:scale-100
                           transition-all duration-150"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                  </>
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            {/* ─── Divider ─────────────────────────────────── */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs uppercase tracking-wider text-slate-400">
                  or
                </span>
              </div>
            </div>

            {/* ─── Switch mode ─────────────────────────────── */}
            <p className="text-center text-sm text-slate-500">
              {mode === 'login'
                ? "Don't have an account?"
                : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={switchMode}
                className="font-semibold text-amber-600 hover:text-amber-700
                           transition-colors focus-visible:outline-none
                           focus-visible:underline"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>

            {/* ─── Guest fallback ──────────────────────────── */}
            <button
              type="button"
              onClick={handleClose}
              className="mx-auto mt-3 block text-sm text-slate-400
                         hover:text-slate-600 transition-colors
                         focus-visible:outline-none focus-visible:text-slate-600"
            >
              Continue as guest →
            </button>
          </div>
        </div>
      </div>

      {/* inline keyframe for the alert banners & confirm field */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AuthModal;