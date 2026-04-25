import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { cn, components } from '../../utils/designTokens';
import { DocumentExtractor } from '../buggu/DocumentExtractor';

// ─── Icons ─────────────────────────────────────────────────────────────────────

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 13.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

// ─── Step Indicator ─────────────────────────────────────────────────────────────

const STEPS = ['Add JD', 'Analyzing', 'Review'];

const StepIndicator = ({ current }) => (
  <div className="flex items-center gap-0">
    {STEPS.map((label, i) => {
      const done    = i < current;
      const active  = i === current;
      const isLast  = i === STEPS.length - 1;
      return (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-1.5">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300',
              done   ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm shadow-amber-400/40' :
              active ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/40 scale-110' :
                       'bg-slate-100'
            )}>
              {done
                ? <CheckIcon />
                : <span className={cn('text-[11px] font-bold', active ? 'text-white' : 'text-slate-400')}>
                    {i + 1}
                  </span>
              }
              {done && <span className="text-white"><CheckIcon /></span>}
            </div>
            <span className={cn(
              'text-[10px] font-semibold whitespace-nowrap transition-colors duration-200',
              active ? 'text-amber-600' : done ? 'text-slate-500' : 'text-slate-300'
            )}>
              {label}
            </span>
          </div>

          {!isLast && (
            <div className={cn(
              'h-px w-12 sm:w-16 mx-1 mb-5 transition-all duration-500',
              done ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-slate-200'
            )} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Step 2: Processing ─────────────────────────────────────────────────────────

const ProcessingStep = ({ progress }) => {
  const pct = progress?.progress ?? 0;
  const msg = progress?.message  ?? 'Analyzing job description…';

  // Animated dots for the label
  const [dots, setDots] = useState('');
  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(id);
  }, []);

  const stages = [
    { label: 'Parsing document',   done: pct >= 30 },
    { label: 'Extracting skills',  done: pct >= 60 },
    { label: 'Structuring data',   done: pct >= 90 },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-8 px-6 gap-8">
      {/* Animated icon */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-500/30">
          <SparklesIcon />
          <span className="text-white absolute"><SparklesIcon /></span>
        </div>
        {/* Orbit ring */}
        <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/40 animate-ping" style={{ animationDuration: '2s' }} />
      </div>

      {/* Message */}
      <div className="text-center">
        <p className="text-base font-semibold text-slate-800">{msg}{dots}</p>
        {progress?.stage && (
          <span className="inline-block mt-1 text-xs text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full font-medium">
            {progress.stage}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full space-y-2">
        <div className="flex justify-between text-xs text-slate-400 font-medium">
          <span>Progress</span>
          <span className="tabular-nums font-semibold text-amber-600">{pct}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 bg-[length:200%] animate-shimmer transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Mini stage checklist */}
      <div className="w-full space-y-2">
        {stages.map((s, i) => (
          <div key={i} className={cn(
            'flex items-center gap-2.5 text-sm transition-all duration-300',
            s.done ? 'text-slate-700' : 'text-slate-400'
          )}>
            <div className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300',
              s.done
                ? 'bg-green-100 text-green-600'
                : 'bg-slate-100'
            )}>
              {s.done
                ? <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 13.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                : <span className="w-1.5 h-1.5 bg-slate-300 rounded-full block" />
              }
            </div>
            <span className={s.done ? 'font-medium' : ''}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Step 3: Review ─────────────────────────────────────────────────────────────

const ReviewStep = ({ jdData, onReset }) => {
  const mustHave    = jdData?.skills?.must_have    || [];
  const niceToHave  = jdData?.skills?.nice_to_have || [];
  const domains     = jdData?.domain               || [];
  const expMin      = jdData?.experience?.min_years;
  const expMax      = jdData?.experience?.max_years;

  const expLabel = expMin
    ? (expMax ? `${expMin}–${expMax} yrs` : `${expMin}+ yrs`)
    : 'Not specified';

  return (
    <div className="space-y-4 px-6 pb-2">
      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-xl p-3.5 border border-blue-100/80">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
              <BriefcaseIcon />
            </div>
            <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">Role</span>
          </div>
          <p className="text-sm font-semibold text-slate-900 truncate">
            {jdData?.raw_title || jdData?.role?.title || 'Not specified'}
          </p>
        </div>

        <div className="bg-purple-50 rounded-xl p-3.5 border border-purple-100/80">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
              <ClockIcon />
            </div>
            <span className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider">Experience</span>
          </div>
          <p className="text-sm font-semibold text-slate-900">{expLabel}</p>
        </div>
      </div>

      {/* Must-have skills */}
      {mustHave.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
            Must-have skills
            <span className="text-slate-300 font-normal">· {mustHave.length}</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {mustHave.slice(0, 10).map((skill, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs font-medium bg-green-50 text-green-700 px-2.5 py-1 rounded-full ring-1 ring-green-200/70">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 13.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                {skill.name || skill}
              </span>
            ))}
            {mustHave.length > 10 && (
              <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full ring-1 ring-slate-200/70">
                +{mustHave.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Nice-to-have */}
      {niceToHave.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
            Nice-to-have
            <span className="text-slate-300 font-normal">· {niceToHave.length}</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {niceToHave.slice(0, 6).map((skill, i) => (
              <span key={i} className="text-xs font-medium bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full ring-1 ring-amber-200/70">
                {skill.name || skill}
              </span>
            ))}
            {niceToHave.length > 6 && (
              <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full ring-1 ring-slate-200/70">
                +{niceToHave.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Domain tags */}
      {domains.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400" />
            Domain
          </p>
          <div className="flex flex-wrap gap-1.5">
            {domains.map((d, i) => (
              <span key={i} className="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full ring-1 ring-blue-200/70">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reset link */}
      <button
        onClick={onReset}
        className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
      >
        ← Parse a different JD
      </button>
    </div>
  );
};

// ─── Main Modal ─────────────────────────────────────────────────────────────────

export const JDSearchModal = ({ isOpen, onClose, onJDExtracted }) => {
  const navigate = useNavigate();
  const [step, setStep]             = useState(0);   // 0 input | 1 processing | 2 review
  const [jdData, setJdData]         = useState(null);
  const [progress, setProgress]     = useState(null);
  const [error, setError]           = useState(null);
  const [processingStarted, setProcessingStarted] = useState(false);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // ── Reset on open ──────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setJdData(null);
      setProgress(null);
      setError(null);
      setProcessingStarted(false);
    }
  }, [isOpen]);

  // ── Body scroll lock ───────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // ── Escape to close ────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === 'Escape' && step !== 1) handleClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, step]);

  const handleClose = useCallback(() => {
    if (step === 1) return; // Block close while processing
    setStep(0);
    setJdData(null);
    setProgress(null);
    setError(null);
    setProcessingStarted(false);
    onClose();
  }, [onClose, step]);

  const handleProgress = useCallback((p) => {
    setProgress(p);
    if (p.stage === 'started' || (p.progress > 0 && p.progress < 100)) {
      setProcessingStarted(true);
      setStep(1);
    }
  }, []);

  const handleExtract = useCallback((data) => {
    setJdData(data);
    setProgress(null);
    setError(null);

    // If processing was started, show step 1 briefly before moving to step 2
    if (processingStarted) {
      setStep(1);
      setTimeout(() => setStep(2), 800);
    } else {
      setStep(2);
    }
  }, [processingStarted]);

  const handleError = useCallback((err) => {
    setError(err.message || 'Extraction failed. Please try again.');
    setStep(0);
    setProgress(null);
  }, []);

  const handleReset = () => {
    setStep(0);
    setJdData(null);
    setProgress(null);
    setError(null);
    setProcessingStarted(false);
  };

  if (!isOpen) return null;

  const titles = [
    'Parse Job Description',
    'Analyzing…',
    'Ready to Match',
  ];

  const subtitles = [
    'Upload a file or paste the job description text',
    'AI is extracting skills and requirements',
    'Review the extracted data before searching',
  ];

  return createPortal(
    <>
      <style>{`
        @keyframes jd-backdrop { from { opacity: 0; } to { opacity: 1; } }
        @keyframes jd-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes jd-shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        .jd-backdrop   { animation: jd-backdrop 0.2s ease; }
        .jd-modal      { animation: jd-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .jd-shimmer    {
          background-size: 200% 100%;
          animation: jd-shimmer 2s linear infinite;
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="jd-backdrop fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <div
          className="jd-modal relative w-full max-w-lg bg-white rounded-2xl shadow-2xl shadow-slate-900/20 flex flex-col overflow-hidden"
          style={{ maxHeight: 'min(90vh, 680px)' }}
          onClick={e => e.stopPropagation()}
        >

          {/* ── Header ──────────────────────────────────────────── */}
          <div className="px-6 pt-6 pb-5 flex-shrink-0">
            {/* Top row: icon + close */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/30 text-white flex-shrink-0">
                  <SparklesIcon />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">{titles[step]}</h2>
                  <p className="text-xs text-slate-500 leading-tight mt-0.5">{subtitles[step]}</p>
                </div>
              </div>

              <button
                onClick={handleClose}
                disabled={step === 1}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200',
                  'bg-slate-100 text-slate-500',
                  step === 1
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-slate-200 hover:text-slate-700 active:scale-95'
                )}
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex justify-center">
              <StepIndicator current={step} />
            </div>
          </div>

          {/* ── Divider ─────────────────────────────────────────── */}
          <div className="h-px bg-slate-100 flex-shrink-0" />

          {/* ── Body ────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto min-h-0">

            {/* Step 0 — Input */}
            {step === 0 && (
              <div className="px-6 py-5 space-y-4">
                {/* Error */}
                {error && (
                  <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 text-red-500">
                      <AlertIcon />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-800">Extraction failed</p>
                      <p className="text-xs text-red-600 mt-0.5 leading-relaxed">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-300 hover:text-red-500 transition-colors flex-shrink-0">
                      <CloseIcon />
                    </button>
                  </div>
                )}

                {/* No API key warning */}
                {!apiKey ? (
                  <div className="flex flex-col items-center gap-4 py-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
                      <AlertIcon />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 mb-1">API Key Required</p>
                      <p className="text-xs text-slate-500 mb-3 max-w-xs mx-auto">
                        Configure your Gemini API key to enable AI-powered JD parsing.
                      </p>
                      <code className="text-xs bg-slate-100 text-slate-700 px-3 py-2 rounded-lg font-mono">
                        VITE_GEMINI_API_KEY=your_key
                      </code>
                    </div>
                  </div>
                ) : (
                  /* DocumentExtractor — your existing component, clean wrapper */
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                    <div className="p-5">
                      <DocumentExtractor
                        apiKey={apiKey}
                        onExtract={handleExtract}
                        onError={handleError}
                        onProgress={handleProgress}
                        showTextInput={true}
                        showFileUpload={true}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 1 — Processing */}
            {step === 1 && (
              <ProcessingStep progress={progress} />
            )}

            {/* Step 2 — Review */}
            {step === 2 && jdData && (
              <div className="py-5">
                <ReviewStep jdData={jdData} onReset={handleReset} />
              </div>
            )}
          </div>

          {/* ── Footer ──────────────────────────────────────────── */}
          {step === 2 && jdData && (
            <>
              <div className="h-px bg-slate-100 flex-shrink-0" />
              <div className="px-6 py-4 bg-slate-50/80 flex-shrink-0 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Ready to find candidates
                </div>

                <button
                  onClick={() => {
                    if (onJDExtracted) onJDExtracted(jdData);
                    handleClose();
                    navigate('/results', { state: { jd: jdData } });
                  }}
                  className={cn(
                    components.button.base,
                    components.button.variants.primary,
                    'text-sm px-6 h-10 min-h-0 rounded-xl gap-2'
                  )}
                >
                  <SearchIcon />
                  Find Candidates
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};

export default JDSearchModal;