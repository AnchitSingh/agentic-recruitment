import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDocumentHead } from '../hooks/useDocumentHead';
import { useExamStepDetail } from '../hooks/useExamStepDetail';
import { ORGAN_VISUALS, DEFAULT_VISUAL } from '../data/visualConfig';
import GlobalHeader from '../components/ui/GlobalHeader';

/* ═══════════════════════════════════════════════════════════════════
   ExamStepPage
   ─────────────────────────────────────────────────────────────────
   Step landing: hero → study packs → filter bar → organ quiz grid
   Visual language inherited from GlobalHeader — amber palette,
   rounded-2xl/3xl radii, sm→lg shadows, backdrop-blur, expanding
   pills, gradient badges, cubic-bezier curves.
   ═══════════════════════════════════════════════════════════════════ */

const PAGE_STYLES = `
  @keyframes ebStepFadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes ebStepBarGrow {
    from { width: 0%; }
  }
  @keyframes ebStepShimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes ebStepFloat {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50%      { transform: translate(-6px, 8px) scale(1.04); }
  }
`;

/* delay helper for staggered entrance */
const stagger = (i, base = 0.06) => ({
  animation: `ebStepFadeUp 0.45s ease-out ${i * base}s both`,
});

/* ═══════════════════════════════════════════════════════════════════
   Tiny SVG helpers (consistent 1.5-stroke style from NavIcon)
   ═══════════════════════════════════════════════════════════════════ */
const Chevron = ({ className = '' }) => (
  <svg className={`w-3.5 h-3.5 flex-shrink-0 ${className}`} fill="none"
    stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5l7 7-7 7" />
  </svg>
);

const CheckBadge = () => (
  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white
                    flex items-center justify-center shadow-sm
                    shadow-emerald-500/25">
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor"
      viewBox="0 0 24 24" strokeWidth="3" strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  </span>
);

const ArrowRight = ({ className = '' }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor"
    viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════
   StatBlock — Glassmorphic stat inside the hero
   ═══════════════════════════════════════════════════════════════════ */
const StatBlock = ({ value, label }) => (
  <div className="flex-1 min-w-[100px] bg-white/[0.12] backdrop-blur-sm
                  rounded-2xl px-4 py-3 sm:py-4 text-center">
    <p className="text-xl sm:text-2xl font-bold text-white leading-none mb-1">
      {value}
    </p>
    <p className="text-[11px] sm:text-xs text-white/60 font-medium uppercase
                  tracking-wider">
      {label}
    </p>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   FilterChip — Rounded pill mirroring GlobalHeader nav items
   Active: amber-500 · Inactive: white/border
   ═══════════════════════════════════════════════════════════════════ */
const FilterChip = ({ label, active, onClick, count, dot }) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`flex items-center gap-1.5 rounded-full text-xs font-medium
      whitespace-nowrap transition-all duration-200
      ${active
        ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20 px-4 py-2'
        : 'bg-white text-slate-600 border border-slate-200/60 px-3.5 py-[7px] hover:border-slate-300 hover:bg-slate-50'
      }`}
  >
    {dot && (
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
    )}
    {label}
    {count != null && (
      <span className={`text-[10px] font-semibold tabular-nums
        ${active ? 'text-white/70' : 'text-slate-400'}`}>
        {count}
      </span>
    )}
  </button>
);

/* ═══════════════════════════════════════════════════════════════════
   SectionHeader — Vertical accent bar + title + optional count
   ═══════════════════════════════════════════════════════════════════ */
const SectionHeader = ({ title, count, className = '' }) => (
  <div className={`flex items-center gap-3 mb-6 ${className}`}>
    <div className="w-1 h-6 rounded-full
                    bg-gradient-to-b from-amber-500 to-orange-600" />
    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
    {count != null && (
      <span className="text-sm text-slate-400 font-medium tabular-nums">
        {count}
      </span>
    )}
    <div className="flex-1 h-px bg-slate-200/60" />
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   StudyPackCard
   ═══════════════════════════════════════════════════════════════════ */
const StudyPackCard = ({ pack, index, onClick }) => {
  const pVisual = ORGAN_VISUALS[pack.organ_system] || DEFAULT_VISUAL;

  return (
    <div
      onClick={onClick}
      style={stagger(index)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="group bg-white rounded-2xl border border-slate-200/60 shadow-sm
                 hover:shadow-lg hover:-translate-y-1 cursor-pointer
                 transition-all duration-300 overflow-hidden
                 focus-visible:outline-none focus-visible:ring-2
                 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
    >
      {/* Gradient accent strip */}
      <div className={`h-1.5 bg-gradient-to-r ${pVisual.gradient}
                        group-hover:h-2 transition-all duration-300`} />

      <div className="p-5">
        <div className="flex items-start gap-3.5 mb-4">
          {/* Emoji in gradient badge */}
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${pVisual.gradient}
                           flex items-center justify-center text-lg shadow-sm
                           flex-shrink-0`}>
            {pack.cover_emoji || pVisual.emoji}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 text-sm leading-snug
                           group-hover:text-amber-700 transition-colors line-clamp-2">
              {pack.title}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {pack.total_quizzes} quizzes · {pack.total_questions} questions
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between px-3.5 py-2.5
                        rounded-xl bg-amber-50/70 group-hover:bg-amber-50
                        transition-colors">
          <span className="text-xs font-semibold text-amber-700">
            View Pack
          </span>
          <ArrowRight className="text-amber-500 group-hover:translate-x-0.5
                                 transition-transform duration-200" />
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   QuizCard
   ═══════════════════════════════════════════════════════════════════ */
const DIFF_STYLES = {
  easy:   { dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  medium: { dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700'   },
  hard:   { dot: 'bg-red-400',     bg: 'bg-red-50',     text: 'text-red-700'     },
};

const QuizCard = ({ quiz, completed, index, onClick }) => {
  const durationMin = Math.ceil((quiz.timeLimit || quiz.totalQuestions * 90) / 60);
  const diff = DIFF_STYLES[quiz.difficulty] || null;

  return (
    <div
      onClick={onClick}
      style={stagger(index, 0.04)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={`group relative p-5 rounded-2xl border transition-all duration-300
        cursor-pointer
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-amber-500 focus-visible:ring-offset-2
        ${completed
          ? 'bg-emerald-50/40 border-emerald-200/60 hover:border-emerald-300 hover:shadow-md'
          : 'bg-white border-slate-200/60 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5'
        }`}
    >
      {/* Completed badge */}
      {completed && (
        <div className="absolute top-4 right-4">
          <CheckBadge />
        </div>
      )}

      {/* Title */}
      <h4 className={`font-semibold text-sm leading-snug mb-3 pr-10 line-clamp-2
        transition-colors duration-200
        ${completed
          ? 'text-emerald-800'
          : 'text-slate-800 group-hover:text-amber-700'
        }`}>
        {quiz.title}
      </h4>

      {/* Metadata row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none"
            stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          {durationMin} min
        </span>

        <span className="w-1 h-1 rounded-full bg-slate-300" />

        <span className="text-xs text-slate-500">
          {quiz.totalQuestions} Qs
        </span>

        {diff && (
          <>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className={`inline-flex items-center gap-1 text-[11px]
              font-semibold rounded-full px-2 py-0.5
              ${diff.bg} ${diff.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
              {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
            </span>
          </>
        )}
      </div>

      {/* Hover arrow hint */}
      <div className="absolute bottom-4 right-4 opacity-0
                      group-hover:opacity-100 transition-opacity duration-200">
        <ArrowRight className={completed ? 'text-emerald-400' : 'text-amber-400'} />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   OrganSection — Per-organ header + quiz grid
   ═══════════════════════════════════════════════════════════════════ */
const OrganSection = ({ group, organProgress, isQuizCompleted, onQuizClick }) => {
  const ov = ORGAN_VISUALS[group.organ] || DEFAULT_VISUAL;
  const prog = organProgress[group.organ] || { completed: 0, total: 0, percentage: 0 };

  return (
    <section>
      {/* Organ header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ov.gradient}
                           flex items-center justify-center text-lg text-white
                           shadow-sm flex-shrink-0`}>
            {ov.emoji}
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{group.organ}</h3>
            <p className="text-xs text-slate-400">
              {group.quizzes.length} quizzes · {group.totalQuestions} questions
            </p>
          </div>
        </div>

        {/* Inline progress bar */}
        <div className="hidden sm:flex items-center gap-2.5">
          <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${ov.gradient}
                          transition-all duration-700`}
              style={{
                width: `${prog.percentage}%`,
                animation: 'ebStepBarGrow 0.8s ease-out 0.2s both',
              }}
            />
          </div>
          <span className="text-xs text-slate-400 font-semibold tabular-nums w-8 text-right">
            {prog.percentage}%
          </span>
        </div>
      </div>

      {/* Quiz grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {group.quizzes.map((quiz, i) => (
          <QuizCard
            key={quiz.id}
            quiz={quiz}
            completed={isQuizCompleted(quiz.id)}
            index={i}
            onClick={() => onQuizClick(quiz.slug)}
          />
        ))}
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   EmptyFilterState
   ═══════════════════════════════════════════════════════════════════ */
const EmptyFilterState = ({ onClear }) => (
  <div className="text-center py-20 bg-white/50 rounded-3xl border border-dashed
                  border-slate-200 backdrop-blur-sm"
    style={{ animation: 'ebStepFadeUp 0.4s ease-out both' }}>
    <div className="w-14 h-14 mx-auto mb-5 rounded-2xl
                    bg-gradient-to-br from-slate-100 to-slate-200
                    flex items-center justify-center shadow-inner">
      <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor"
        viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round"
        strokeLinejoin="round">
        <path d="M17 17L21 21" />
        <circle cx="11" cy="11" r="8" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-slate-700 mb-1">
      No quizzes match your filters
    </h3>
    <p className="text-sm text-slate-400 mb-6">
      Try broadening your selection
    </p>
    <button
      onClick={onClear}
      className="px-6 py-2.5 rounded-full text-sm font-semibold text-white
                 bg-gradient-to-r from-amber-500 to-orange-600
                 shadow-md shadow-amber-500/25
                 hover:shadow-lg hover:shadow-amber-500/35
                 active:scale-[0.97] transition-all duration-200
                 focus-visible:outline-none focus-visible:ring-2
                 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
    >
      Clear Filters
    </button>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   PageSkeleton — Shimmer loading state
   ═══════════════════════════════════════════════════════════════════ */
const Bone = ({ className = '' }) => (
  <div
    className={`rounded-2xl ${className}`}
    style={{
      background:
        'linear-gradient(90deg, #f1f5f9 25%, #e8ecf1 37%, #f1f5f9 63%)',
      backgroundSize: '200% 100%',
      animation: 'ebStepShimmer 1.8s ease-in-out infinite',
    }}
  />
);

function PageSkeleton() {
  return (
    <>
      <style>{PAGE_STYLES}</style>
      <GlobalHeader currentPage="exam" />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          {/* Hero bone */}
          <Bone className="h-64 sm:h-72 mb-10 rounded-3xl" />

          {/* Study packs header */}
          <div className="flex items-center gap-3 mb-6">
            <Bone className="w-1 h-6 !rounded-full" />
            <Bone className="w-32 h-5" />
          </div>

          {/* Study pack bones */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-14">
            {[0, 1, 2].map((i) => (
              <Bone key={i} className="h-[152px]"
                style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>

          {/* Filter bar bone */}
          <div className="flex items-center gap-3 mb-6">
            <Bone className="w-1 h-6 !rounded-full" />
            <Bone className="w-28 h-5" />
          </div>
          <div className="flex gap-2 mb-8">
            {[80, 100, 90, 70].map((w, i) => (
              <Bone key={i} className="h-8 !rounded-full"
                style={{ width: w, animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>

          {/* Quiz grid bones */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Bone key={i} className="h-[106px]"
                style={{ animationDelay: `${i * 0.06}s` }} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   NotFound — Branded error page (matches AuthContext splash)
   ═══════════════════════════════════════════════════════════════════ */
function NotFound({ step }) {
  return (
    <>
      <style>{PAGE_STYLES}</style>
      <GlobalHeader currentPage="exam" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30
                      pt-24 flex items-center justify-center px-4">
        <div className="text-center" style={{ animation: 'ebStepFadeUp 0.5s ease-out both' }}>
          {/* Logo mark — mirrors AuthContext splash */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl
                          bg-gradient-to-br from-red-500 to-rose-600
                          flex items-center justify-center shadow-lg shadow-red-500/20">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor"
              viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 9v4m0 4h.01" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Exam Not Found
          </h1>
          <p className="text-slate-500 mb-8 max-w-xs mx-auto">
            We couldn't find any content for
            <span className="font-semibold text-slate-700"> "{step}"</span>
          </p>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full
                       text-sm font-semibold text-white
                       bg-gradient-to-r from-amber-500 to-orange-600
                       shadow-md shadow-amber-500/25
                       hover:shadow-lg hover:shadow-amber-500/35
                       active:scale-[0.97] transition-all duration-200
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor"
              viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ExamStepPage — Main export
   ═══════════════════════════════════════════════════════════════════ */
export default function ExamStepPage() {
  const { step } = useParams();
  const navigate = useNavigate();
  const {
    data,
    loading,
    error,
    visuals,
    filteredOrganGroups,
    progress,
    organProgress,
    organFilter,
    setOrganFilter,
    difficultyFilter,
    setDifficultyFilter,
    isQuizCompleted,
  } = useExamStepDetail(step);

  const stepLabel = visuals?.title ?? '';

  useDocumentHead({
    title: data
      ? `${stepLabel} — USMLE Practice Questions | ResidentQuest`
      : 'ResidentQuest',
    description: data
      ? `${data.stats.totalQuizzes} quizzes with ${data.stats.totalQuestions} practice questions for ${stepLabel}`
      : undefined,
  });

  if (loading) return <PageSkeleton />;
  if (error || !data) return <NotFound step={step} />;

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

  return (
    <>
      <style>{PAGE_STYLES}</style>
      <GlobalHeader currentPage="exam" onSearchSelect={handleSearchResultSelect} />

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">

          {/* ═══════════ Hero ═══════════ */}
          <div
            className={`relative rounded-3xl overflow-hidden
              bg-gradient-to-br ${visuals.gradient} p-8 sm:p-10 lg:p-12
              text-white mb-12 shadow-xl`}
            style={{ animation: 'ebStepFadeUp 0.5s ease-out both' }}
          >
            {/* Decorative orbs */}
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full
                            bg-white/[0.08] -translate-y-1/3 translate-x-1/4
                            pointer-events-none"
              style={{ animation: 'ebStepFloat 12s ease-in-out infinite' }} />
            <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full
                            bg-white/[0.06] translate-y-1/3 -translate-x-1/4
                            pointer-events-none"
              style={{ animation: 'ebStepFloat 10s ease-in-out 2s infinite' }} />
            <div className="absolute top-1/2 right-1/4 w-40 h-40 rounded-full
                            bg-white/[0.04] pointer-events-none"
              style={{ animation: 'ebStepFloat 14s ease-in-out 4s infinite' }} />

            <div className="relative z-10">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1.5 text-sm text-white/50 mb-8"
                aria-label="Breadcrumb">
                <Link to="/"
                  className="hover:text-white/90 transition-colors duration-200">
                  Home
                </Link>
                <Chevron className="text-white/30" />
                <span className="text-white/80 font-medium">{stepLabel}</span>
              </nav>

              {/* Title row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-8">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl
                                bg-white/[0.15] backdrop-blur-sm
                                flex items-center justify-center text-3xl sm:text-4xl
                                flex-shrink-0 shadow-sm">
                  {visuals.icon}
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-2">
                    {stepLabel}
                  </h1>
                  <p className="text-white/70 max-w-2xl leading-relaxed text-sm sm:text-base">
                    {visuals.description}
                  </p>
                </div>
              </div>

              {/* Stat blocks */}
              <div className="flex gap-3 sm:gap-4 mb-8">
                <StatBlock
                  value={data.stats.totalQuizzes}
                  label="Quizzes"
                />
                <StatBlock
                  value={data.stats.totalQuestions.toLocaleString()}
                  label="Questions"
                />
                <StatBlock
                  value={data.stats.totalOrganSystems}
                  label="Systems"
                />
              </div>

              {/* Overall progress */}
              <div className="max-w-md">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-sm text-white/60 font-medium">
                    Overall Progress
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    {progress.completed}/{progress.total}
                    <span className="text-white/50 ml-1">
                      ({progress.percentage}%)
                    </span>
                  </span>
                </div>
                <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full shadow-sm"
                    style={{
                      width: `${progress.percentage}%`,
                      boxShadow: '0 0 12px rgba(255,255,255,0.35)',
                      animation: 'ebStepBarGrow 1s ease-out 0.3s both',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ Study Packs ═══════════ */}
          {data.studyPacks.length > 0 && (
            <section className="mb-14">
              <SectionHeader
                title="Study Packs"
                count={data.studyPacks.length}
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.studyPacks.map((pack, i) => (
                  <StudyPackCard
                    key={pack.id}
                    pack={pack}
                    index={i}
                    onClick={() => navigate(`/study-pack/${pack.slug}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ═══════════ Filter Bar ═══════════ */}
          <SectionHeader
            title="All Quizzes"
            count={data.stats.totalQuizzes}
          />

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
            {/* Organ system chips — horizontal scroll on mobile */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4
                            sm:mx-0 sm:px-0 scrollbar-hide">
              <FilterChip
                label="All Systems"
                active={organFilter === 'all'}
                onClick={() => setOrganFilter('all')}
              />
              {data.organGroups.map((g) => {
                const ov = ORGAN_VISUALS[g.organ] || DEFAULT_VISUAL;
                return (
                  <FilterChip
                    key={g.organ}
                    label={`${ov.emoji} ${g.organ}`}
                    active={organFilter === g.organ}
                    onClick={() => setOrganFilter(g.organ)}
                    count={g.quizzes.length}
                  />
                );
              })}
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-slate-200 flex-shrink-0" />

            {/* Difficulty chips */}
            <div className="flex gap-1.5 flex-shrink-0">
              {['all', 'easy', 'medium', 'hard'].map((d) => (
                <FilterChip
                  key={d}
                  label={d === 'all'
                    ? 'All Levels'
                    : d.charAt(0).toUpperCase() + d.slice(1)}
                  active={difficultyFilter === d}
                  onClick={() => setDifficultyFilter(d)}
                  dot={
                    d === 'easy'   ? 'bg-emerald-400' :
                    d === 'medium' ? 'bg-amber-400' :
                    d === 'hard'   ? 'bg-red-400' : null
                  }
                />
              ))}
            </div>
          </div>

          {/* ═══════════ Organ System Groups ═══════════ */}
          {filteredOrganGroups.length > 0 ? (
            <div className="space-y-12">
              {filteredOrganGroups.map((group) => (
                <OrganSection
                  key={group.organ}
                  group={group}
                  organProgress={organProgress}
                  isQuizCompleted={isQuizCompleted}
                  onQuizClick={(slug) => navigate(`/quiz/${slug}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyFilterState
              onClear={() => {
                setOrganFilter('all');
                setDifficultyFilter('all');
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}