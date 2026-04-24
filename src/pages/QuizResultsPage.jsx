import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import GlobalHeader from '../components/ui/GlobalHeader';
import BackgroundEffects from '../components/ui/BackgroundEffects';
import Modal from '../components/ui/Modal';
import { BarChart, DonutChart } from '../components/charts';
import { backgrounds, cn } from '../utils/designTokens';

/* ═══════════════════════════════════════════════════════════════════
   QuizResultsPage
   ─────────────────────────────────────────────────────────────────
   Desktop  : Left hero (score ring + CTAs) │ Right scrollable stats
   Mobile   : Stacked — score → CTAs → stats (charts collapsible)
   Solutions: Full-screen modal with keyboard-navigable reviewer
   ═══════════════════════════════════════════════════════════════════ */

// ── One-time style injection ───────────────────────────────────────
let injected = false;
function injectStyles() {
  if (injected || typeof document === 'undefined') return;
  const s = document.createElement('style');
  s.textContent = [
    '@keyframes qr-pop{0%{transform:scale(0)}60%{transform:scale(1.08)}100%{transform:scale(1)}}',
    '@keyframes qr-glow{0%,100%{opacity:.35}50%{opacity:.6}}',
    '@keyframes qr-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}',
    '.qr-scroll::-webkit-scrollbar{height:4px;width:6px}',
    '.qr-scroll::-webkit-scrollbar-track{background:#f1f5f9;border-radius:8px}',
    '.qr-scroll::-webkit-scrollbar-thumb{background:#fbbf24;border-radius:8px}',
    '.qr-scroll::-webkit-scrollbar-thumb:hover{background:#f59e0b}',
  ].join('');
  document.head.appendChild(s);
  injected = true;
}

// ── Helpers ────────────────────────────────────────────────────────
const fmt = (sec) => {
  if (typeof sec !== 'number' || !Number.isFinite(sec)) return '00:00';
  const a = Math.abs(sec);
  return `${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
};

const pct = (score, total) =>
  total > 0 ? Math.round((score / total) * 100) : 0;

const PERFORMANCE_TIERS = [
  { min: 90, text: 'Outstanding!', emoji: '🏆' },
  { min: 75, text: 'Great job!',   emoji: '🌟' },
  { min: 60, text: 'Good effort!', emoji: '👍' },
  { min: 40, text: 'Keep going!',  emoji: '💪' },
  { min: 0,  text: 'Room to grow', emoji: '📚' },
];
const getPerformance = (p) =>
  PERFORMANCE_TIERS.find((t) => p >= t.min) ?? PERFORMANCE_TIERS.at(-1);

/* ═══════════════════════════════════════════════════════════════════
   ScoreRing — Responsive SVG arc + animated percentage
   Single implementation, scales via Tailwind responsive classes
   ═══════════════════════════════════════════════════════════════════ */
const R = 44;
const C = 2 * Math.PI * R;

const ScoreRing = memo(({ percentage, score, total }) => {
  const offset = C * (1 - percentage / 100);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="img"
      aria-label={`Score: ${percentage} percent, ${score} out of ${total} correct`}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-[-16px] rounded-full blur-2xl
          bg-gradient-to-r from-amber-200/20 to-orange-200/20"
        style={{ animation: 'qr-glow 3s ease-in-out infinite' }}
      />

      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="w-36 h-36 sm:w-44 sm:h-44 lg:w-48 lg:h-48 drop-shadow-xl"
      >
        <circle cx="50" cy="50" r={R} fill="white" stroke="#f1f5f9" strokeWidth="2" />
        <circle
          cx="50" cy="50" r={R}
          fill="none" stroke="url(#qr-grad)" strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="qr-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className="text-4xl sm:text-5xl lg:text-6xl font-bold
            bg-gradient-to-r from-amber-500 to-orange-500
            bg-clip-text text-transparent"
          style={{ animation: 'qr-pop .6s ease-out' }}
        >
          {percentage}%
        </span>
        <span className="text-xs sm:text-sm text-slate-500 mt-1 tabular-nums">
          {score}/{total} correct
        </span>
      </div>
    </div>
  );
});
ScoreRing.displayName = 'ScoreRing';

/* ═══════════════════════════════════════════════════════════════════
   StatCard — Gradient metric tile with staggered entry animation
   ═══════════════════════════════════════════════════════════════════ */
const STAT_THEMES = {
  blue:   { bg: 'from-blue-50 to-indigo-50',   border: 'border-blue-100',   val: 'text-blue-600',   lbl: 'text-blue-700' },
  green:  { bg: 'from-green-50 to-emerald-50', border: 'border-green-100',  val: 'text-green-600',  lbl: 'text-green-700' },
  amber:  { bg: 'from-amber-50 to-orange-50',  border: 'border-amber-100',  val: 'text-amber-600',  lbl: 'text-amber-700' },
  purple: { bg: 'from-purple-50 to-pink-50',   border: 'border-purple-100', val: 'text-purple-600', lbl: 'text-purple-700' },
};

const StatCard = memo(({ value, label, theme = 'blue', delay = 0 }) => {
  const t = STAT_THEMES[theme];
  return (
    <div
      className={`bg-gradient-to-br ${t.bg} rounded-xl p-3 lg:p-4 border ${t.border}`}
      style={{ animation: `qr-up .5s ease-out ${delay}s both` }}
    >
      <div className={`text-2xl font-bold tabular-nums ${t.val}`}>{value}</div>
      <div className={`text-sm ${t.lbl}`}>{label}</div>
    </div>
  );
});
StatCard.displayName = 'StatCard';

/* ═══════════════════════════════════════════════════════════════════
   QuestionNav — Scrollable numbered pills with auto-scroll
   ═══════════════════════════════════════════════════════════════════ */
const QuestionNav = memo(({ total, answers, current, onChange }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [current]);

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto pb-2 qr-scroll"
      role="tablist"
      aria-label="Question navigator"
    >
      <div className="flex gap-2 min-w-max px-1 py-1">
        {Array.from({ length: total }, (_, i) => {
          const a = answers[i];
          const active = i === current;
          const unanswered = !a || a.unanswered;
          const correct = a?.isCorrect;

          return (
            <button
              key={i}
              role="tab"
              aria-selected={active}
              data-active={active}
              aria-label={`Question ${i + 1}${
                unanswered ? ', unanswered' : correct ? ', correct' : ', incorrect'
              }`}
              onClick={() => onChange(i)}
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                'text-xs font-semibold shrink-0 transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-amber-400 focus-visible:ring-offset-1',
                active
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md scale-110'
                  : unanswered
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200/60'
                    : correct
                      ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200/60'
                      : 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200/60',
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
});
QuestionNav.displayName = 'QuestionNav';

/* ═══════════════════════════════════════════════════════════════════
   OptionRow — Single MCQ option with contextual colouring
   ═══════════════════════════════════════════════════════════════════ */
const OptionRow = memo(({ option, index, selectedIndex }) => {
  const letter = String.fromCharCode(65 + index);
  const text =
    typeof option?.text === 'string' ? option.text : `Option ${index + 1}`;
  const isCorrect = Boolean(option?.isCorrect);
  const isSelected = selectedIndex === index;

  let bg, border, badge, tag;
  if (isSelected && isCorrect) {
    bg = 'bg-green-100/60'; border = 'border-green-300/50';
    badge = 'bg-green-200 text-green-800';
    tag = { label: '✓ Correct', cls: 'text-green-700 bg-green-50' };
  } else if (isSelected) {
    bg = 'bg-red-100/60'; border = 'border-red-300/50';
    badge = 'bg-red-200 text-red-800';
    tag = { label: 'Your answer', cls: 'text-red-600 bg-red-50' };
  } else if (isCorrect) {
    bg = 'bg-green-50/60'; border = 'border-green-200/50';
    badge = 'bg-green-100 text-green-700';
    tag = { label: 'Correct', cls: 'text-green-600 bg-green-50' };
  } else {
    bg = 'bg-white/60'; border = 'border-white/50';
    badge = 'bg-slate-100 text-slate-600';
    tag = null;
  }

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl
        backdrop-blur-sm border ${bg} ${border}`}
      role="listitem"
    >
      <span
        className={`w-8 h-8 rounded-full flex items-center justify-center
          text-sm font-medium shrink-0 ${badge}`}
        aria-hidden="true"
      >
        {letter}
      </span>
      <span className="flex-1 text-slate-700 break-words min-w-0">{text}</span>
      {tag && (
        <span
          className={`text-xs font-medium shrink-0 px-2.5 py-1 rounded-full ${tag.cls}`}
        >
          {tag.label}
        </span>
      )}
    </div>
  );
});
OptionRow.displayName = 'OptionRow';

/* ═══════════════════════════════════════════════════════════════════
   SolutionView — Full question review (header + options + explanation)
   ═══════════════════════════════════════════════════════════════════ */
const SolutionView = memo(({ question, answer, index }) => {
  if (!question) {
    return (
      <div className="p-8 text-center" role="status">
        <p className="text-slate-500">Question data not available</p>
      </div>
    );
  }

  const isUnanswered = !answer || answer.unanswered;
  const icon = isUnanswered ? '—' : answer.isCorrect ? '✓' : '✗';
  const iconCls = isUnanswered
    ? 'bg-slate-200 text-slate-600'
    : answer.isCorrect
      ? 'bg-green-100 text-green-700'
      : 'bg-red-100 text-red-700';

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      {/* Question header */}
      <div className="p-4 bg-slate-50 rounded-xl">
        <div className="flex items-start gap-3">
          <span
            className={`shrink-0 w-8 h-8 rounded-full flex items-center
              justify-center text-sm font-bold ${iconCls}`}
            aria-hidden="true"
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-500 mb-1">Question {index + 1}</p>
            <p className="text-slate-800 font-medium break-words">
              {question.question || 'Question text not available'}
            </p>
          </div>
        </div>
      </div>

      {/* Unanswered badge */}
      {isUnanswered && (
        <div
          className="p-4 rounded-xl bg-slate-100/60 text-slate-500
            font-medium text-center border border-slate-200/50"
        >
          Not Answered
        </div>
      )}

      {/* MCQ options */}
      {Array.isArray(question.options) && question.options.length > 0 && (
        <div className="space-y-2.5" role="list" aria-label="Answer options">
          {question.options.map((opt, i) =>
            opt && typeof opt === 'object' ? (
              <OptionRow
                key={i}
                option={opt}
                index={i}
                selectedIndex={isUnanswered ? -1 : (answer?.selectedOption ?? -1)}
              />
            ) : null,
          )}
        </div>
      )}

      {/* Direct answer (non-MCQ fallback) */}
      {question.answer && !isUnanswered && (
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
          <p className="text-sm font-semibold text-blue-800 mb-1">Answer</p>
          <p className="text-sm text-blue-700 break-words">{question.answer}</p>
        </div>
      )}

      {/* Explanation */}
      {question.explanation && (
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
          <p className="text-sm font-semibold text-amber-800 mb-1">
            💡 Explanation
          </p>
          <p className="text-sm text-amber-700 break-words">
            {question.explanation}
          </p>
        </div>
      )}

      {/* Distractor explanations */}
      {question.distractorExplanations && (
        <div className="p-3 bg-red-50 rounded-xl border border-red-200">
          <p className="text-sm font-semibold text-red-800 mb-2">
            ❌ Why the other choices are wrong
          </p>
          {question.options.map((opt, idx) => {
            const expl = question.distractorExplanations[String(idx)];
            if (!expl || idx === parseInt(question.correctAnswer)) return null;
            return (
              <div key={idx} className="mb-2 last:mb-0">
                <strong className="text-red-700 text-sm">{String.fromCharCode(65 + idx)}) {opt.text}</strong>
                <p className="text-red-600 text-xs mt-1">{expl}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Key concept */}
      {question.keyConcept && (
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
          <p className="text-sm font-semibold text-emerald-800 mb-1">
            🔑 Key Concept
          </p>
          <p className="text-sm text-emerald-700 break-words">
            {question.keyConcept}
          </p>
        </div>
      )}

      {/* Learning objective */}
      {question.learningObjective && (
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
          <p className="text-sm font-semibold text-blue-800 mb-1">
            🎯 Learning Objective
          </p>
          <p className="text-sm text-blue-700 break-words">
            {question.learningObjective}
          </p>
        </div>
      )}
    </div>
  );
});
SolutionView.displayName = 'SolutionView';

/* ═══════════════════════════════════════════════════════════════════
   QuizResultsPage — Orchestrator
   ═══════════════════════════════════════════════════════════════════ */
const QuizResultsPage = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const results = state?.results;

  const [questionIndex, setQuestionIndex] = useState(0);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [chartsExpanded, setChartsExpanded] = useState(true);

  // Handle search result selection from GlobalHeader
  const handleSearchResultSelect = (result) => {
    if (result.type === 'category') {
      // Navigate to topic page
      navigate(`/topic/${result.id}`);
    } else if (result.type === 'quiz' && result.slug) {
      // Start the quiz
      navigate(`/quiz/${result.slug}`);
    }
  };

  useEffect(injectStyles, []);

  // ── Validate & normalise results ──────────────────────────────────
  const data = useMemo(() => {
    if (!results || typeof results !== 'object') return null;
    return {
      score:          typeof results.score === 'number' ? results.score : 0,
      totalQuestions: typeof results.totalQuestions === 'number' ? results.totalQuestions : 0,
      answers:        Array.isArray(results.answers) ? results.answers : [],
      timeSpent:      typeof results.timeSpent === 'number' ? results.timeSpent : 0,
      config:         results.config ?? {},
      quiz:           results.quiz ?? null,
    };
  }, [results]);

  // ── Derived metrics ───────────────────────────────────────────────
  const percentage  = data ? pct(data.score, data.totalQuestions) : 0;
  const performance = getPerformance(percentage);
  const answeredCount = data
    ? data.answers.filter((a) => a && !a.unanswered).length
    : 0;

  // ── Chart datasets ────────────────────────────────────────────────
  const { barData, donutData } = useMemo(() => {
    if (!data) return { barData: [], donutData: [] };
    const { score, totalQuestions } = data;
    const incorrect = totalQuestions - score;
    const unanswered = totalQuestions - answeredCount;

    return {
      barData: [
        { label: 'Correct',   value: score,     color: '#10B981' },
        { label: 'Incorrect', value: incorrect,  color: '#EF4444' },
      ],
      donutData: [
        { label: 'Correct',   value: score,     color: '#10B981' },
        { label: 'Incorrect', value: answeredCount - score, color: '#EF4444' },
        ...(unanswered > 0
          ? [{ label: 'Unanswered', value: unanswered, color: '#94A3B8' }]
          : []),
      ],
    };
  }, [data, answeredCount]);

  // ── Current solution item ─────────────────────────────────────────
  const currentQuestion = data?.quiz?.questions?.[questionIndex] ?? null;
  const currentAnswer   = data?.answers?.[questionIndex] ?? null;

  // ── Clamp question index ──────────────────────────────────────────
  useEffect(() => {
    if (!data) return;
    const max = (data.quiz?.questions?.length ?? 1) - 1;
    setQuestionIndex((i) => Math.max(0, Math.min(i, max)));
  }, [data]);

  // ── Arrow-key navigation inside solutions modal ───────────────────
  useEffect(() => {
    if (!solutionsOpen || !data) return;
    const max = data.totalQuestions - 1;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); setQuestionIndex((i) => Math.max(0, i - 1)); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setQuestionIndex((i) => Math.min(max, i + 1)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [solutionsOpen, data]);

  // ── Navigation helpers ────────────────────────────────────────────
  const goHome = useCallback(() => navigate('/home'), [navigate]);

  /* ═══════════ No-results guard ═══════════ */
  if (!data) {
    return (
      <div className={cn(backgrounds.pageMinHeight, 'min-h-screen')}>
        <BackgroundEffects />
        <GlobalHeader currentPage="results" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center px-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-slate-600 mb-6">No results available</p>
            <button
              onClick={goHome}
              className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white
                font-semibold rounded-xl hover:shadow-lg transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { score, totalQuestions, answers, timeSpent, config } = data;

  /* ═══════════ Main render ═══════════ */
  return (
    <div className={cn(backgrounds.pageMinHeight, 'min-h-screen')}>
      <BackgroundEffects />
      <GlobalHeader currentPage="results" onSearchSelect={handleSearchResultSelect} />

      <main className="pt-24">
        <div className="lg:flex lg:h-[calc(100vh-6rem)]">

          {/* ────────── Left · Hero ────────── */}
          <section
            className="lg:w-1/2 shrink-0 flex flex-col items-center
              justify-center px-4 sm:px-6 lg:px-8 py-8 lg:py-0"
          >
            <div className="w-full max-w-lg flex flex-col items-center gap-6">
              <ScoreRing
                percentage={percentage}
                score={score}
                total={totalQuestions}
              />

              {/* Performance label */}
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl font-bold">
                  <span className="text-4xl sm:text-5xl mr-2">{performance.emoji}</span>
                  <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                    {performance.text}
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-slate-600 mt-2">
                  {config.timerEnabled
                    ? `Completed in ${fmt(timeSpent)}`
                    : 'Quiz completed successfully'}
                </p>
              </div>

              {/* CTAs */}
              <div className="w-full space-y-3 max-w-sm">
                <button
                  onClick={() => setSolutionsOpen(true)}
                  className="w-full bg-white/90 backdrop-blur-sm rounded-2xl p-5
                    shadow-lg border-2 border-amber-200/50 hover:border-amber-300
                    text-base sm:text-lg font-semibold text-slate-800
                    hover:shadow-xl hover:shadow-amber-100/30
                    transform hover:-translate-y-0.5 transition-all duration-300
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
                    group flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  View Solutions
                </button>

                <button
                  onClick={goHome}
                  className="w-full py-3 text-sm font-medium text-slate-500
                    hover:text-slate-700 transition-colors rounded-xl
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  ← Back to Home
                </button>
              </div>
            </div>
          </section>

          {/* ────────── Right · Statistics ────────── */}
          <section
            className="lg:w-1/2 shrink-0 lg:overflow-y-auto
              px-4 sm:px-6 lg:px-8 pb-8 lg:py-8 qr-scroll"
          >
            <div
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6
                shadow-lg border border-white/50 max-w-xl mx-auto lg:max-w-none"
            >
              {/* Section heading */}
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Quiz Statistics
              </h2>

              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <StatCard value={totalQuestions}   label="Questions"  theme="blue"   delay={0} />
                <StatCard value={score}            label="Correct"    theme="green"  delay={0.08} />
                <StatCard value={`${percentage}%`} label="Accuracy"   theme="amber"  delay={0.16} />
                <StatCard value={fmt(timeSpent)}   label="Time Spent" theme="purple" delay={0.24} />
              </div>

              {/* Charts toggle — mobile only */}
              <button
                onClick={() => setChartsExpanded((v) => !v)}
                aria-expanded={chartsExpanded}
                className="lg:hidden mb-3 text-sm text-amber-600 hover:text-amber-700
                  font-medium flex items-center gap-1.5 transition-colors rounded-lg px-2 py-1
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <svg
                  className={cn(
                    'w-3.5 h-3.5 transition-transform duration-200',
                    chartsExpanded && 'rotate-90',
                  )}
                  fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"
                >
                  <path
                    fillRule="evenodd" clipRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  />
                </svg>
                {chartsExpanded ? 'Hide Charts' : 'Show Charts'}
              </button>

              {/* Charts — always visible on lg, collapsible on mobile */}
              <div
                className={cn(
                  'space-y-6 transition-all duration-300 overflow-hidden',
                  chartsExpanded
                    ? 'max-h-[2000px] opacity-100'
                    : 'max-h-0 opacity-0 lg:max-h-[2000px] lg:opacity-100',
                )}
              >
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-800 mb-3">
                    Performance Overview
                  </h3>
                  <BarChart
                    data={barData}
                    height={220}
                    showDataLabels
                    yAxisMax={Math.max(...barData.map((d) => d.value), 5)}
                  />
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-800 mb-3">
                    Answer Distribution
                  </h3>
                  <DonutChart
                    data={donutData}
                    height={220}
                    donutSize={65}
                    centerLabel={{ label: 'Total', value: totalQuestions }}
                    showLegend
                    legendPosition="bottom"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ────────── Solutions Modal ────────── */}
      <Modal
        isOpen={solutionsOpen}
        onClose={() => setSolutionsOpen(false)}
        title="Question Solutions"
        size="xl"
      >
        <div className="text-left space-y-4">
          <QuestionNav
            total={totalQuestions}
            answers={answers}
            current={questionIndex}
            onChange={setQuestionIndex}
          />

          <SolutionView
            question={currentQuestion}
            answer={currentAnswer}
            index={questionIndex}
          />

          {/* Prev / Next footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              onClick={() => setQuestionIndex((i) => Math.max(0, i - 1))}
              disabled={questionIndex === 0}
              aria-label="Previous question"
              className="text-sm font-medium text-slate-500 hover:text-slate-700
                disabled:opacity-40 disabled:cursor-not-allowed transition-colors
                rounded-lg px-3 py-2
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              ← Previous
            </button>

            <span className="text-xs text-slate-400 tabular-nums" aria-live="polite">
              {questionIndex + 1} / {totalQuestions}
            </span>

            <button
              onClick={() => setQuestionIndex((i) => Math.min(totalQuestions - 1, i + 1))}
              disabled={questionIndex >= totalQuestions - 1}
              aria-label="Next question"
              className="text-sm font-medium text-slate-500 hover:text-slate-700
                disabled:opacity-40 disabled:cursor-not-allowed transition-colors
                rounded-lg px-3 py-2
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              Next →
            </button>
          </div>

          {/* Keyboard hint */}
          <p
            className="text-center text-xs text-slate-400 hidden sm:block select-none"
            aria-hidden="true"
          >
            Use ← → arrow keys to navigate
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default QuizResultsPage;