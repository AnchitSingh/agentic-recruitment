import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import useQuizState from '../hooks/useQuizState';
import BackgroundEffects from '../components/ui/BackgroundEffects';
import QuizHeader from '../components/quiz/QuizHeader';
import { backgrounds, cn } from '../utils/designTokens';
import { fetchQuizBySlug } from '../services/backendAPI';

/* ═══════════════════════════════════════════════════════════════════
   Style injection (once, SSR-safe — replaces QuizStyles component)
   ═══════════════════════════════════════════════════════════════════ */
let _injected = false;
function injectStyles() {
  if (_injected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.textContent = `
    @keyframes qp-fade-in{from{opacity:0}to{opacity:1}}
    @keyframes qp-fade-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes qp-scale-in{from{transform:scale(.95);opacity:0}to{transform:scale(1);opacity:1}}
    .qp-fade-in{animation:qp-fade-in .3s ease-out both}
    .qp-fade-up{animation:qp-fade-up .4s ease-out both}
    .qp-scale-in{animation:qp-scale-in .3s ease-out both}
    .qp-scroll::-webkit-scrollbar{height:4px}
    .qp-scroll::-webkit-scrollbar-track{background:#f1f5f9;border-radius:10px}
    .qp-scroll::-webkit-scrollbar-thumb{background:#fbbf24;border-radius:10px}
  `;
  document.head.appendChild(el);
  _injected = true;
}

/* ═══════════════════════════════════════════════════════════════════
   StatusScreen — Unified loading / error / empty state
   ═══════════════════════════════════════════════════════════════════ */
const STATUS_ICONS = {
  spinner: (
    <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
  ),
  loading: (
    <svg className="w-8 h-8 text-amber-600 animate-spin" fill="none" stroke="currentColor"
      viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0
           0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  error: (
    <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12
           2zm-1 15v-2h2v2h-2zm0-10v6h2V7h-2z" />
    </svg>
  ),
  info: (
    <svg className="w-8 h-8 text-amber-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12
           2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  ),
};

const ActionBtn = memo(({ onClick, primary, children }) => (
  <button
    onClick={onClick}
    className={cn(
      'px-6 py-3 font-semibold rounded-xl transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2',
      primary
        ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:shadow-lg active:scale-[.98]'
        : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    )}
  >
    {children}
  </button>
));
ActionBtn.displayName = 'ActionBtn';

const StatusScreen = memo(({ variant = 'loading', title, message, actions, children }) => (
  <div className={cn(backgrounds.pageMinHeight, 'min-h-screen')} role="status" aria-live="polite">
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="text-center max-w-md qp-fade-up">
        {variant === 'spinner' ? (
          <div className="mb-6">{STATUS_ICONS.spinner}</div>
        ) : (
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
            variant === 'error' ? 'bg-red-100' : 'bg-amber-100',
          )}>
            {STATUS_ICONS[variant] || STATUS_ICONS.info}
          </div>
        )}
        {title && <h2 className="text-xl font-semibold text-slate-800 mb-2">{title}</h2>}
        {message && <p className="text-slate-600 mb-6">{message}</p>}
        {children}
        {actions && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">{actions}</div>
        )}
      </div>
    </div>
  </div>
));
StatusScreen.displayName = 'StatusScreen';

/* ═══════════════════════════════════════════════════════════════════
   OptionButton — Single MCQ answer option
   ═══════════════════════════════════════════════════════════════════ */
const OptionButton = memo(({ index, text, isSelected, disabled, onSelect }) => (
  <button
    role="radio"
    aria-checked={isSelected}
    onClick={() => onSelect(index)}
    disabled={disabled}
    className={cn(
      'group w-full text-left p-4 rounded-2xl border-2 transition-all duration-300',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2',
      isSelected
        ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-orange-50 shadow-lg scale-[1.02]'
        : 'border-white/50 bg-white/60 hover:border-amber-200 hover:bg-white/80 hover:shadow-md',
      'backdrop-blur-sm',
      disabled && !isSelected && 'opacity-50 cursor-not-allowed',
      disabled && isSelected && 'cursor-default',
    )}
  >
    <div className="flex items-center gap-3">
      {/* Radio dot */}
      <span
        className={cn(
          'w-7 h-7 rounded-full border-2 flex items-center justify-center',
          'transition-all duration-300 shrink-0',
          isSelected
            ? 'border-amber-500 bg-amber-500 shadow-sm shadow-amber-500/30'
            : 'border-slate-300 group-hover:border-amber-300',
        )}
      >
        {isSelected && (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor"
            viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"
              d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>

      {/* Letter badge */}
      <span
        className={cn(
          'text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center',
          'shrink-0 transition-colors duration-200',
          isSelected
            ? 'bg-amber-500 text-white'
            : 'bg-slate-100 text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-700',
        )}
      >
        {String.fromCharCode(65 + index)}
      </span>

      {/* Text */}
      <span
        className={cn(
          'text-base flex-1 min-w-0 break-words transition-colors duration-200',
          isSelected ? 'text-amber-800 font-medium' : 'text-slate-700',
        )}
      >
        {text}
      </span>
    </div>
  </button>
));
OptionButton.displayName = 'OptionButton';

/* ═══════════════════════════════════════════════════════════════════
   FeedbackPanel — Correct / incorrect explanation card
   ═══════════════════════════════════════════════════════════════════ */
const FeedbackPanel = memo(({ isCorrect, explanation, question }) => (
  <div className="mb-6 qp-scale-in" role="alert" aria-live="assertive">
    <div
      className={cn(
        'border rounded-2xl p-5 sm:p-6',
        isCorrect ? 'bg-green-50/80 border-green-200' : 'bg-red-50/80 border-red-200',
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
            isCorrect ? 'bg-green-100' : 'bg-red-100',
          )}
        >
          {isCorrect ? (
            <svg className="w-5 h-5 text-green-600" fill="currentColor"
              viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0
                   00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414
                   1.414l2 2a1 1 0 001.414 0l4-4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-600" fill="currentColor"
              viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0
                   00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414
                   1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414
                   10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              'font-semibold mb-3 text-sm sm:text-base',
              isCorrect ? 'text-green-800' : 'text-red-800',
            )}
          >
            {isCorrect ? 'Correct! Well done! 🎉' : 'Not quite right'}
          </h3>
          
          {/* Basic explanation */}
          {explanation && (
            <p className={cn(
              'text-sm leading-relaxed break-words mb-4',
              isCorrect ? 'text-green-700' : 'text-red-700',
            )}>
              {explanation}
            </p>
          )}

          {/* Distractor explanations */}
          {question.distractorExplanations && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Why the other choices are wrong
              </h4>
              {question.options.map((opt, idx) => {
                const expl = question.distractorExplanations[String(idx)];
                if (!expl || idx === parseInt(question.correctAnswer)) return null;
                return (
                  <div key={idx} className="mb-2 last:mb-0">
                    <strong className="text-red-600 text-sm">{String.fromCharCode(65 + idx)}) {opt.text}</strong>
                    <p className="text-slate-600 text-xs mt-1">{expl}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Key concept */}
          {question.keyConcept && (
            <div className="mb-4 p-3 bg-emerald-50/60 rounded-lg border border-emerald-200/50">
              <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
                🔑 Key Concept
              </h4>
              <p className="text-slate-700 text-xs leading-relaxed">{question.keyConcept}</p>
            </div>
          )}

          {/* Learning objective */}
          {question.learningObjective && (
            <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200/50">
              <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                🎯 Learning Objective
              </h4>
              <p className="text-slate-700 text-xs leading-relaxed">{question.learningObjective}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
));
FeedbackPanel.displayName = 'FeedbackPanel';

/* ═══════════════════════════════════════════════════════════════════
   Navigation sub-components
   ═══════════════════════════════════════════════════════════════════ */
const NavButton = memo(({ number, isActive, isAnswered, isSkipped, onClick, compact }) => (
  <button
    onClick={onClick}
    aria-label={`Question ${number}${isActive ? ' (current)' : isAnswered ? ' (answered)' : isSkipped ? ' (skipped)' : ''}`}
    aria-current={isActive ? 'step' : undefined}
    className={cn(
      'flex items-center justify-center font-medium transition-all duration-300 shrink-0',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1',
      compact ? 'w-10 h-10 rounded-xl text-xs' : 'aspect-square rounded-xl text-sm',
      isActive
        ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 scale-110'
        : isAnswered
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
          : isSkipped
            ? 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100'
            : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200',
    )}
  >
    {number}
  </button>
));
NavButton.displayName = 'NavButton';

const LEGEND_ITEMS = [
  { cls: 'bg-gradient-to-r from-amber-500 to-orange-500', label: 'Current' },
  { cls: 'bg-emerald-50 border border-emerald-200', label: 'Answered' },
  { cls: 'bg-amber-50 border border-amber-200', label: 'Skipped' },
  { cls: 'bg-slate-50 border border-slate-200', label: 'Pending' },
];

const NavLegend = memo(({ compact }) => (
  <div className={cn('text-xs', compact ? 'flex items-center justify-center gap-4 mt-2' : 'space-y-2 mt-6')}>
    {LEGEND_ITEMS.map(({ cls, label }) => (
      <div key={label} className="flex items-center gap-2">
        <span className={cn(compact ? 'w-3 h-3' : 'w-4 h-4', 'rounded shrink-0', cls)}
          aria-hidden="true" />
        <span className="text-slate-600">{label}</span>
      </div>
    ))}
  </div>
));
NavLegend.displayName = 'NavLegend';

const MobileNavigator = memo(({
  totalQuestions, currentQuestionNumber, userAnswers,
  skippedIndices, answeredCount, progress,
  isOpen, onToggle, onGoTo,
}) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 shadow-md border border-white/50">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-semibold text-slate-700">Questions</h3>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Collapse navigator' : 'Expand navigator'}
        className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <svg
          className={cn('w-5 h-5 transition-transform duration-200', isOpen && 'rotate-180')}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>

    {isOpen ? (
      <div className="qp-fade-in">
        <div className="overflow-x-auto qp-scroll pb-2">
          <div className="flex gap-2 min-w-max px-1 py-2">
            {Array.from({ length: totalQuestions }, (_, i) => (
              <NavButton
                key={i}
                number={i + 1}
                compact
                isActive={i + 1 === currentQuestionNumber}
                isAnswered={userAnswers[i] != null}
                isSkipped={skippedIndices.has(i)}
                onClick={() => onGoTo(i)}
              />
            ))}
          </div>
        </div>
        <NavLegend compact />
      </div>
    ) : (
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-600">
          {answeredCount} answered · {totalQuestions - answeredCount} remaining
        </span>
        <span className="text-xs font-medium text-amber-600 tabular-nums">
          {Math.round(progress)}%
        </span>
      </div>
    )}
  </div>
));
MobileNavigator.displayName = 'MobileNavigator';

/* ═══════════════════════════════════════════════════════════════════
   QuizPage — Main orchestrator
   ═══════════════════════════════════════════════════════════════════ */
const QuizPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const resetId = searchParams.get('reset_id');

  /* ── Backend quiz fetch ───────────────────────────────────────── */
  const [backendQuiz, setBackendQuiz] = useState(null);
  const [loadingBackend, setLoadingBackend] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!slug || fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      setLoadingBackend(true);
      try {
        const res = await fetchQuizBySlug(slug);
        if (res.success) {
          setBackendQuiz({
            quizData: {
              ...res.data,
              source: 'backend',
              slug,
              config: {
                totalTimer: res.data.timeLimit * 60,
                questionTimer: null,
                immediateFeedback: true,
                showExplanations: true,
              },
            },
          });
        } else {
          setBackendError(res.error || 'Quiz not found');
          toast.error(res.error || 'Quiz not found');
        }
      } catch {
        setBackendError('Failed to load quiz');
        toast.error('Failed to load quiz');
      } finally {
        setLoadingBackend(false);
      }
    })();
  }, [slug]);

  /* ── Quiz config (immutable derivation) ───────────────────────── */
  const quizConfig = useMemo(() => {
    if (!backendQuiz) {
      const local = location.state?.quizConfig || null;
      if (!local) return null;
      return resetId ? { ...local, restoreFromQuizId: resetId } : local;
    }
    return {
      quizData: backendQuiz.quizData,
      restoreFromQuizId: resetId || null,
    };
  }, [backendQuiz, resetId, location.state?.quizConfig]);

  /* ── Core quiz state ──────────────────────────────────────────── */
  const answerRef = useRef(null);
  const questionRef = useRef(null);

  const {
    quiz, config,
    currentQuestion, currentQuestionIndex, currentQuestionNumber,
    timeRemaining, isQuizActive,
    isLoading, error,
    showFeedback, selectedAnswer, userAnswers,
    isLastQuestion, progress, isBookmarked,
    selectAnswer, nextQuestion, previousQuestion,
    toggleBookmark, pauseQuiz, stopQuiz,
    toggleImmediateFeedback, goToQuestion, clearError,
  } = useQuizState(quizConfig, answerRef);

  /* ── Local UI state ───────────────────────────────────────────── */
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isPausingQuiz, setIsPausingQuiz] = useState(false);
  const [isStoppingQuiz, setIsStoppingQuiz] = useState(false);

  // Keep answer ref in sync for useQuizState
  answerRef.current = { selectedAnswer };

  /* ── Effects ──────────────────────────────────────────────────── */
  useEffect(injectStyles, []);

  // Auto-finish when timer expires (ref avoids stale closure)
  const confirmStopRef = useRef(null);
  useEffect(() => { confirmStopRef.current = handleConfirmStop; });
  useEffect(() => {
    if (timeRemaining === 0 && isQuizActive && config?.timerEnabled) {
      confirmStopRef.current?.();
    }
  }, [timeRemaining, isQuizActive, config?.timerEnabled]);

  // Prevent accidental tab close during active quiz
  useEffect(() => {
    if (!isQuizActive) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isQuizActive]);

  // Focus question card after navigation for screen readers
  useEffect(() => {
    questionRef.current?.focus({ preventScroll: true });
  }, [currentQuestionIndex]);

  // Keyboard shortcuts: ←→ navigate, 1-9 select, B bookmark
  useEffect(() => {
    if (!isQuizActive || showPauseModal || showStopModal) return;

    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      switch (e.key) {
        case 'ArrowRight':
          if (!isLastQuestion && currentQuestion) { e.preventDefault(); nextQuestion(); }
          break;
        case 'ArrowLeft':
          if (currentQuestionNumber > 1) { e.preventDefault(); previousQuestion(); }
          break;
        case 'b': case 'B':
          if (!e.metaKey && !e.ctrlKey) { e.preventDefault(); toggleBookmark(); }
          break;
        default: {
          const n = parseInt(e.key);
          if (
            n >= 1 &&
            currentQuestion?.options?.length >= n &&
            !(selectedAnswer && config?.immediateFeedback)
          ) {
            e.preventDefault();
            const opt = currentQuestion.options[n - 1];
            if (opt) selectAnswer(n - 1, opt.isCorrect ?? false, false, null, false);
          }
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    isQuizActive, showPauseModal, showStopModal,
    isLastQuestion, currentQuestionNumber, currentQuestion,
    selectedAnswer, config?.immediateFeedback,
    nextQuestion, previousQuestion, toggleBookmark, selectAnswer,
  ]);

  /* ── Derived values ───────────────────────────────────────────── */
  const answeredCount = useMemo(
    () => userAnswers.filter(Boolean).length,
    [userAnswers],
  );

  const skippedIndices = useMemo(() => {
    const set = new Set();
    for (let i = 0; i < currentQuestionIndex; i++) {
      if (!userAnswers[i]) set.add(i);
    }
    return set;
  }, [userAnswers, currentQuestionIndex]);

  const hasCurrentAnswer = selectedAnswer?.optionIndex != null;

  /* ── Handlers ─────────────────────────────────────────────────── */
  const handleAnswerSelect = useCallback(
    (idx, isCorrect, auto = false) => {
      if (selectedAnswer && !auto && config?.immediateFeedback) return;
      selectAnswer(idx, isCorrect, auto, null, false);
    },
    [selectedAnswer, config?.immediateFeedback, selectAnswer],
  );

  const handlePause = useCallback(() => {
    setShowPauseModal(true);
    toast('Quiz paused', { icon: '⏸️' });
  }, []);

  const handleConfirmPause = useCallback(async () => {
    setIsPausingQuiz(true);
    try {
      await pauseQuiz();
      setShowPauseModal(false);
      navigate('/home');
      toast.success('Quiz progress saved');
    } catch {
      toast.error('Failed to pause quiz');
    } finally {
      setIsPausingQuiz(false);
    }
  }, [pauseQuiz, navigate]);

  const handleStop = useCallback(() => setShowStopModal(true), []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  function handleConfirmStop() {
    (async () => {
      setIsStoppingQuiz(true);
      try {
        const finalAnswers = [...userAnswers];

        // Capture current unsaved MCQ selection
        if (
          currentQuestion?.type === 'MCQ' &&
          selectedAnswer &&
          !finalAnswers[currentQuestionIndex]
        ) {
          finalAnswers[currentQuestionIndex] = {
            questionId: currentQuestion.id,
            questionType: 'MCQ',
            selectedOption: selectedAnswer.optionIndex,
            isCorrect: selectedAnswer.isCorrect,
            timeSpent: 30,
            totalTimeWhenAnswered: timeRemaining,
            textAnswer: null,
            autoSelected: false,
            isDraft: false,
          };
        }

        const results = await stopQuiz(finalAnswers);
        if (results) {
          setShowStopModal(false);
          navigate('/results', { state: { results } });
          toast.success('Quiz completed!');
        }
      } catch {
        toast.error('Failed to submit quiz');
      } finally {
        setIsStoppingQuiz(false);
      }
    })();
  }

  const handleGoTo = useCallback((i) => goToQuestion(i), [goToQuestion]);

  /* ── Derived labels ───────────────────────────────────────────── */
  const nextDisabled =
    (config?.questionTimer > 0 && !hasCurrentAnswer && !isLastQuestion) || isStoppingQuiz;

  const nextLabel = isStoppingQuiz
    ? 'Finishing…'
    : isLastQuestion
      ? 'Finish Quiz'
      : 'Next Question';

  /* ═══════════════════════════════════════════════════════════════
     Guard screens (ordered by priority)
     ═══════════════════════════════════════════════════════════════ */
  if (loadingBackend) {
    return (
      <StatusScreen variant="spinner" title="Loading Quiz…"
        message="Please wait while we fetch your quiz" />
    );
  }

  if (backendError) {
    return (
      <StatusScreen variant="error" title="Quiz Not Found" message={backendError}
        actions={<>
          <ActionBtn onClick={() => navigate('/browse')} primary>Browse Quizzes</ActionBtn>
          <ActionBtn onClick={() => navigate('/home')}>Back to Home</ActionBtn>
        </>}
      />
    );
  }

  if (isLoading) {
    return (
      <StatusScreen variant="loading" message="Generating your quiz…">
        {quizConfig?.topic && (
          <p className="text-slate-500 text-sm mt-1">Topic: {quizConfig.topic}</p>
        )}
      </StatusScreen>
    );
  }

  if (error) {
    return (
      <StatusScreen variant="error" title="Something went wrong" message={error}
        actions={<>
          <ActionBtn
            onClick={() => { clearError(); quizConfig ? window.location.reload() : navigate('/home'); }}
            primary
          >
            Try Again
          </ActionBtn>
          <ActionBtn onClick={() => navigate('/home')}>Back to Home</ActionBtn>
        </>}
      />
    );
  }

  if (!quiz?.questions?.length) {
    return (
      <StatusScreen variant="info" message="No quiz data available"
        actions={<ActionBtn onClick={() => navigate('/home')} primary>Back to Home</ActionBtn>}
      />
    );
  }

  if (!currentQuestion) {
    return (
      <StatusScreen variant="info" message="Current question unavailable"
        actions={
          <ActionBtn
            onClick={() => currentQuestionIndex > 0 ? previousQuestion() : navigate('/home')}
            primary
          >
            {currentQuestionIndex > 0 ? 'Go Back' : 'Back to Home'}
          </ActionBtn>
        }
      />
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     Main quiz render
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className={cn(backgrounds.pageMinHeight, 'min-h-screen')}>
      <BackgroundEffects />

      <QuizHeader
        title={quiz.title || 'Quiz'}
        currentQuestion={currentQuestionNumber}
        totalQuestions={quiz.totalQuestions || 0}
        timeLeft={timeRemaining}
        onPause={handlePause}
        onStop={handleStop}
        onBookmark={toggleBookmark}
        isBookmarked={isBookmarked}
        onToggleFeedback={toggleImmediateFeedback}
        immediateFeedback={config?.immediateFeedback}
      />

      {/* ── Mobile navigator ────────────────────────────────────── */}
      <div className="lg:hidden px-4 pt-20">
        <MobileNavigator
          totalQuestions={quiz.totalQuestions}
          currentQuestionNumber={currentQuestionNumber}
          userAnswers={userAnswers}
          skippedIndices={skippedIndices}
          answeredCount={answeredCount}
          progress={progress}
          isOpen={mobileNavOpen}
          onToggle={() => setMobileNavOpen((p) => !p)}
          onGoTo={handleGoTo}
        />
      </div>

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 lg:pt-24 pt-6 pb-8">
        <div className="grid lg:grid-cols-4 gap-6">

          {/* ── Question card ─────────────────────────────────── */}
          <div className="lg:col-span-3">
            <article
              key={currentQuestionIndex}
              ref={questionRef}
              tabIndex={-1}
              aria-label={`Question ${currentQuestionNumber} of ${quiz.totalQuestions}`}
              className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl
                         border border-white/50 p-6 sm:p-8 qp-fade-up outline-none"
            >
              {/* Header row */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="px-3 py-1 bg-gradient-to-r from-amber-100 to-orange-100
                                     text-amber-800 text-xs sm:text-sm font-medium rounded-full">
                      Multiple Choice
                    </span>

                    {/* Mini progress bar */}
                    <div
                      className="w-28 bg-slate-200/50 rounded-full h-1.5 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={Math.round(progress)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="bg-gradient-to-r from-amber-500 to-orange-500
                                   h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 tabular-nums">
                      {Math.round(progress)}%
                    </span>
                  </div>

                  <h2 className="text-lg font-semibold
                                 text-slate-900 leading-relaxed break-words">
                    {currentQuestion.question}
                  </h2>

                  {/* Tags */}
                  {currentQuestion.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {currentQuestion.tags
                        .filter((t) => typeof t === 'string')
                        .map((tag, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 text-xs font-medium rounded-full
                                       bg-gradient-to-r from-blue-50 to-indigo-50
                                       text-blue-700 border border-blue-200/50"
                          >
                            {tag}
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                {/* Bookmark */}
                <button
                  onClick={toggleBookmark}
                  aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
                  aria-pressed={isBookmarked}
                  className={cn(
                    'p-2.5 rounded-xl transition-all duration-300 ml-4 shrink-0',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                    isBookmarked
                      ? 'text-amber-600 bg-amber-50 shadow-md'
                      : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50',
                  )}
                >
                  <svg
                    className="w-5 h-5"
                    fill={isBookmarked ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
              </div>

              {/* Keyboard hints (desktop only, subtle) */}
              <p className="hidden sm:block mb-4 text-[11px] text-slate-400 select-none">
                Press{' '}
                {currentQuestion.options
                  ?.slice(0, 9)
                  .map((_, i) => (
                    <kbd
                      key={i}
                      className="mx-0.5 px-1.5 py-0.5 bg-slate-100 rounded
                                 text-slate-500 font-mono text-[10px]"
                    >
                      {i + 1}
                    </kbd>
                  ))}{' '}
                to select ·{' '}
                <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[10px]">←</kbd>
                <kbd className="ml-0.5 px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[10px]">→</kbd>{' '}
                navigate ·{' '}
                <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[10px]">B</kbd>{' '}
                bookmark
              </p>

              {/* MCQ options */}
              {currentQuestion.type === 'MCQ' && currentQuestion.options?.length > 0 ? (
                <div className="space-y-3 mb-8" role="radiogroup" aria-label="Answer options">
                  {currentQuestion.options.map((opt, i) => {
                    if (!opt || typeof opt !== 'object') return null;
                    return (
                      <OptionButton
                        key={i}
                        index={i}
                        text={typeof opt.text === 'string' ? opt.text : `Option ${i + 1}`}
                        isSelected={selectedAnswer?.optionIndex === i}
                        disabled={selectedAnswer != null && !!config?.immediateFeedback}
                        onSelect={(idx) => handleAnswerSelect(idx, opt.isCorrect ?? false)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200 mb-8" role="alert">
                  <p className="text-yellow-800 text-sm">⚠️ No valid options available</p>
                </div>
              )}

              {/* Immediate feedback */}
              {showFeedback && selectedAnswer && currentQuestion.type === 'MCQ' && (
                <FeedbackPanel
                  isCorrect={selectedAnswer.isCorrect}
                  explanation={currentQuestion.explanation}
                  question={currentQuestion}
                />
              )}

              {/* Prev / Next */}
              <div className="flex flex-col sm:flex-row justify-between items-center
                              gap-4 pt-4 border-t border-slate-100">
                <button
                  onClick={previousQuestion}
                  disabled={currentQuestionNumber === 1}
                  className="text-slate-400 hover:text-slate-600 font-medium transition-colors
                             order-2 sm:order-1 disabled:opacity-40 disabled:cursor-not-allowed
                             focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-amber-400 rounded-lg px-2 py-1"
                >
                  <span aria-hidden="true">← </span>Previous
                </button>

                <button
                  onClick={isLastQuestion ? handleConfirmStop : nextQuestion}
                  disabled={nextDisabled}
                  className={cn(
                    'px-6 sm:px-8 py-3 rounded-2xl font-semibold transition-all duration-300',
                    'order-1 sm:order-2 w-full sm:w-auto',
                    'focus-visible:outline-none focus-visible:ring-2',
                    'focus-visible:ring-amber-400 focus-visible:ring-offset-2',
                    !nextDisabled
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-[.98]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed',
                  )}
                >
                  {nextLabel}
                  {!isStoppingQuiz && <span className="ml-1" aria-hidden="true">→</span>}
                </button>
              </div>
            </article>
          </div>

          {/* ── Desktop sidebar ───────────────────────────────── */}
          <aside className="hidden lg:block" aria-label="Question navigator">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg
                            border border-white/50 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Questions</h3>
                <span className="text-xs text-slate-500 tabular-nums">
                  {answeredCount}/{quiz.totalQuestions}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: quiz.totalQuestions }, (_, i) => (
                  <NavButton
                    key={i}
                    number={i + 1}
                    isActive={i + 1 === currentQuestionNumber}
                    isAnswered={userAnswers[i] != null}
                    isSkipped={skippedIndices.has(i)}
                    onClick={() => handleGoTo(i)}
                  />
                ))}
              </div>

              <NavLegend />
            </div>
          </aside>
        </div>
      </main>

      {/* ═══════════ Modals ═══════════ */}
      <Modal
        isOpen={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        title="Quiz Paused"
        icon={
          <svg className="w-8 h-8 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        }
      >
        <p className="text-gray-600 mb-6">
          Your progress has been saved. Resume anytime from where you left off.
        </p>
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => setShowPauseModal(false)}
            disabled={isPausingQuiz}
            variant="primary"
            className="w-full"
          >
            Resume Quiz
          </Button>
          <Button
            onClick={handleConfirmPause}
            loading={isPausingQuiz}
            disabled={isPausingQuiz}
            variant="secondary"
            className="w-full"
          >
            {isPausingQuiz ? 'Saving…' : 'Save & Exit'}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showStopModal}
        onClose={() => setShowStopModal(false)}
        title="Finish Quiz?"
        icon={
          <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h12v12H6z" />
          </svg>
        }
      >
        <p className="text-gray-600 mb-2">Are you sure you want to finish this quiz?</p>
        <div className="flex items-center justify-center gap-4 mb-6 text-sm text-slate-500">
          <span>✅ {answeredCount} answered</span>
          <span>⏭️ {quiz.totalQuestions - answeredCount} unanswered</span>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleConfirmStop}
            loading={isStoppingQuiz}
            disabled={isStoppingQuiz}
            variant="danger"
            className="w-full"
          >
            {isStoppingQuiz ? 'Submitting…' : 'Yes, Finish Quiz'}
          </Button>
          <Button
            onClick={() => setShowStopModal(false)}
            disabled={isStoppingQuiz}
            variant="secondary"
            className="w-full"
          >
            Continue Quiz
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default QuizPage;